import { createDefaultPdfLayout, normalizePdfLayoutConfig } from "@/lib/pdfLayout";
import { loadActivePdfLayout, saveActivePdfLayout } from "@/lib/pdfLayoutStore";

export async function GET(): Promise<Response> {
  const layout = (await loadActivePdfLayout()) ?? createDefaultPdfLayout();

  return Response.json({ layout });
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { layout?: unknown } | null;
  const layout = normalizePdfLayoutConfig(body?.layout ?? body);

  await saveActivePdfLayout(layout);

  return Response.json({ layout });
}