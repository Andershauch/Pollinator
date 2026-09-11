import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { tallyRanking, isValidRanking } from "@/lib/aggregate";

type Params = { params: Promise<{ id: string }> };

// GET /api/questions/[id]/ranking — samlet Borda-rangering (storskærm poller denne)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const questions = await sql`SELECT prompt, options FROM questions WHERE id = ${id}`;
  if (questions.length === 0) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }
  const options = questions[0].options as string[];

  const rows = (await sql`
    SELECT ranking FROM ranking_responses WHERE question_id = ${id}
  `) as { ranking: number[] }[];

  const { ranking, total } = tallyRanking(options, rows.map((r) => r.ranking));

  return NextResponse.json({
    question_id: id,
    prompt: questions[0].prompt,
    type: "ranking",
    ranking,
    total,
  });
}

// POST /api/questions/[id]/ranking — afgiv rangering (deltager)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { ranking, participant_key } = await req.json();

  const questions = await sql`SELECT is_open, options FROM questions WHERE id = ${id}`;
  if (questions.length === 0) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }
  const options = questions[0].options as string[];

  if (!isValidRanking(ranking, options.length) || !participant_key) {
    return NextResponse.json(
      { error: "ranking (permutation of all option indices) and participant_key required" },
      { status: 400 }
    );
  }
  if (!questions[0].is_open) {
    return NextResponse.json({ error: "question is closed" }, { status: 403 });
  }

  try {
    const rows = await sql`
      INSERT INTO ranking_responses (question_id, ranking, participant_key)
      VALUES (${id}, ${JSON.stringify(ranking)}, ${participant_key})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "already ranked" }, { status: 409 });
    }
    throw err;
  }
}
