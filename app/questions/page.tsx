import { sql } from "@/lib/db";
import Link from "next/link";
import CopyButton from "./CopyButton";
import s from "./page.module.css";

export const dynamic = "force-dynamic";

type QuestionRow = {
  prompt: string;
  type: string;
  options: string[] | null;
  times_used: number;
};

export default async function QuestionsPage() {
  const rows = await sql`
    SELECT prompt, type, options, COUNT(*)::int AS times_used
    FROM questions
    GROUP BY prompt, type, options
    ORDER BY times_used DESC, prompt ASC
  `;

  const questions = rows as QuestionRow[];

  return (
    <main className={s.page}>
      <div className={s.wrap}>
        <div className={s.topBar}>
          <div>
            <div className={s.brand}>
              <span className={s.dot} />
              <span className={s.brandName}>POLLINATOR</span>
            </div>
            <h1 className={s.h1}>Spørgsmålsbank</h1>
            <p className={s.sub}>Alle spørgsmål brugt på tværs af sessioner.</p>
          </div>
          <div className={s.topActions}>
            <Link href="/" className={s.btnGhost}>← Forside</Link>
            <Link href="/host" className={s.btnPrimary}>Ny workshop →</Link>
          </div>
        </div>

        {questions.length === 0 ? (
          <p className={s.empty}>Ingen spørgsmål endnu.</p>
        ) : (
          <div className={s.list}>
            {questions.map((q, i) => (
              <div key={i} className={s.card}>
                <div className={s.cardLeft}>
                  <span className={`${s.badge} ${
                    q.type === "wordcloud" ? s.badgeCloud
                    : q.type === "scale" ? s.badgeScale
                    : q.type === "text" ? s.badgeText
                    : q.type === "ranking" ? s.badgeRanking
                    : s.badgeDilemma
                  }`}>
                    {q.type === "wordcloud" ? "ORDSKY"
                      : q.type === "scale" ? "SKALA 1–10"
                      : q.type === "text" ? "FRITEKST"
                      : q.type === "ranking" ? "RANGERING"
                      : "DILEMMA"}
                  </span>
                  <span className={s.prompt}>{q.prompt}</span>
                  {q.type === "dilemma" && q.options && (
                    <div className={s.options}>
                      {q.options.map((opt, j) => (
                        <span key={j} className={s.optChip}>{opt}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className={s.cardRight}>
                  <span className={s.usedCount}>{q.times_used}×</span>
                  <CopyButton text={q.prompt} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
