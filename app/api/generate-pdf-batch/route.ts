import { randomUUID } from "crypto";
import { generatePdfBatchZip } from "@/lib/pdfBatchProcessor";
import { appendPermitRows } from "@/lib/permitSearchStore";
import type { QRPlacement } from "@/lib/pdfGenerator";

function parseNumberField(value: FormDataEntryValue | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(req: Request): Promise<Response> {
  const formData = await req.formData();
  const templatePdf = formData.get("templatePdf");
  const csvFile = formData.get("csvFile");

  if (!(templatePdf instanceof File) || !(csvFile instanceof File)) {
    return Response.json({ error: "Debes cargar template PDF y archivo CSV" }, { status: 400 });
  }

  const placement: QRPlacement = {
    qrFieldName: String(formData.get("qrFieldName") || "").trim() || undefined,
    x: parseNumberField(formData.get("qrX"), 670),
    y: parseNumberField(formData.get("qrY"), 130),
    width: Math.max(32, parseNumberField(formData.get("qrWidth"), 112)),
    height: Math.max(32, parseNumberField(formData.get("qrHeight"), 112)),
  };

  try {
    const templatePdfBuffer = Buffer.from(await templatePdf.arrayBuffer());
    const csvBuffer = Buffer.from(await csvFile.arrayBuffer());

    const { zipBytes, processedRowsForSearch } = await generatePdfBatchZip(templatePdfBuffer, csvBuffer, placement);
    await appendPermitRows(processedRowsForSearch, randomUUID());
    const normalizedZipBytes = new Uint8Array(zipBytes.length);
    normalizedZipBytes.set(zipBytes);
    const zipBlob = new Blob([normalizedZipBytes.buffer], { type: "application/zip" });

    return new Response(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=permisos-pdf.zip",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error generando ZIP de permisos";
    return Response.json({ error: message }, { status: 500 });
  }
}
