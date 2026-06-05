import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// POST /api/questions/[id]/responses — afgiv svar (deltager)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { option_index, participant_key } = await req.json();

  if (typeof option_index !== "number" || !participant_key) {
    return NextResponse.json(
      { error: "option_index (number) and participant_key required" },
      { status: 400 }
    );
  }

  // Tjek at spørgsmålet er åbent
  const questions = await sql`
    SELECT is_open FROM questions WHERE id = ${id}
  `;
  if (questions.length === 0) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }
  if (!questions[0].is_open) {
    return NextResponse.json({ error: "question is not open" }, { status: 403 });
  }

  try {
    const rows = await sql`
      INSERT INTO responses (question_id, option_index, participant_key)
      VALUES (${id}, ${option_index}, ${participant_key})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "already voted" }, { status: 409 });
    }
    throw err;
  }
}
