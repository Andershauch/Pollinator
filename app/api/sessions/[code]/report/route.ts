import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { code } = await params;

  const sessions = await sql`SELECT * FROM sessions WHERE code = ${code.toUpperCase()}`;
  if (sessions.length === 0) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  const session = sessions[0];

  const questions = await sql`
    SELECT * FROM questions WHERE session_id = ${session.id as string} ORDER BY position
  `;

  const questionData = await Promise.all(
    questions.map(async (q) => {
      if (q.type === "wordcloud") {
        const words = await sql`
          SELECT word, COUNT(*)::int AS count
          FROM word_responses
          WHERE question_id = ${q.id as string}
          GROUP BY word
          ORDER BY count DESC, word ASC
        `;
        const total = (words as { count: number }[]).reduce((s, w) => s + w.count, 0);
        return { ...q, words, total };
      } else {
        const tally = await sql`
          SELECT option_index, COUNT(*)::int AS votes
          FROM responses
          WHERE question_id = ${q.id as string}
          GROUP BY option_index
        `;
        const total = (tally as { votes: number }[]).reduce((s, t) => s + t.votes, 0);
        const options = q.options as string[];
        return {
          ...q,
          total,
          tally: options.map((label: string, i: number) => {
            const votes = (tally as { option_index: number; votes: number }[])
              .find((t) => t.option_index === i)?.votes ?? 0;
            return { index: i, label, votes, pct: total > 0 ? Math.round((votes / total) * 100) : 0 };
          }),
        };
      }
    })
  );

  return NextResponse.json({ session, questions: questionData });
}
