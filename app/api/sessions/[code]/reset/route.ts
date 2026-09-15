import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { logger } from "@/lib/log";

type Params = { params: Promise<{ code: string }> };

// POST /api/sessions/[code]/reset — nulstil alle svar, behold kode/spørgsmål/medier
export async function POST(_req: NextRequest, { params }: Params) {
  const { code } = await params;

  const sessions = await sql`SELECT id FROM sessions WHERE code = ${code.toUpperCase()}`;
  if (sessions.length === 0) {
    logger.warn("session reset: not found", { code });
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  const sessionId = sessions[0].id as string;

  await sql`DELETE FROM responses WHERE question_id IN (SELECT id FROM questions WHERE session_id = ${sessionId})`;
  await sql`DELETE FROM word_responses WHERE question_id IN (SELECT id FROM questions WHERE session_id = ${sessionId})`;
  await sql`DELETE FROM text_responses WHERE question_id IN (SELECT id FROM questions WHERE session_id = ${sessionId})`;
  await sql`DELETE FROM ranking_responses WHERE question_id IN (SELECT id FROM questions WHERE session_id = ${sessionId})`;

  await sql`UPDATE questions SET is_open = false, opened_at = NULL WHERE session_id = ${sessionId}`;

  const rows = await sql`
    UPDATE sessions
    SET state = 'lobby', current_question_id = NULL
    WHERE id = ${sessionId}
    RETURNING *
  `;

  logger.info("session reset", { code });
  return NextResponse.json(rows[0]);
}
