import { sql } from "@/lib/db";
import Link from "next/link";
import SessionsList from "./SessionsList";
import s from "./page.module.css";

export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  code: string;
  title: string;
  created_at: string;
  state: "lobby" | "active" | "closed";
  question_count: number;
  response_count: number;
  types: string[];
};

export default async function SessionsPage() {
  const rows = await sql`
    SELECT
      s.id, s.code, s.title, s.created_at, s.state,
      COUNT(DISTINCT q.id)::int AS question_count,
      COALESCE(ARRAY_AGG(DISTINCT q.type) FILTER (WHERE q.type IS NOT NULL), '{}') AS types,
      (
        (SELECT COUNT(*) FROM responses r WHERE r.question_id IN (SELECT id FROM questions WHERE session_id = s.id))
        + (SELECT COUNT(*) FROM word_responses w WHERE w.question_id IN (SELECT id FROM questions WHERE session_id = s.id))
        + (SELECT COUNT(*) FROM text_responses t WHERE t.question_id IN (SELECT id FROM questions WHERE session_id = s.id))
        + (SELECT COUNT(*) FROM ranking_responses rk WHERE rk.question_id IN (SELECT id FROM questions WHERE session_id = s.id))
      )::int AS response_count
    FROM sessions s
    LEFT JOIN questions q ON q.session_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;

  const sessions = rows as SessionRow[];

  return (
    <main className={s.page}>
      <div className={s.wrap}>
        <div className={s.topBar}>
          <div>
            <div className={s.brand}>
              <span className={s.dot} />
              <span className={s.brandName}>POLLINATOR</span>
            </div>
            <h1 className={s.h1}>Tidligere sessioner</h1>
          </div>
          <div className={s.topActions}>
            <Link href="/" className={s.btnGhost}>← Forside</Link>
            <Link href="/host" className={s.btnPrimary}>Ny workshop →</Link>
          </div>
        </div>

        <SessionsList sessions={sessions} />
      </div>
    </main>
  );
}
