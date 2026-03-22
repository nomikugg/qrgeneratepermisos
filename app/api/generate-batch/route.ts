import { generateQRData, type QRInputRow } from "@/lib/qrGenerator";
import csv from "csv-parser";
import { Readable } from "stream";
import QRCode from "qrcode";
import archiver from "archiver";

export async function POST(req: Request): Promise<Response> {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Archivo CSV requerido" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const archive = archiver("zip");
  const chunks: Buffer[] = [];
  const jobs: Array<Promise<void>> = [];

  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  return new Promise<Response>((resolve, reject) => {
    const stream = Readable.from(buffer.toString());

    archive.on("error", (error) => reject(error));
    archive.on("end", () => {
      const zipBuffer = Buffer.concat(chunks);
      const zipBytes = new Uint8Array(zipBuffer);

      resolve(
        new Response(zipBytes, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": "attachment; filename=qrs.zip",
          },
        })
      );
    });

    stream
      .pipe(csv())
      .on("data", (row: QRInputRow) => {
        jobs.push(
          (async () => {
            const data = generateQRData(row);

            const qrBuffer = await QRCode.toBuffer(data.finalString);

            archive.append(qrBuffer, {
              name: `${data.placa || "sin-placa"}.png`,
            });
          })()
        );
      })
      .on("error", (error) => reject(error))
      .on("end", () => {
        void Promise.all(jobs)
          .then(() => archive.finalize())
          .catch((error) => reject(error));
      });
  });
}