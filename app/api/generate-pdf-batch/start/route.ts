import { createPdfBatchJob, updatePdfBatchJob } from "@/lib/pdfBatchJobs";
import { processPdfBatchJob } from "@/lib/pdfBatchProcessor";
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
    x: parseNumberField(formData.get("qrX"), 420),
    y: parseNumberField(formData.get("qrY"), 470),
    width: Math.max(32, parseNumberField(formData.get("qrWidth"), 120)),
    height: Math.max(32, parseNumberField(formData.get("qrHeight"), 120)),
  };

  const templatePdfBuffer = Buffer.from(await templatePdf.arrayBuffer());
  const csvBuffer = Buffer.from(await csvFile.arrayBuffer());

  const job = await createPdfBatchJob();

  void processPdfBatchJob(job.id, templatePdfBuffer, csvBuffer, placement)
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
