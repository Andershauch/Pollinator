import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// POST /api/upload — upload billede eller video til Vercel Blob
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Maks 50 MB" }, { status: 413 });
  }

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) {
    return NextResponse.json({ error: "Kun billeder og videoer er tilladt" }, { status: 415 });
  }

  const blob = await put(file.name, file, { access: "public" });

  return NextResponse.json({
    url: blob.url,
    type: isVideo ? "video" : "image",
  });
}
