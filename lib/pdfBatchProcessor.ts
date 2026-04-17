import archiver from "archiver";
import csv from "csv-parser";
import { Readable } from "stream";
import { fillTemplatePdfWithRow, renderPdfWithLayout } from "@/lib/pdfGenerator";
import { appendPermitRows } from "@/lib/permitSearchStore";
import { type PdfLayoutConfig, type QRPlacement } from "@/lib/pdfLayout";
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

export async function generatePdfBatchZip(
  templatePdfBuffer: Buffer,
  csvBuffer: Buffer,
  placement: QRPlacement,
  layoutConfig?: PdfLayoutConfig | null,
  onProgress?: (processedRows: number, totalRows: number) => Promise<void> | void
): Promise<{ zipBytes: Uint8Array; totalRows: number; processedRowsForSearch: QRInputRow[] }> {
  const totalRows = await countCsvRows(csvBuffer);
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  const fileNameCounter = new Map<string, number>();
  const processedRowsForSearch: QRInputRow[] = [];

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
          const result = layoutConfig
            ? await renderPdfWithLayout(templatePdfBuffer, row, layoutConfig)
            : await fillTemplatePdfWithRow(templatePdfBuffer, row, placement);
          const currentCount = fileNameCounter.get(result.fileName) ?? 0;
          fileNameCounter.set(result.fileName, currentCount + 1);

          const finalName =
            currentCount === 0
              ? result.fileName
              : result.fileName.replace(/\.pdf$/i, `-${currentCount + 1}.pdf`);

          archive.append(Buffer.from(result.pdfBytes), { name: finalName });
          processedRowsForSearch.push(row);

          processedRows += 1;
          if (onProgress) {
            await onProgress(processedRows, totalRows);
          }
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

  return {
    zipBytes,
    totalRows,
    processedRowsForSearch,
  };
}

export async function processPdfBatchJob(
  jobId: string,
  templatePdfBuffer: Buffer,
  csvBuffer: Buffer,
  placement: QRPlacement,
  layoutConfig?: PdfLayoutConfig | null
): Promise<void> {
  await updatePdfBatchJob(jobId, { status: "running", message: "Contando filas del CSV..." });
  await updatePdfBatchJob(jobId, {
    processedRows: 0,
    totalRows: 0,
    status: "running",
    message: "Generando PDFs...",
  });

  const { zipBytes, totalRows, processedRowsForSearch } = await generatePdfBatchZip(
    templatePdfBuffer,
    csvBuffer,
    placement,
    layoutConfig,
    async (processedRows, total) => {
      await updatePdfBatchJob(jobId, {
        processedRows,
        totalRows: total,
        status: "running",
        message: `Procesados ${processedRows} de ${total}`,
      });
    }
  );

  await saveJobZipFile(jobId, zipBytes);
  await appendPermitRows(processedRowsForSearch, jobId);

  await updatePdfBatchJob(jobId, {
    status: "completed",
    message: `Completado: ${totalRows} PDF(s) generados`,
    processedRows: totalRows,
    totalRows,
  });
}
