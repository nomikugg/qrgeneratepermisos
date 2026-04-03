import archiver from "archiver";
import csv from "csv-parser";
import { Readable } from "stream";
import { fillTemplatePdfWithRow, type QRPlacement } from "@/lib/pdfGenerator";
import type { QRInputRow } from "@/lib/qrGenerator";
import { updatePdfBatchJob, saveJobZipFile } from "@/lib/pdfBatchJobs";

async function countCsvRows(csvBuffer: Buffer): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let count = 0;

    Readable.from(csvBuffer.toString())
      .pipe(csv())
      .on("data", () => {
        count += 1;
      })
      .on("error", (error) => reject(error))
      .on("end", () => resolve(count));
  });
}

export async function processPdfBatchJob(
  jobId: string,
  templatePdfBuffer: Buffer,
  csvBuffer: Buffer,
  placement: QRPlacement,
  flatten: boolean
): Promise<void> {
  await updatePdfBatchJob(jobId, { status: "running", message: "Contando filas del CSV..." });
  const totalRows = await countCsvRows(csvBuffer);

  await updatePdfBatchJob(jobId, {
    totalRows,
    processedRows: 0,
    status: "running",
    message: totalRows === 0 ? "CSV sin filas para procesar" : "Generando PDFs...",
  });

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  const fileNameCounter = new Map<string, number>();

  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  const finalizeZipPromise = new Promise<Uint8Array>((resolve, reject) => {
    archive.on("error", (error) => reject(error));
    archive.on("end", () => {
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
  });

  await new Promise<void>((resolve, reject) => {
    let activeTasks = 0;
    let processedRows = 0;
    let streamEnded = false;
    const parser = csv();

    const tryFinalize = () => {
      if (streamEnded && activeTasks === 0) {
        void archive.finalize().then(() => resolve()).catch((error) => reject(error));
      }
    };

    Readable.from(csvBuffer.toString())
      .pipe(parser)
      .on("data", (row: QRInputRow) => {
        parser.pause();
        activeTasks += 1;

        void (async () => {
          const result = await fillTemplatePdfWithRow(templatePdfBuffer, row, placement, flatten);
          const currentCount = fileNameCounter.get(result.fileName) ?? 0;
          fileNameCounter.set(result.fileName, currentCount + 1);

          const finalName =
            currentCount === 0
              ? result.fileName
              : result.fileName.replace(/\.pdf$/i, `-${currentCount + 1}.pdf`);

          archive.append(Buffer.from(result.pdfBytes), { name: finalName });

          processedRows += 1;
          await updatePdfBatchJob(jobId, {
            processedRows,
            totalRows,
            status: "running",
            message: `Procesados ${processedRows} de ${totalRows}`,
          });
        })()
          .then(() => {
            activeTasks -= 1;
            parser.resume();
            tryFinalize();
          })
          .catch((error) => {
            reject(error);
          });
      })
      .on("error", (error) => reject(error))
      .on("end", () => {
        streamEnded = true;
        tryFinalize();
      });
  });

  const zipBytes = await finalizeZipPromise;

  await saveJobZipFile(jobId, zipBytes);

  await updatePdfBatchJob(jobId, {
    status: "completed",
    message: `Completado: ${totalRows} PDF(s) generados`,
    processedRows: totalRows,
    totalRows,
  });
}
