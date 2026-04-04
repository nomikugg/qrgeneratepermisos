import { searchPermitsByPlate } from "@/lib/permitSearchStore";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const placa = String(searchParams.get("placa") || "").trim();

  if (!placa) {
    return Response.json({ error: "Debes enviar el parametro placa" }, { status: 400 });
  }

  const results = await searchPermitsByPlate(placa);

  return Response.json({
    total: results.length,
    results,
  });
}
