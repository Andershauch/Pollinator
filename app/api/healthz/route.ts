import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/healthz — bekræft DB-forbindelse
export async function GET() {
  try {
    const rows = await sql`SELECT current_database() AS db, now() AS ts`;
    return NextResponse.json({ ok: true, ...rows[0] });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
