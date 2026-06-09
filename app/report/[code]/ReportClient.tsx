"use client";

import s from "./report.module.css";

const COLORS = [
  "oklch(0.82 0.155 78)",
  "oklch(0.79 0.15 158)",
  "oklch(0.73 0.15 248)",
  "oklch(0.72 0.165 330)",
];

type TallyItem = { index: number; label: string; votes: number; pct: number };
type WordItem = { word: string; count: number };

type Question = {
  id: string;
  prompt: string;
  type: "dilemma" | "wordcloud" | "scale";
  position: number;
  total: number;
  tally?: TallyItem[];
  words?: WordItem[];
  average?: number;
  lowLabel?: string;
  highLabel?: string;
};

type Session = { code: string; title: string; created_at: string };

/* ── CSV export ─────────────────────────────────────────────── */

function buildCSV(session: Session, questions: Question[]): string {
  const lines: string[] = [
    `Session:,${session.title}`,
    `Kode:,${session.code}`,
    `Dato:,${new Date(session.created_at).toLocaleDateString("da-DK")}`,
    "",
  ];

  const typeName = (type: string) =>
    type === "wordcloud" ? "Ordsky" : type === "scale" ? "Skala" : "Dilemma";

  questions.forEach((q, i) => {
    lines.push(`Spørgsmål ${i + 1} (${typeName(q.type)}):,"${q.prompt}"`);
    lines.push(`Svar i alt:,${q.total}`);
    if (q.type === "dilemma" && q.tally) {
      lines.push("Svarforslag,Stemmer,Pct");
      q.tally.forEach((t) => lines.push(`"${t.label}",${t.votes},${t.pct}%`));
    } else if (q.type === "scale" && q.tally) {
      lines.push(`Gennemsnit:,${q.average?.toFixed(2) ?? "–"}`);
      lines.push("Værdi,Stemmer,Pct");
      q.tally.forEach((t) => lines.push(`${t.index},${t.votes},${t.pct}%`));
    } else if (q.type === "wordcloud" && q.words) {
      lines.push("Ord,Antal");
      q.words.forEach((w) => lines.push(`"${w.word}",${w.count}`));
    }
    lines.push("");
  });

  return lines.join("\n");
}

function downloadCSV(session: Session, questions: Question[]) {
  const csv = buildCSV(session, questions);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pollinator-${session.code}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Dilemma bars ───────────────────────────────────────────── */

function DilemmaResult({ tally, total }: { tally: TallyItem[]; total: number }) {
  return (
    <div className={s.tallyList}>
      {tally.map((item) => (
        <div key={item.index} className={s.tallyRow}>
          <div className={s.tallyLabel}>{item.label}</div>
          <div className={s.barTrack}>
            <div
              className={s.barFill}
              style={{ width: `${item.pct}%`, background: COLORS[item.index % 4] }}
            />
          </div>
          <div className={s.tallyStat}>
            <span className={s.tallyPct}>{item.pct}%</span>
            <span className={s.tallyVotes}>({item.votes})</span>
          </div>
        </div>
      ))}
      <div className={s.totalNote}>{total} svar i alt</div>
    </div>
  );
}

/* ── Word cloud list ────────────────────────────────────────── */

function WordResult({ words, total }: { words: WordItem[]; total: number }) {
  const maxCount = Math.max(1, ...words.map((w) => w.count));
  return (
    <div className={s.wordList}>
      {words.map((w) => (
        <div key={w.word} className={s.wordRow}>
          <span className={s.wordText} style={{ fontSize: 14 + (w.count / maxCount) * 12 }}>
            {w.word}
          </span>
          <div className={s.wordBarTrack}>
            <div
              className={s.wordBarFill}
              style={{ width: `${Math.round((w.count / maxCount) * 100)}%` }}
            />
          </div>
          <span className={s.wordCount}>{w.count}</span>
        </div>
      ))}
      <div className={s.totalNote}>{total} svar i alt</div>
    </div>
  );
}

/* ── Scale result ───────────────────────────────────────────── */

function ScaleResult({
  tally,
  total,
  average,
  lowLabel,
  highLabel,
}: {
  tally: TallyItem[];
  total: number;
  average?: number;
  lowLabel?: string;
  highLabel?: string;
}) {
  const maxVotes = Math.max(1, ...tally.map((t) => t.votes));
  return (
    <div className={s.scaleWrap}>
      {average !== undefined && (
        <div className={s.scaleAvg}>
          <span className={s.scaleAvgNum}>{average.toFixed(1)}</span>
          <span className={s.scaleAvgLabel}>gennemsnit</span>
        </div>
      )}
      <div className={s.scaleBars}>
        {tally.map((item) => (
          <div key={item.index} className={s.scaleBar}>
            <div className={s.scaleBarCount}>{item.votes > 0 ? item.votes : ""}</div>
            <div className={s.scaleBarTrack}>
              <div
                className={s.scaleBarFill}
                style={{
                  height: `${(item.votes / maxVotes) * 100}%`,
                  background: COLORS[Math.floor((item.index - 1) / 2.5) % COLORS.length],
                }}
              />
            </div>
            <div className={s.scaleBarLabel}>{item.index}</div>
          </div>
        ))}
      </div>
      {(lowLabel || highLabel) && (
        <div className={s.scaleEndRow}>
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
      <div className={s.totalNote}>{total} svar i alt</div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────── */

export default function ReportClient({
  session,
  questions,
}: {
  session: Session;
  questions: Question[];
}) {
  const dateStr = new Date(session.created_at).toLocaleDateString("da-DK", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.headerLeft}>
          <div className={s.brand}>
            <span className={s.brandDot} />
            <span className={s.brandName}>POLLINATOR</span>
          </div>
          <h1 className={s.title}>{session.title}</h1>
          <div className={s.meta}>
            Kode: <strong>{session.code}</strong> · {dateStr}
          </div>
        </div>
        <div className={s.actions}>
          <button className={s.btnPrint} onClick={() => window.print()}>
            Udskriv / PDF
          </button>
          <button className={s.btnCsv} onClick={() => downloadCSV(session, questions)}>
            Download CSV
          </button>
        </div>
      </header>

      <main className={s.main}>
        {questions.map((q, i) => (
          <div key={q.id} className={s.card}>
            <div className={s.cardHead}>
              <span className={s.qNum}>{i + 1}</span>
              <span className={s.qTypeBadge}>
                {q.type === "wordcloud" ? "ORDSKY" : q.type === "scale" ? "SKALA 1–10" : "DILEMMA"}
              </span>
              <h2 className={s.qPrompt}>{q.prompt}</h2>
            </div>
            <div className={s.cardBody}>
              {q.type === "dilemma" && q.tally && (
                <DilemmaResult tally={q.tally} total={q.total} />
              )}
              {q.type === "scale" && q.tally && (
                <ScaleResult
                  tally={q.tally}
                  total={q.total}
                  average={q.average}
                  lowLabel={q.lowLabel}
                  highLabel={q.highLabel}
                />
              )}
              {q.type === "wordcloud" && q.words && (
                <WordResult words={q.words} total={q.total} />
              )}
              {q.total === 0 && (
                <p className={s.noData}>Ingen svar registreret</p>
              )}
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <p className={s.noData}>Ingen spørgsmål i denne session.</p>
        )}
      </main>
    </div>
  );
}
