import { promises as fs } from "fs";
import { join } from "path";
import { createDefaultPdfLayout, normalizePdfLayoutConfig, type PdfLayoutConfig } from "@/lib/pdfLayout";

const LAYOUT_DIR = join(process.cwd(), ".tmp", "pdf-layout");
const LAYOUT_FILE = join(LAYOUT_DIR, "active.json");

async function ensureLayoutDir(): Promise<void> {
  await fs.mkdir(LAYOUT_DIR, { recursive: true });
}

export async function tryLoadActivePdfLayout(): Promise<PdfLayoutConfig | null> {
  try {
    const content = await fs.readFile(LAYOUT_FILE, "utf-8");
    return normalizePdfLayoutConfig(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function loadActivePdfLayout(): Promise<PdfLayoutConfig> {
  return (await tryLoadActivePdfLayout()) ?? createDefaultPdfLayout();
}

export async function saveActivePdfLayout(layout: PdfLayoutConfig): Promise<void> {
  await ensureLayoutDir();
  await fs.writeFile(LAYOUT_FILE, JSON.stringify(normalizePdfLayoutConfig(layout), null, 2), "utf-8");
}