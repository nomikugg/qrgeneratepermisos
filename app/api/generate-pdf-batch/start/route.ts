import { createPdfBatchJob, updatePdfBatchJob } from "@/lib/pdfBatchJobs";
import { processPdfBatchJob } from "@/lib/pdfBatchProcessor";
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
    x: parseNumberField(formData.get("qrX"), 420),
    y: parseNumberField(formData.get("qrY"), 470),
    width: Math.max(32, parseNumberField(formData.get("qrWidth"), 120)),
    height: Math.max(32, parseNumberField(formData.get("qrHeight"), 120)),
  };

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

  const job = await createPdfBatchJob();

  void processPdfBatchJob(job.id, templatePdfBuffer, csvBuffer, placement, layoutConfig)
    .catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      void updatePdfBatchJob(job.id, {
        status: "failed",
        message: "Fallo la generacion del lote PDF",
        error: errorMessage,
      });
    });

  return Response.json({
    jobId: job.id,
    message: "Trabajo iniciado",
  });
}
