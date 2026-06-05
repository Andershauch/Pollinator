"use client";

import { useEffect, useState, useRef } from "react";
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
};

type Session = {
  id: string;
  code: string;
  title: string;
  state: string;
  current_question_id: string | null;
  questions: Question[];
};

type TallyItem = { index: number; label: string; votes: number };

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
                margin={{ top: 4, right: 120, bottom: 4, left: 0 }}
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
                  width={220}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#9298a8",   /* --muted */
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
                  isAnimationActive
                  animationDuration={600}
                  animationEasing="ease-out"
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

  // Vis resultater når der er et aktivt spørgsmål og vi har data
  if (session.current_question_id && results) {
    return <ResultsScreen session={session} results={results} />;
  }

  // Lobby — eller vent på første resultater
  return <LobbyScreen session={session} joinUrl={joinUrl} />;
}
