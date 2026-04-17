import { randomUUID } from "crypto";
import { generatePdfBatchZip } from "@/lib/pdfBatchProcessor";
import { appendPermitRows } from "@/lib/permitSearchStore";
import { normalizePdfLayoutConfig, type QRPlacement } from "@/lib/pdfLayout";
import { tryLoadActivePdfLayout } from "@/lib/pdfLayoutStore";

type GeneratePdfBatchRequestBody = {
  csvText?: string;
  templatePdfBase64?: string;
  layoutConfig?: unknown;
  qrX?: number | string;
  qrY?: number | string;
  qrWidth?: number | string;
  qrHeight?: number | string;
};

function parseNumberField(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function decodeBase64Pdf(value: string | undefined): Buffer {
  if (!value || !value.trim()) {
    return Buffer.alloc(0);
  }

  return Buffer.from(value, "base64");
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as GeneratePdfBatchRequestBody | null;

  if (!body || typeof body.csvText !== "string") {
    return Response.json({ error: "Debes cargar un archivo CSV" }, { status: 400 });
  }

  const placement: QRPlacement = {
    qrFieldName: undefined,
    x: parseNumberField(body.qrX, 670),
    y: parseNumberField(body.qrY, 130),
    width: Math.max(32, parseNumberField(body.qrWidth, 112)),
    height: Math.max(32, parseNumberField(body.qrHeight, 112)),
  };

  try {
    const templatePdfBuffer = decodeBase64Pdf(body.templatePdfBase64);
    const csvBuffer = Buffer.from(body.csvText, "utf-8");
    let layoutConfig = await tryLoadActivePdfLayout();

    if (body.layoutConfig) {
      try {
        layoutConfig = normalizePdfLayoutConfig(body.layoutConfig);
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
