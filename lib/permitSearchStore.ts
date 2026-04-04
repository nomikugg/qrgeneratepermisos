import { promises as fs } from "fs";
import { join } from "path";
import { clean, type QRInputRow } from "@/lib/qrGenerator";

export type PermitSearchRecord = {
  id?: number;
  placa: string;
  placaNormalized: string;
  createdAt: number;
  jobId: string;
  data: Record<string, string>;
};

type PermitStoreFile = {
  records: PermitSearchRecord[];
};

const STORE_DIR = join(process.cwd(), ".tmp", "permit-search");
const STORE_FILE = join(STORE_DIR, "permits.json");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_TABLE = "permit_records";

let writeQueue: Promise<void> = Promise.resolve();

function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function normalizePlate(value: unknown): string {
  return clean(value).replace(/[^A-Z0-9]/g, "");
}

function normalizeRow(row: QRInputRow): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(row)) {
    normalized[String(rawKey)] = clean(rawValue);
  }

  return normalized;
}

async function ensureStoreDir(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

async function readStore(): Promise<PermitStoreFile> {
  try {
    const content = await fs.readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(content) as PermitStoreFile;

    if (!Array.isArray(parsed.records)) {
      return { records: [] };
    }

    return parsed;
  } catch {
    return { records: [] };
  }
}

async function writeStore(store: PermitStoreFile): Promise<void> {
  await ensureStoreDir();
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

type SupabaseInsertRow = {
  placa: string;
  placa_normalized: string;
  job_id: string;
  data: Record<string, string>;
  created_at: string;
};

type SupabaseSelectRow = {
  id: number;
  placa: string;
  placa_normalized: string;
  job_id: string;
  data: Record<string, string>;
  created_at: string;
};

async function insertRowsInSupabase(rows: SupabaseInsertRow[]): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  const endpoint = new URL(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase insert failed: ${response.status} ${details}`);
  }
}

async function searchRowsInSupabase(normalizedQuery: string, limit: number, history = false): Promise<PermitSearchRecord[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  const endpoint = new URL(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`);
  endpoint.searchParams.set("select", "id,placa,placa_normalized,job_id,data,created_at");
  endpoint.searchParams.set("placa_normalized", `ilike.*${normalizedQuery}*`);
  endpoint.searchParams.set("order", "created_at.desc");
  endpoint.searchParams.set("limit", String(limit));

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase search failed: ${response.status} ${details}`);
  }

  const rows = (await response.json()) as SupabaseSelectRow[];

  const mapped = rows.map((row) => ({
    id: row.id,
    placa: row.placa,
    placaNormalized: row.placa_normalized,
    createdAt: Number.isFinite(Date.parse(row.created_at)) ? Date.parse(row.created_at) : Date.now(),
    jobId: row.job_id,
    data: row.data || {},
  }));

  if (history) {
    return mapped.slice(0, limit);
  }

  // Keep only the latest row for each plate to avoid showing old versions.
  const uniqueByPlate = new Map<string, PermitSearchRecord>();
  for (const record of mapped) {
    if (!uniqueByPlate.has(record.placaNormalized)) {
      uniqueByPlate.set(record.placaNormalized, record);
    }
  }

  return Array.from(uniqueByPlate.values()).slice(0, limit);
}

async function updateRowInLocalStore(jobId: string, createdAt: number, data: Record<string, string>): Promise<void> {
  const placa = clean(data.placa);
  const placaNormalized = normalizePlate(data.placa);

  writeQueue = writeQueue.then(async () => {
    const currentStore = await readStore();
    const updatedRecord: PermitSearchRecord = {
      placa,
      placaNormalized,
      createdAt: Date.now(),
      jobId,
      data,
    };

    currentStore.records.unshift(updatedRecord);

    currentStore.records.sort((a, b) => b.createdAt - a.createdAt);

    await writeStore(currentStore);
  });

  await writeQueue;
}

async function appendRowsToLocalStore(recordsToInsert: PermitSearchRecord[]): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const currentStore = await readStore();

    currentStore.records.unshift(...recordsToInsert);

    currentStore.records.sort((a, b) => b.createdAt - a.createdAt);
    await writeStore(currentStore);
  });

  await writeQueue;
}

export async function appendPermitRows(rows: QRInputRow[], jobId: string): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const recordsToInsert: PermitSearchRecord[] = [];

  for (const row of rows) {
    const placa = clean(row.placa);
    const placaNormalized = normalizePlate(row.placa);

    if (!placa || !placaNormalized) {
      continue;
    }

    recordsToInsert.push({
      placa,
      placaNormalized,
      createdAt: Date.now(),
      jobId,
      data: normalizeRow(row),
    });
  }

  if (recordsToInsert.length === 0) {
    return;
  }

  if (hasSupabaseConfig()) {
    try {
      await insertRowsInSupabase(
        recordsToInsert.map((record) => ({
          placa: record.placa,
          placa_normalized: record.placaNormalized,
          job_id: record.jobId,
          data: record.data,
          created_at: new Date(record.createdAt).toISOString(),
        }))
      );
      return;
    } catch (error) {
      console.error("Supabase insert failed, falling back to local JSON store:", error);
    }
  }

  await appendRowsToLocalStore(recordsToInsert);
}

export async function searchPermitsByPlate(
  plateQuery: string,
  limit = 50,
  options?: { history?: boolean }
): Promise<PermitSearchRecord[]> {
  const normalizedQuery = normalizePlate(plateQuery);
  if (!normalizedQuery) {
    return [];
  }

  const showHistory = options?.history === true;

  if (hasSupabaseConfig()) {
    try {
      return await searchRowsInSupabase(normalizedQuery, limit, showHistory);
    } catch (error) {
      console.error("Supabase search failed, falling back to local JSON store:", error);
    }
  }

  const currentStore = await readStore();
  const filtered = currentStore.records
    .filter((record) => record.placaNormalized.includes(normalizedQuery))
    .sort((a, b) => b.createdAt - a.createdAt);

  if (showHistory) {
    return filtered.slice(0, limit);
  }

  const uniqueByPlate = new Map<string, PermitSearchRecord>();
  for (const record of filtered) {
    if (!uniqueByPlate.has(record.placaNormalized)) {
      uniqueByPlate.set(record.placaNormalized, record);
    }
  }

  return Array.from(uniqueByPlate.values()).slice(0, limit);
}

export async function updatePermitRecord(params: {
  id?: number;
  jobId: string;
  createdAt: number;
  data: Record<string, string>;
}): Promise<void> {
  const normalizedData: Record<string, string> = {};

  for (const [key, value] of Object.entries(params.data)) {
    normalizedData[key] = clean(value);
  }

  const placa = clean(normalizedData.placa);
  const placaNormalized = normalizePlate(normalizedData.placa);

  if (hasSupabaseConfig()) {
    try {
      await insertRowsInSupabase([
        {
          placa,
          placa_normalized: placaNormalized,
          job_id: params.jobId,
          data: normalizedData,
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    } catch (error) {
      console.error("Supabase version insert failed, falling back to local JSON store:", error);
    }
  }

  await updateRowInLocalStore(params.jobId, params.createdAt, normalizedData);
}
