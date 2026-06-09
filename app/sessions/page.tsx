import { sql } from "@/lib/db";
import Link from "next/link";
import SessionsClient from "./SessionsClient";

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
    <main style={s.page}>
      <div style={s.wrap}>
        <div style={s.topBar}>
          <div>
            <div style={s.brand}>
              <span style={s.dot} />
              <span style={s.brandName}>POLLINATOR</span>
            </div>
            <h1 style={s.h1}>Tidligere sessioner</h1>
          </div>
          <div style={s.topActions}>
            <Link href="/" style={s.btnGhost}>← Forside</Link>
            <Link href="/host" style={s.btnPrimary}>Ny workshop →</Link>
          </div>
        </div>

        {sessions.length === 0 ? (
          <p style={s.empty}>Ingen sessioner endnu.</p>
        ) : (
          <div style={s.list}>
            {sessions.map((sess) => (
              <div key={sess.id} style={s.card}>
                <div style={s.cardMain}>
                  <div style={s.cardTitle}>{sess.title}</div>
                  <div style={s.cardMeta}>
                    <span>{new Date(sess.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}</span>
                    <span style={s.dot2} />
                    <span>{sess.question_count} spørgsmål</span>
                    {sess.types.includes("wordcloud") && <span style={{ ...s.badge, ...s.badgeCloud }}>ORDSKY</span>}
                    {sess.types.includes("dilemma") && <span style={{ ...s.badge, ...s.badgeDilemma }}>DILEMMA</span>}
                    {sess.types.includes("scale") && <span style={{ ...s.badge, ...s.badgeScale }}>SKALA</span>}
                  </div>
                </div>
                <div style={s.cardActions}>
                  <Link href={`/report/${sess.code}`} style={s.btnSmallGhost}>Rapport</Link>
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

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh", background: "var(--bg)", color: "var(--fg)",
    fontFamily: '"Bahnschrift", var(--oswald,"Oswald"), "Segoe UI", system-ui, sans-serif',
    padding: "40px 24px",
  },
  wrap: { maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 },
  topBar: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  dot: {
    width: 10, height: 10, borderRadius: "50%", background: "var(--accent)",
    boxShadow: "0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent)",
    display: "inline-block",
  },
  brandName: { fontSize: 12, fontWeight: 600, letterSpacing: "0.28em", color: "var(--muted)" },
  h1: { fontSize: 32, fontWeight: 600, color: "var(--fg)", margin: 0, letterSpacing: "0.01em" },
  topActions: { display: "flex", gap: 10, alignItems: "center", paddingTop: 4, flexShrink: 0 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14,
    padding: "20px 24px", display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: 16, flexWrap: "wrap",
  },
  cardMain: { display: "flex", flexDirection: "column", gap: 6 },
  cardTitle: { fontSize: 18, fontWeight: 600, color: "var(--fg)" },
  cardMeta: { display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)", flexWrap: "wrap" },
  dot2: { width: 3, height: 3, borderRadius: "50%", background: "var(--faint)", display: "inline-block" },
  badge: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
    padding: "3px 8px", borderRadius: 999, border: "1px solid transparent",
  },
  badgeCloud: { background: "color-mix(in oklch, var(--c1) 15%, transparent)", color: "var(--c1)", borderColor: "color-mix(in oklch, var(--c1) 35%, transparent)" },
  badgeDilemma: { background: "color-mix(in oklch, var(--c2) 15%, transparent)", color: "var(--c2)", borderColor: "color-mix(in oklch, var(--c2) 35%, transparent)" },
  badgeScale: { background: "color-mix(in oklch, var(--c3) 15%, transparent)", color: "var(--c3)", borderColor: "color-mix(in oklch, var(--c3) 35%, transparent)" },
  cardActions: { display: "flex", gap: 10, flexShrink: 0 },
  btnPrimary: {
    background: "var(--accent)", color: "#13150e", border: "none", borderRadius: 9,
    padding: "11px 22px", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
    letterSpacing: "0.04em", textDecoration: "none", display: "inline-block",
  },
  btnGhost: {
    background: "var(--panel)", color: "var(--muted)", border: "1.5px solid var(--line-2)",
    borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600,
    fontFamily: "inherit", letterSpacing: "0.04em", textDecoration: "none",
    display: "inline-block",
  },
  btnSmallGhost: {
    background: "transparent", color: "var(--muted)", border: "1.5px solid var(--line-2)",
    borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
    fontFamily: "inherit", letterSpacing: "0.04em", textDecoration: "none",
    display: "inline-block",
  },
  empty: { color: "var(--faint)", fontSize: 15, letterSpacing: "0.06em" },
};
