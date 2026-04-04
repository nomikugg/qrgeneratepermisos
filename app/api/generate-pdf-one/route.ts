import { promises as fs } from "fs";
import { join } from "path";
import { fillTemplatePdfWithRow, type QRPlacement } from "@/lib/pdfGenerator";
import { updatePermitRecord } from "@/lib/permitSearchStore";
import type { QRInputRow } from "@/lib/qrGenerator";

const DEFAULT_SERVER_TEMPLATE_PATH = join(process.cwd(), "templates", "permiso-base.pdf");

function parseNumberField(value: FormDataEntryValue | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(req: Request): Promise<Response> {
  const formData = await req.formData();
  const templatePdf = formData.get("templatePdf");
  const rowJson = formData.get("row");
  const useServerTemplate = String(formData.get("useServerTemplate") || "true") === "true";
  const recordIdRaw = formData.get("recordId");
  const jobId = String(formData.get("jobId") || "").trim();
  const createdAtRaw = formData.get("createdAt");

  if (!useServerTemplate && !(templatePdf instanceof File)) {
    return Response.json({ error: "Debes cargar una plantilla PDF." }, { status: 400 });
  }

  if (typeof rowJson !== "string" || !rowJson.trim()) {
    return Response.json({ error: "No se recibieron datos del registro a regenerar." }, { status: 400 });
  }

  let row: QRInputRow;
  try {
    row = JSON.parse(rowJson) as QRInputRow;
  } catch {
    return Response.json({ error: "Los datos del registro son invalidos." }, { status: 400 });
  }

  const placement: QRPlacement = {
    x: parseNumberField(formData.get("qrX"), 670),
    y: parseNumberField(formData.get("qrY"), 130),
    width: Math.max(32, parseNumberField(formData.get("qrWidth"), 112)),
    height: Math.max(32, parseNumberField(formData.get("qrHeight"), 112)),
  };

  const parsedRecordId = typeof recordIdRaw === "string" && recordIdRaw.trim() ? Number(recordIdRaw) : undefined;
  const parsedCreatedAt = typeof createdAtRaw === "string" && createdAtRaw.trim() ? Number(createdAtRaw) : 0;

  try {
    let templatePdfBuffer: Buffer;

    if (useServerTemplate) {
      const configuredPath = String(process.env.PDF_TEMPLATE_PATH || "").trim();
      const templatePath = configuredPath || DEFAULT_SERVER_TEMPLATE_PATH;
      templatePdfBuffer = await fs.readFile(templatePath);
    } else {
      templatePdfBuffer = Buffer.from(await (templatePdf as File).arrayBuffer());
    }

    const result = await fillTemplatePdfWithRow(templatePdfBuffer, row, placement);

    if (jobId && Number.isFinite(parsedCreatedAt) && parsedCreatedAt > 0) {
      await updatePermitRecord({
        id: typeof parsedRecordId === "number" && Number.isFinite(parsedRecordId) ? parsedRecordId : undefined,
        jobId,
        createdAt: parsedCreatedAt,
        data: Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? "")])),
      });
    }

    const normalizedPdfBytes = new Uint8Array(result.pdfBytes.length);
    normalizedPdfBytes.set(result.pdfBytes);
    const pdfBlob = new Blob([normalizedPdfBytes.buffer], { type: "application/pdf" });

    return new Response(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error generando PDF individual";
    return Response.json({ error: message }, { status: 500 });
  }
}
