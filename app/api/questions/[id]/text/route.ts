import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isValidTextAnswer } from "@/lib/aggregate";

type Params = { params: Promise<{ id: string }> };

// GET /api/questions/[id]/text — fritekst-svar i den rækkefølge de kom ind
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const rows = await sql`
    SELECT id, answer, created_at
    FROM text_responses
    WHERE question_id = ${id}
    ORDER BY created_at ASC
  `;

  return NextResponse.json(rows);
}

// POST /api/questions/[id]/text — afgiv fritekst-svar (deltager)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { answer, participant_key } = await req.json();

  if (typeof answer !== "string" || !isValidTextAnswer(answer) || !participant_key) {
    return NextResponse.json(
      { error: "answer (non-empty, max 300 chars) and participant_key required" },
      { status: 400 }
    );
  }

  const questions = await sql`SELECT is_open FROM questions WHERE id = ${id}`;
  if (questions.length === 0) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }
  if (!questions[0].is_open) {
    return NextResponse.json({ error: "question is closed" }, { status: 403 });
  }

  try {
    const rows = await sql`
      INSERT INTO text_responses (question_id, answer, participant_key)
      VALUES (${id}, ${answer.trim()}, ${participant_key})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "already answered" }, { status: 409 });
    }
    throw err;
  }
}
