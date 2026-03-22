import { randomUUID } from "crypto";

export type PdfBatchJobStatus = "pending" | "running" | "completed" | "failed";

export type PdfBatchJob = {
  id: string;
  status: PdfBatchJobStatus;
  message: string;
  processedRows: number;
  totalRows: number;
  createdAt: number;
  updatedAt: number;
  zipBytes?: Uint8Array;
  error?: string;
};

const JOB_TTL_MS = 1000 * 60 * 60;
const jobs = new Map<string, PdfBatchJob>();

function cleanupExpiredJobs() {
  const now = Date.now();

  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

export function createPdfBatchJob(): PdfBatchJob {
  cleanupExpiredJobs();

  const now = Date.now();
  const job: PdfBatchJob = {
    id: randomUUID(),
    status: "pending",
    message: "Preparando trabajo...",
    processedRows: 0,
    totalRows: 0,
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(job.id, job);
  return job;
}

export function getPdfBatchJob(jobId: string): PdfBatchJob | undefined {
  cleanupExpiredJobs();
  return jobs.get(jobId);
}

export function updatePdfBatchJob(jobId: string, patch: Partial<PdfBatchJob>): PdfBatchJob | undefined {
  const job = jobs.get(jobId);
  if (!job) {
    return undefined;
  }

  const updated: PdfBatchJob = {
    ...job,
    ...patch,
    updatedAt: Date.now(),
  };

  jobs.set(jobId, updated);
  return updated;
}
