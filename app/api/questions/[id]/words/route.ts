import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeWord } from "@/lib/aggregate";
import { logger } from "@/lib/log";

type Params = { params: Promise<{ id: string }> };

// GET /api/questions/[id]/words — word cloud data
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const rows = await sql`
    SELECT word, COUNT(*)::int AS count
    FROM word_responses
    WHERE question_id = ${id}
    GROUP BY word
    ORDER BY count DESC, word ASC
  `;

  return NextResponse.json(rows);
}

// POST /api/questions/[id]/words — submit a word
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { word, participant_key } = body;

  if (!word?.trim() || !participant_key) {
    logger.warn("word: invalid payload", { questionId: id });
    return NextResponse.json(
      { error: "word and participant_key required" },
      { status: 400 }
    );
  }

  const questions = await sql`SELECT is_open FROM questions WHERE id = ${id}`;
  if (questions.length === 0) {
    logger.warn("word: question not found", { questionId: id });
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }
  if (!questions[0].is_open) {
    logger.warn("word: question closed", { questionId: id });
    return NextResponse.json({ error: "question is closed" }, { status: 403 });
  }

  const normalized = normalizeWord(word);

  await sql`
    INSERT INTO word_responses (question_id, word, participant_key)
    VALUES (${id}, ${normalized}, ${participant_key})
    ON CONFLICT (question_id, participant_key, word) DO NOTHING
  `;

  return NextResponse.json({ word: normalized }, { status: 201 });
}
