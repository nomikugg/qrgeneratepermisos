export async function POST(req: Request): Promise<Response> {
  await req.formData();
  return Response.json(
    {
      error: "Endpoint legacy. Usa /api/generate-pdf-batch/start para iniciar trabajo con progreso.",
    },
    { status: 410 }
  );
}
