import { sql } from "@/lib/db";
import { tallyDilemma, tallyScale, type VoteCount } from "@/lib/aggregate";
import ReportClient from "./ReportClient";

type Props = { params: Promise<{ code: string }> };

export default async function ReportPage({ params }: Props) {
  const { code } = await params;
  const upper = code.toUpperCase();

  const sessions = await sql`SELECT * FROM sessions WHERE code = ${upper}`;
  if (sessions.length === 0) {
    return (
      <main style={{ minHeight: "100dvh", background: "#111319", color: "#9298a8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        Session ikke fundet: {upper}
      </main>
    );
  }
  const session = sessions[0] as { id: string; code: string; title: string; created_at: string };

  const questions = await sql`
    SELECT * FROM questions WHERE session_id = ${session.id} ORDER BY position
  `;

  type TallyItem = { index: number; label: string; votes: number; pct: number };
  type WordItem = { word: string; count: number };
  type TextAnswerItem = { answer: string; created_at: string };
  type QuestionResult = {
    id: string; prompt: string; type: string; position: number; total: number;
    tally?: TallyItem[]; words?: WordItem[]; textAnswers?: TextAnswerItem[];
    average?: number; lowLabel?: string; highLabel?: string;
  };

  const questionData: QuestionResult[] = await Promise.all(
    questions.map(async (q): Promise<QuestionResult> => {
      if (q.type === "wordcloud") {
        const words = (await sql`
          SELECT word, COUNT(*)::int AS count
          FROM word_responses
          WHERE question_id = ${q.id as string}
          GROUP BY word ORDER BY count DESC, word ASC
        `) as WordItem[];
        const total = words.reduce((s, w) => s + w.count, 0);
        return { id: q.id as string, prompt: q.prompt as string, type: q.type as string, position: q.position as number, words, total };
      } else if (q.type === "text") {
        const textAnswers = (await sql`
          SELECT answer, created_at
          FROM text_responses
          WHERE question_id = ${q.id as string}
          ORDER BY created_at ASC
        `) as TextAnswerItem[];
        return { id: q.id as string, prompt: q.prompt as string, type: q.type as string, position: q.position as number, textAnswers, total: textAnswers.length };
      } else if (q.type === "scale") {
        const counts = (await sql`
          SELECT option_index, COUNT(*)::int AS votes
          FROM responses WHERE question_id = ${q.id as string}
          GROUP BY option_index ORDER BY option_index
        `) as VoteCount[];
        const scaleMax = (q.scale_max as number) ?? 10;
        const { tally, total, average } = tallyScale(scaleMax, counts);
        const options = q.options as string[];
        return {
          id: q.id as string, prompt: q.prompt as string, type: "scale", position: q.position as number,
          total, tally, average,
          lowLabel: options[0] ?? "", highLabel: options[1] ?? "",
        };
      } else {
        const counts = (await sql`
          SELECT option_index, COUNT(*)::int AS votes
          FROM responses WHERE question_id = ${q.id as string}
          GROUP BY option_index
        `) as VoteCount[];
        const options = q.options as string[];
        const { tally, total } = tallyDilemma(options, counts);
        return {
          id: q.id as string, prompt: q.prompt as string, type: q.type as string, position: q.position as number,
          total, tally,
        };
      }
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ReportClient session={session} questions={questionData as any} />;
}
