import { sql } from "@/lib/db";
import Link from "next/link";
import SessionsClient from "./SessionsClient";
import s from "./page.module.css";

type SessionRow = {
  id: string;
  code: string;
  title: string;
  created_at: string;
  question_count: number;
  types: string[];
};

export default async function SessionsPage() {
  const rows = await sql`
    SELECT
      s.id, s.code, s.title, s.created_at,
      COUNT(q.id)::int AS question_count,
      COALESCE(ARRAY_AGG(DISTINCT q.type) FILTER (WHERE q.type IS NOT NULL), '{}') AS types
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

        {sessions.length === 0 ? (
          <p className={s.empty}>Ingen sessioner endnu.</p>
        ) : (
          <div className={s.list}>
            {sessions.map((sess) => (
              <div key={sess.id} className={s.card}>
                <div className={s.cardMain}>
                  <div className={s.cardTitle}>{sess.title}</div>
                  <div className={s.cardMeta}>
                    <span>{new Date(sess.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}</span>
                    <span className={s.dot2} />
                    <span>{sess.question_count} spørgsmål</span>
                    {sess.types.includes("wordcloud") && <span className={`${s.badge} ${s.badgeCloud}`}>ORDSKY</span>}
                    {sess.types.includes("dilemma") && <span className={`${s.badge} ${s.badgeDilemma}`}>DILEMMA</span>}
                    {sess.types.includes("scale") && <span className={`${s.badge} ${s.badgeScale}`}>SKALA</span>}
                    {sess.types.includes("text") && <span className={`${s.badge} ${s.badgeText}`}>FRITEKST</span>}
                    {sess.types.includes("ranking") && <span className={`${s.badge} ${s.badgeRanking}`}>RANGERING</span>}
                  </div>
                </div>
                <div className={s.cardActions}>
                  <Link href={`/report/${sess.code}`} className={s.btnSmallGhost}>Rapport</Link>
                  <SessionsClient code={sess.code} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
