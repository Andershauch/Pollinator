import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/healthz — liveness. Rører IKKE databasen som standard.
//
// Dockerfilens HEALTHCHECK kalder denne hvert 30. sekund. Hvis den lavede
// SELECT 1, ville Neons compute aldrig gå i dvale og æde hele den gratis
// kvote (100 CU-timer/md) på ~3 uger. Brug ?db=1 til manuel DB-kontrol.
export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("db") === "1";
  if (!deep) return NextResponse.json({ ok: true });

  try {
    await sql`SELECT 1`;
    return NextResponse.json({ ok: true, db: true });
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
