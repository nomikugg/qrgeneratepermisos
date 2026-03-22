import { generateQRData } from "@/lib/qrGenerator";
import QRCode from "qrcode";

export async function POST(req: Request) {
  const body = await req.json();

  const data = generateQRData(body);

  const buffer = await QRCode.toBuffer(data.finalString);
  const pngBytes = new Uint8Array(buffer);

  return new Response(pngBytes, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${data.placa}.png"`,
    },
  });
}