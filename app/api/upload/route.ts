import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  // Client upload flow: token generation + Vercel Blob callback
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as HandleUploadBody;
    const res = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/*", "video/*"],
        maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB
      }),
      onUploadCompleted: async () => {},
    });
    const headers = new Headers(CORS);
    res.headers.forEach((v, k) => headers.set(k, v));
    return new NextResponse(res.body, { status: res.status, headers });
  }

  // Server-side upload (Apps Script → multipart form-data, for slide images)
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "Maks 50 MB" }, { status: 413 });
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage)
    return NextResponse.json({ error: "Kun billeder og videoer er tilladt" }, { status: 415 });
  const blob = await put(file.name, file, { access: "public" });
  return NextResponse.json({ url: blob.url, type: isVideo ? "video" : "image" });
}
