import { searchPermitsByPlate } from "@/lib/permitSearchStore";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const placa = String(searchParams.get("placa") || "").trim();
  const history = String(searchParams.get("history") || "") === "1";

  if (!placa) {
    return Response.json({ error: "Debes enviar el parametro placa" }, { status: 400 });
  }

  const results = await searchPermitsByPlate(placa, 50, { history });

  return Response.json({
    total: results.length,
    results,
  });
}
