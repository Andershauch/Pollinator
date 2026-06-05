import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ code: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { code } = await params;

  const sessions = await sql`SELECT * FROM sessions WHERE code = ${code.toUpperCase()}`;
  if (sessions.length === 0) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  const original = sessions[0];

  // Generate new unique code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let newCode = "";
  for (let i = 0; i < 4; i++) newCode += chars[Math.floor(Math.random() * chars.length)];

  const newSessions = await sql`
    INSERT INTO sessions (code, title)
    VALUES (${newCode}, ${original.title as string})
    RETURNING *
  `;
  const newSession = newSessions[0];

  // Copy all questions from original session
  await sql`
    INSERT INTO questions (session_id, prompt, type, options, position, duration_seconds)
    SELECT ${newSession.id as string}, prompt, type, options, position, duration_seconds
    FROM questions
    WHERE session_id = ${original.id as string}
    ORDER BY position
  `;

  return NextResponse.json({ code: newCode });
}
