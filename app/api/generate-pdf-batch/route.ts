import { randomUUID } from "crypto";
import { generatePdfBatchZip } from "@/lib/pdfBatchProcessor";
import { appendPermitRows } from "@/lib/permitSearchStore";
import { normalizePdfLayoutConfig, type QRPlacement } from "@/lib/pdfLayout";
import { tryLoadActivePdfLayout } from "@/lib/pdfLayoutStore";

function parseNumberField(value: FormDataEntryValue | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(req: Request): Promise<Response> {
  const formData = await req.formData();
  const templatePdf = formData.get("templatePdf");
  const csvFile = formData.get("csvFile");
  const layoutConfigRaw = formData.get("layoutConfig");

  if (!(csvFile instanceof File)) {
    return Response.json({ error: "Debes cargar un archivo CSV" }, { status: 400 });
  }

  const placement: QRPlacement = {
    qrFieldName: String(formData.get("qrFieldName") || "").trim() || undefined,
    x: parseNumberField(formData.get("qrX"), 670),
    y: parseNumberField(formData.get("qrY"), 130),
    width: Math.max(32, parseNumberField(formData.get("qrWidth"), 112)),
    height: Math.max(32, parseNumberField(formData.get("qrHeight"), 112)),
  };

  try {
    const templatePdfBuffer = templatePdf instanceof File ? Buffer.from(await templatePdf.arrayBuffer()) : Buffer.alloc(0);
    const csvBuffer = Buffer.from(await csvFile.arrayBuffer());
    let layoutConfig = await tryLoadActivePdfLayout();

    if (typeof layoutConfigRaw === "string" && layoutConfigRaw.trim()) {
      try {
        layoutConfig = normalizePdfLayoutConfig(JSON.parse(layoutConfigRaw));
      } catch {
        return Response.json({ error: "El layout del editor es invalido." }, { status: 400 });
      }
    }

    if (!layoutConfig && !templatePdfBuffer.length) {
      return Response.json({ error: "Debes cargar una plantilla PDF o guardar un layout activo." }, { status: 400 });
    }

    const { zipBytes, processedRowsForSearch } = await generatePdfBatchZip(
      templatePdfBuffer,
      csvBuffer,
      placement,
      layoutConfig
    );

    // El ZIP ya esta generado; si falla persistir historial no debe romper la descarga.
    try {
      await appendPermitRows(processedRowsForSearch, randomUUID());
    } catch (persistError) {
      console.error("No se pudo persistir historial de permisos (se entrega ZIP igualmente):", persistError);
    }

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
