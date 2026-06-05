"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  BarChart, Bar, XAxis, YAxis,
  Cell, LabelList, ResponsiveContainer, Tooltip,
} from "recharts";
import s from "./screen.module.css";

/* ── Types ─────────────────────────────────────────────────── */

type Question = {
  id: string;
  prompt: string;
  options: string[];
  position: number;
  is_open: boolean;
  duration_seconds: number | null;
  opened_at: string | null;
  type: "dilemma" | "wordcloud";
};

type WordEntry = { word: string; count: number };

type Session = {
  id: string;
  code: string;
  title: string;
  state: string;
  current_question_id: string | null;
  questions: Question[];
};

type TallyItem = { index: number; label: string; votes: number };

/* ── Countdown ──────────────────────────────────────────────── */

function useCountdown(openedAt: string | null, durationSec: number | null) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!openedAt || !durationSec) { setRemaining(null); return; }
    const end = new Date(openedAt).getTime() + durationSec * 1000;
    const tick = () => setRemaining(Math.max(0, Math.round((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [openedAt, durationSec]);
  return remaining;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ScreenTimer({ openedAt, durationSec }: { openedAt: string | null; durationSec: number | null }) {
  const remaining = useCountdown(openedAt, durationSec);
  if (remaining === null) return null;
  const pct = durationSec ? remaining / durationSec : 0;
  const urgent = remaining <= 30;
  return (
    <span style={{
      fontVariantNumeric: "tabular-nums",
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: "0.18em",
      color: remaining === 0 ? "oklch(0.72 0.165 330)" : urgent ? "oklch(0.82 0.155 78)" : "oklch(0.79 0.15 158)",
      opacity: pct === 0 ? 0.5 : 1,
    }}>
      {remaining === 0 ? "UDLØBET" : fmtTime(remaining)}
    </span>
  );
}

type Results = {
  question_id: string;
  prompt: string;
  tally: TallyItem[];
  total: number;
};

/* ── Design ─────────────────────────────────────────────────── */

// Samme farveorden som deltager-siden
const COLORS = [
  "oklch(0.82 0.155 78)",   // amber
  "oklch(0.79 0.15 158)",   // green
  "oklch(0.73 0.15 248)",   // blue
  "oklch(0.72 0.165 330)",  // magenta
];

/* ── Shared chrome ──────────────────────────────────────────── */

function TopBar({
  title,
  right,
}: {
  title?: string;
  right: React.ReactNode;
}) {
  return (
    <div className={s.topbar}>
      <div className={s.brand}>
        <span className={s.brandDot} />
        <span className={s.brandName}>POLLINATOR</span>
      </div>
      {title && <div className={s.topCenter}>{title}</div>}
      <div className={s.topRight}>{right}</div>
    </div>
  );
}

const LiveTag = () => (
  <span className={s.liveTag}>
    <span className={s.liveDot} />
    LIVE
  </span>
);

/* ── Lobby ──────────────────────────────────────────────────── */

function LobbyScreen({
  session,
  joinUrl,
}: {
  session: Session;
  joinUrl: string;
}) {
  return (
    <div className={s.page}>
      <TopBar right={<LiveTag />} />
      <div className={s.body}>
        <div className={s.lobbyWrap}>
          <div className={s.qrCard}>
            <QRCodeSVG
              value={joinUrl}
              size={300}
              bgColor="transparent"
              fgColor="#111319"
              level="M"
              marginSize={0}
            />
          </div>

          <div className={s.joinInfo}>
            <div className={s.joinKicker}>Scan og deltag</div>
            <div className={s.sessionCode}>{session.code}</div>
            <div className={s.joinUrl}>{joinUrl.replace(/^https?:\/\//, "")}</div>
            <div className={s.sessionTitle}>{session.title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Recharts custom label ──────────────────────────────────── */

function PctLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props;
  return (
    <text
      x={x + width + 18}
      y={y + height / 2}
      dominantBaseline="central"
      className={s.barLabel}
    >
      {Math.round(value)}%
    </text>
  );
}

/* ── Active / results ───────────────────────────────────────── */

function ResultsScreen({
  session,
  results,
}: {
  session: Session;
  results: Results;
}) {
  const qIdx = session.questions.findIndex(
    (q) => q.id === session.current_question_id
  );
  const currentQ = session.questions.find((q) => q.id === session.current_question_id) ?? null;

  const total = results.total;
  const chartData = results.tally.map((item) => ({
    label: item.label,
    pct: total > 0 ? (item.votes / total) * 100 : 0,
    votes: item.votes,
    color: COLORS[item.index % COLORS.length],
  }));

  return (
    <div className={s.page}>
      <TopBar
        title={session.title}
        right={
          <>
            {qIdx >= 0 && (
              <span>
                SPØRGSMÅL {qIdx + 1} / {session.questions.length}
              </span>
            )}
            {currentQ?.is_open && (
              <ScreenTimer
                openedAt={currentQ.opened_at}
                durationSec={currentQ.duration_seconds}
              />
            )}
            <LiveTag />
          </>
        }
      />

      <div className={s.body} style={{ alignItems: "flex-start" }}>
        <div className={s.resultsWrap}>
          <h1 className={s.questionText}>{results.prompt}</h1>

          <div className={s.chartArea}>
            <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 90)}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 4, right: 120, bottom: 4, left: 8 }}
                barCategoryGap="22%"
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  hide
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={320}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#9298a8",
                    fontSize: 26,
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                    fontFamily: "Bahnschrift, Oswald, Segoe UI, system-ui, sans-serif",
                  }}
                />
                <Tooltip
                  cursor={false}
                  content={() => null}
                />
                <Bar
                  dataKey="pct"
                  radius={[0, 10, 10, 0]}
                  isAnimationActive={false}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="pct"
                    content={<PctLabel />}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={s.totalLine}>
            {total} {total === 1 ? "svar" : "svar"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Word cloud screen ──────────────────────────────────────── */

const CLOUD_COLORS = [
  "oklch(0.82 0.155 78)",
  "oklch(0.79 0.15 158)",
  "oklch(0.73 0.15 248)",
  "oklch(0.72 0.165 330)",
];

function cloudColor(word: string) {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) & 0xfffffff;
  return CLOUD_COLORS[Math.abs(h) % CLOUD_COLORS.length];
}

function WordCloudScreen({
  session,
  words,
}: {
  session: Session;
  words: WordEntry[];
}) {
  const qIdx = session.questions.findIndex((q) => q.id === session.current_question_id);
  const currentQ = session.questions.find((q) => q.id === session.current_question_id) ?? null;
  const total = words.reduce((sum, w) => sum + w.count, 0);
  const maxCount = Math.max(1, ...words.map((w) => w.count));

  // Stable shuffle — keyed on word set, not counts
  const wordSet = words.map((w) => w.word).sort().join(",");
  const shuffled = useMemo(() => {
    const arr = [...words];
    let seed = 0;
    for (let i = 0; i < wordSet.length; i++) seed = (seed * 31 + wordSet.charCodeAt(i)) & 0xfffffff;
    return arr.sort((a, b) => {
      const ha = (seed * 17 + a.word.charCodeAt(0)) & 0xfffffff;
      const hb = (seed * 17 + b.word.charCodeAt(0)) & 0xfffffff;
      return ha - hb;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordSet]);

  const wordSize = (count: number) => {
    const min = 32, max = 108;
    return min + ((count - 1) / Math.max(1, maxCount - 1)) * (max - min);
  };

  return (
    <div className={s.page}>
      <TopBar
        title={session.title}
        right={
          <>
            {qIdx >= 0 && (
              <span>SPØRGSMÅL {qIdx + 1} / {session.questions.length}</span>
            )}
            {currentQ?.is_open && (
              <ScreenTimer openedAt={currentQ.opened_at} durationSec={currentQ.duration_seconds} />
            )}
            <LiveTag />
          </>
        }
      />
      <div className={s.body} style={{ alignItems: "flex-start" }}>
        <div className={s.resultsWrap}>
          <h1 className={s.questionText}>{currentQ?.prompt ?? ""}</h1>
          <div className={s.wordCloud}>
            {words.length === 0 ? (
              <span className={s.idleSub}>Venter på ord…</span>
            ) : shuffled.map(({ word, count }) => (
              <span
                key={word}
                className={s.cloudWord}
                style={{
                  fontSize: wordSize(count),
                  color: cloudColor(word),
                  opacity: 0.7 + 0.3 * (count / maxCount),
                }}
              >
                {word}
              </span>
            ))}
          </div>
          <div className={s.totalLine}>{total} {total === 1 ? "svar" : "svar"}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Closed / idle ──────────────────────────────────────────── */

function IdleScreen({ message, sub }: { message: string; sub: string }) {
  return (
    <div className={s.page}>
      <TopBar right={<span style={{ letterSpacing: "0.18em", color: "var(--faint)" }}>AFSLUTTET</span>} />
      <div className={s.body}>
        <div className={s.idleWrap}>
          <div className={s.idleTitle}>{message}</div>
          <div className={s.idleSub}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export default function ScreenClient({ code }: { code: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [words, setWords] = useState<WordEntry[] | null>(null);
  const [origin, setOrigin] = useState("");

  // Kun tilgængeligt i browser
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Aktuel question-id til at styre results-polling
  const currentQId = useRef<string | null>(null);

  // Poll session hvert 2.5 sek
  useEffect(() => {
    let mounted = true;

    const pollSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${code}`);
        if (!res.ok || !mounted) return;
        const data: Session = await res.json();
        setSession(data);
        currentQId.current = data.current_question_id;
      } catch { /* silent */ }
    };

    pollSession();
    const id = setInterval(pollSession, 2500);
    return () => { mounted = false; clearInterval(id); };
  }, [code]);

  // Poll word cloud hvert 2 sek når aktivt spørgsmål er af type wordcloud
  useEffect(() => {
    const q = session?.questions.find((q) => q.id === session.current_question_id);
    if (!session?.current_question_id || q?.type !== "wordcloud") {
      setWords(null);
      return;
    }
    const qid = session.current_question_id;
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/questions/${qid}/words`);
        if (!res.ok || !mounted) return;
        const data: WordEntry[] = await res.json();
        if (mounted) setWords(data);
      } catch { /* silent */ }
    };
    setWords(null);
    poll();
    const id = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(id); };
  }, [session?.current_question_id]);

  // Poll results hvert 1.5 sek når der er et aktivt spørgsmål
  useEffect(() => {
    if (!session?.current_question_id) {
      setResults(null);
      return;
    }

    const qid = session.current_question_id;
    let mounted = true;

    const pollResults = async () => {
      try {
        const res = await fetch(`/api/questions/${qid}/results`);
        if (!res.ok || !mounted) return;
        // Stop polling hvis spørgsmålet er skiftet
        if (currentQId.current !== qid) return;
        const data: Results = await res.json();
        if (mounted) setResults(data);
      } catch { /* silent */ }
    };

    setResults(null); // Nulstil ved nyt spørgsmål
    pollResults();
    const id = setInterval(pollResults, 1500);
    return () => { mounted = false; clearInterval(id); };
  }, [session?.current_question_id]);

  /* ── Render ──────────────────────────────────────────────── */

  if (!session) {
    return (
      <div className={s.page}>
        <TopBar right={<LiveTag />} />
        <div className={s.body}>
          <div className={s.idleWrap}>
            <div className={s.idleSub}>Forbinder…</div>
          </div>
        </div>
      </div>
    );
  }

  if (session.state === "closed") {
    return <IdleScreen message="WORKSHOPPEN ER FÆRDIG" sub="Tak for jeres deltagelse" />;
  }

  const joinUrl = `${origin}/s/${code}`;

  const activeQ = session.questions.find((q) => q.id === session.current_question_id);

  // Ordsky
  if (session.current_question_id && activeQ?.type === "wordcloud" && words !== null) {
    return <WordCloudScreen session={session} words={words} />;
  }

  // Dilemma-resultater
  if (session.current_question_id && activeQ?.type !== "wordcloud" && results) {
    return <ResultsScreen session={session} results={results} />;
  }

  // Lobby — eller vent på første resultater
  return <LobbyScreen session={session} joinUrl={joinUrl} />;
}
