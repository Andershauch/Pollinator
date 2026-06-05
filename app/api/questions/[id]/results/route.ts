import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/questions/[id]/results — hent optælling (storskærm poller denne)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const questions = await sql`
    SELECT id, prompt, options FROM questions WHERE id = ${id}
  `;
  if (questions.length === 0) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }

  const counts = await sql`
    SELECT option_index, count(*)::int AS votes
    FROM responses
    WHERE question_id = ${id}
    GROUP BY option_index
    ORDER BY option_index
  `;

  const options = questions[0].options as string[];
  const tally = options.map((label: string, idx: number) => ({
    index: idx,
    label,
    votes: counts.find((r) => r.option_index === idx)?.votes ?? 0,
  }));

  return NextResponse.json({
    question_id: id,
    prompt: questions[0].prompt,
    tally,
    total: tally.reduce((s, r) => s + (r.votes as number), 0),
  });
}
