import { sql } from "@/lib/db";
import Link from "next/link";
import CopyButton from "./CopyButton";

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
    <main style={s.page}>
      <div style={s.wrap}>
        <div style={s.topBar}>
          <div>
            <div style={s.brand}>
              <span style={s.dot} />
              <span style={s.brandName}>POLLINATOR</span>
            </div>
            <h1 style={s.h1}>Spørgsmålsbank</h1>
            <p style={s.sub}>Alle spørgsmål brugt på tværs af sessioner.</p>
          </div>
          <div style={s.topActions}>
            <Link href="/" style={s.btnGhost}>← Forside</Link>
            <Link href="/host" style={s.btnPrimary}>Ny workshop →</Link>
          </div>
        </div>

        {questions.length === 0 ? (
          <p style={s.empty}>Ingen spørgsmål endnu.</p>
        ) : (
          <div style={s.list}>
            {questions.map((q, i) => (
              <div key={i} style={s.card}>
                <div style={s.cardLeft}>
                  <span style={q.type === "wordcloud" ? { ...s.badge, ...s.badgeCloud } : q.type === "scale" ? { ...s.badge, ...s.badgeScale } : { ...s.badge, ...s.badgeDilemma }}>
                    {q.type === "wordcloud" ? "ORDSKY" : q.type === "scale" ? "SKALA 1–10" : "DILEMMA"}
                  </span>
                  <span style={s.prompt}>{q.prompt}</span>
                  {q.type === "dilemma" && q.options && (
                    <div style={s.options}>
                      {q.options.map((opt, j) => (
                        <span key={j} style={s.optChip}>{opt}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={s.cardRight}>
                  <span style={s.usedCount}>{q.times_used}×</span>
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
  h1: { fontSize: 32, fontWeight: 600, color: "var(--fg)", margin: "0 0 6px", letterSpacing: "0.01em" },
  sub: { fontSize: 14, color: "var(--faint)", margin: 0, letterSpacing: "0.05em" },
  topActions: { display: "flex", gap: 10, alignItems: "center", paddingTop: 4, flexShrink: 0 },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: {
    background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12,
    padding: "16px 20px", display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: 16, flexWrap: "wrap",
  },
  cardLeft: { display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", flex: 1 },
  badge: {
    fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
    padding: "3px 7px", borderRadius: 999, border: "1px solid transparent",
    flexShrink: 0, alignSelf: "center",
  },
  badgeCloud: { background: "color-mix(in oklch, var(--c1) 15%, transparent)", color: "var(--c1)", borderColor: "color-mix(in oklch, var(--c1) 35%, transparent)" },
  badgeDilemma: { background: "color-mix(in oklch, var(--c2) 15%, transparent)", color: "var(--c2)", borderColor: "color-mix(in oklch, var(--c2) 35%, transparent)" },
  badgeScale: { background: "color-mix(in oklch, var(--c3) 15%, transparent)", color: "var(--c3)", borderColor: "color-mix(in oklch, var(--c3) 35%, transparent)" },
  prompt: { fontSize: 16, fontWeight: 500, color: "var(--fg)" },
  options: { display: "flex", gap: 6, flexWrap: "wrap", width: "100%", marginTop: 4 },
  optChip: {
    fontSize: 12, color: "var(--muted)", background: "var(--bg-2)",
    border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px",
  },
  cardRight: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  usedCount: { fontSize: 13, color: "var(--faint)", letterSpacing: "0.06em" },
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
  empty: { color: "var(--faint)", fontSize: 15, letterSpacing: "0.06em" },
};
