import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/healthz — bekræft DB-forbindelse
export async function GET() {
  try {
    await sql`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
