import { getPdfBatchJob } from "@/lib/pdfBatchJobs";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return Response.json({ error: "jobId requerido" }, { status: 400 });
  }

  const job = await getPdfBatchJob(jobId);

  if (!job) {
    return Response.json({ error: "Trabajo no encontrado o expirado" }, { status: 404 });
  }

  return Response.json({
    jobId: job.id,
    status: job.status,
    message: job.message,
    processedRows: job.processedRows,
    totalRows: job.totalRows,
    error: job.error,
    canDownload: job.status === "completed",
  });
}
