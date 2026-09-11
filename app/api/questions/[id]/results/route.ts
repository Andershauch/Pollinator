import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { tallyDilemma, tallyScale, type VoteCount } from "@/lib/aggregate";

type Params = { params: Promise<{ id: string }> };

// GET /api/questions/[id]/results — hent optælling (storskærm poller denne)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const questions = await sql`
    SELECT id, prompt, options, type, COALESCE(scale_max, 10) AS scale_max FROM questions WHERE id = ${id}
  `;
  if (questions.length === 0) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }

  const q = questions[0];
  const qtype = q.type as string;

  const counts = await sql`
    SELECT option_index, count(*)::int AS votes
    FROM responses
    WHERE question_id = ${id}
    GROUP BY option_index
    ORDER BY option_index
  `;

  if (qtype === "scale") {
    const scaleMax = (q.scale_max as number) ?? 10;
    const { tally, total, average } = tallyScale(scaleMax, counts as VoteCount[]);
    const options = q.options as string[];
    return NextResponse.json({
      question_id: id,
      prompt: q.prompt,
      type: "scale",
      tally,
      total,
      average,
      scaleMax,
      lowLabel: options[0] ?? "",
      highLabel: options[1] ?? "",
    });
  }

  // Dilemma (default)
  const options = q.options as string[];
  const { tally, total } = tallyDilemma(options, counts as VoteCount[]);

  return NextResponse.json({
    question_id: id,
    prompt: q.prompt,
    type: "dilemma",
    tally,
    total,
  });
}
