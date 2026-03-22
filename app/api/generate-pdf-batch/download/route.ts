import { getPdfBatchJob } from "@/lib/pdfBatchJobs";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return Response.json({ error: "jobId requerido" }, { status: 400 });
  }

  const job = getPdfBatchJob(jobId);

  if (!job) {
    return Response.json({ error: "Trabajo no encontrado o expirado" }, { status: 404 });
  }

  if (job.status !== "completed" || !job.zipBytes) {
    return Response.json({ error: "El archivo aun no esta listo" }, { status: 409 });
  }

  const normalizedZipBytes = new Uint8Array(job.zipBytes.length);
  normalizedZipBytes.set(job.zipBytes);
  const zipBlob = new Blob([normalizedZipBytes.buffer], { type: "application/zip" });

  return new Response(zipBlob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=permisos-pdf.zip",
    },
  });
}
