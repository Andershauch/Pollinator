import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/questions/[id]/results — hent optælling (storskærm poller denne)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const questions = await sql`
    SELECT id, prompt, options, type FROM questions WHERE id = ${id}
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
    // Always return all 10 values (1–10), fill missing with 0
    const tally = Array.from({ length: 10 }, (_, i) => {
      const val = i + 1;
      const votes = (counts as { option_index: number; votes: number }[])
        .find((r) => r.option_index === val)?.votes ?? 0;
      return { index: val, label: String(val), votes };
    });
    const total = tally.reduce((s, r) => s + r.votes, 0);
    const average = total > 0
      ? tally.reduce((s, r) => s + r.index * r.votes, 0) / total
      : 0;
    const options = q.options as string[];
    return NextResponse.json({
      question_id: id,
      prompt: q.prompt,
      type: "scale",
      tally,
      total,
      average,
      lowLabel: options[0] ?? "",
      highLabel: options[1] ?? "",
    });
  }

  // Dilemma (default)
  const options = q.options as string[];
  const tally = options.map((label: string, idx: number) => ({
    index: idx,
    label,
    votes: (counts as { option_index: number; votes: number }[])
      .find((r) => r.option_index === idx)?.votes ?? 0,
  }));

  return NextResponse.json({
    question_id: id,
    prompt: q.prompt,
    type: "dilemma",
    tally,
    total: tally.reduce((s, r) => s + r.votes, 0),
  });
}
