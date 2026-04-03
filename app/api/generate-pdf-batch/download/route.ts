import { getPdfBatchJob, getPdfBatchJobZipBytes } from "@/lib/pdfBatchJobs";

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

  if (job.status !== "completed") {
    return Response.json({ error: "El archivo aun no esta listo" }, { status: 409 });
  }

  const zipBytes = await getPdfBatchJobZipBytes(jobId);

  if (!zipBytes) {
    return Response.json({ error: "El archivo ZIP no se encontro" }, { status: 404 });
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
}
