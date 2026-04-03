import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";

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
const JOB_DIR = join(process.cwd(), ".tmp", "pdf-batch-jobs");

async function ensureJobDir() {
  try {
    await fs.mkdir(JOB_DIR, { recursive: true });
  } catch {
    // Directorio ya existe
  }
}

async function writeJobToDisk(job: PdfBatchJob) {
  try {
    await ensureJobDir();
    const filePath = join(JOB_DIR, `${job.id}.json`);
    const jobData = { ...job };
    delete (jobData as { zipBytes?: Uint8Array }).zipBytes;
    await fs.writeFile(filePath, JSON.stringify(jobData, null, 2));
  } catch (error) {
    console.error(`Error escribiendo job ${job.id}:`, error);
  }
}

async function readJobFromDisk(jobId: string): Promise<PdfBatchJob | null> {
  try {
    const filePath = join(JOB_DIR, `${jobId}.json`);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function cleanupExpiredJobs() {
  const now = Date.now();

  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

export async function createPdfBatchJob(): Promise<PdfBatchJob> {
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
  await writeJobToDisk(job);
  return job;
}

export async function getPdfBatchJob(jobId: string): Promise<PdfBatchJob | undefined> {
  cleanupExpiredJobs();
  
  let job = jobs.get(jobId);
  if (!job) {
    job = (await readJobFromDisk(jobId)) ?? undefined;
    if (job) {
      jobs.set(jobId, job);
    }
  }
  
  return job;
}

export async function updatePdfBatchJob(jobId: string, patch: Partial<PdfBatchJob>): Promise<PdfBatchJob | undefined> {
  let job = jobs.get(jobId);
  if (!job) {
    job = (await readJobFromDisk(jobId)) ?? undefined;
  }
  
  if (!job) {
    return undefined;
  }

  const updated: PdfBatchJob = {
    ...job,
    ...patch,
    updatedAt: Date.now(),
  };

  jobs.set(jobId, updated);
  await writeJobToDisk(updated);
  return updated;
}

export async function saveJobZipFile(jobId: string, zipBytes: Uint8Array): Promise<void> {
  try {
    await ensureJobDir();
    const filePath = join(JOB_DIR, `${jobId}.zip`);
    await fs.writeFile(filePath, zipBytes);
  } catch (error) {
    console.error(`Error guardando ZIP para job ${jobId}:`, error);
  }
}

export async function getPdfBatchJobZipBytes(jobId: string): Promise<Uint8Array | null> {
  try {
    const filePath = join(JOB_DIR, `${jobId}.zip`);
    const data = await fs.readFile(filePath);
    return new Uint8Array(data);
  } catch {
    return null;
  }
}
