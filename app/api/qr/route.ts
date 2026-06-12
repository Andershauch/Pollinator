import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  const png = await QRCode.toBuffer(url, {
    type: "png",
    width: 220,
    margin: 1,
    color: { dark: "#111319", light: "#f59e0b" },
  });

  return new NextResponse(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
