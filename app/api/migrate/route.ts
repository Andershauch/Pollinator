import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

async function migrate() {
  await sql`
    ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS media_url  TEXT,
      ADD COLUMN IF NOT EXISTS media_type TEXT,
      ADD COLUMN IF NOT EXISTS scale_max  INTEGER DEFAULT 10
  `;
  return NextResponse.json({ ok: true });
}

export { migrate as GET, migrate as POST };
