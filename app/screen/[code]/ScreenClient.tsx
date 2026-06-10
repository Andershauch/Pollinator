"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const WordCloudCanvas = dynamic(() => import("./WordCloudCanvas"), { ssr: false });
import { QRCodeSVG } from "qrcode.react";
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
  type: "dilemma" | "wordcloud" | "scale";
  media_url?: string | null;
  media_type?: string | null;
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
  type?: string;
  tally: TallyItem[];
  total: number;
  average?: number;
  lowLabel?: string;
  highLabel?: string;
};

/* ── useCountUp ─────────────────────────────────────────────── */

function useCountUp(target: number) {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef<number>(0);
  const prevRef = useRef(target);

  useEffect(() => {
    if (target <= prevRef.current) {
      setDisplay(target);
      prevRef.current = target;
      return;
    }
    const from = prevRef.current;
    prevRef.current = target;
    const startTime = performance.now();
    const duration = Math.min(700, (target - from) * 180);

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  return display;
}

/* ── useCountUpFloat ────────────────────────────────────────── */

function useCountUpFloat(target: number, decimals = 1) {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef<number>(0);
  const prevRef = useRef(target);

  useEffect(() => {
    if (target <= prevRef.current) {
      setDisplay(target);
      prevRef.current = target;
      return;
    }
    const from = prevRef.current;
    prevRef.current = target;
    const startTime = performance.now();
    const duration = Math.min(900, Math.abs(target - from) * 350);

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = from + (target - from) * eased;
      setDisplay(parseFloat(val.toFixed(decimals)));
      if (t < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, decimals]);

  return display;
}

/* ── MediaBanner ────────────────────────────────────────────── */

function MediaBanner({ url, type }: { url: string; type: string }) {
  if (type === "video") {
    return (
      <div className={s.mediaBanner}>
        <video
          src={url}
          autoPlay
          muted
          loop
          playsInline
          className={s.mediaBannerVideo}
        />
      </div>
    );
  }
  return (
    <div className={s.mediaBanner}>
      <img src={url} alt="" className={s.mediaBannerImg} />
    </div>
  );
}

/* ── ScaleHistogram ─────────────────────────────────────────── */

function ScaleHistogram({
  tally,
  isOpen,
}: {
  tally: TallyItem[];
  isOpen: boolean;
}) {
  const [shown, setShown] = useState(false);
  const prevIsOpen = useRef<boolean | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (prevIsOpen.current === true && isOpen === false) {
      setShown(false);
      const t = setTimeout(() => setShown(true), 120);
      prevIsOpen.current = isOpen;
      return () => clearTimeout(t);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  const maxVotes = Math.max(...tally.map((t) => t.votes), 1);

  return (
    <div className={s.scaleHistogram}>
      {tally.map((item, i) => {
        const heightPct = shown ? (item.votes / maxVotes) * 100 : 0;
        const delay = shown ? i * 45 : 0;
        return (
          <div key={item.index} className={s.scaleCol}>
            <div
              className={s.scaleCount}
              style={{
                opacity: shown && item.votes > 0 ? 1 : 0,
                transition: shown ? `opacity 0.3s ease ${delay + 400}ms` : "none",
              }}
            >
              {item.votes}
            </div>
            <div className={s.scaleBarTrack}>
              <div
                className={s.scaleBarFill}
                style={{
                  height: `${heightPct}%`,
                  background: COLORS[Math.floor((item.index - 1) / 2.5) % COLORS.length],
                  transitionProperty: "height",
                  transitionDuration: shown ? "0.6s" : "0s",
                  transitionDelay: `${delay}ms`,
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
            <div className={s.scaleValLabel}>{item.index}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── ScaleScreen ────────────────────────────────────────────── */

function ScaleScreen({
  session,
  results,
}: {
  session: Session;
  results: Results;
}) {
  const qIdx = session.questions.findIndex((q) => q.id === session.current_question_id);
  const currentQ = session.questions.find((q) => q.id === session.current_question_id) ?? null;

  const total = results.total;
  const displayTotal = useCountUp(total);
  const displayAvg = useCountUpFloat(results.average ?? 0);

  return (
    <div className={s.page}>
      <TopBar
        title={session.title}
        right={
          <>
            {qIdx >= 0 && (
              <span>SPØRGSMÅL {qIdx + 1} / {session.questions.length}</span>
            )}
            {currentQ?.is_open ? (
              <ScreenTimer openedAt={currentQ.opened_at} durationSec={currentQ.duration_seconds} />
            ) : currentQ && (
              <span className={s.closedBadge}>LUKKET</span>
            )}
            <LiveTag />
          </>
        }
      />

      <div className={s.body} style={{ alignItems: "flex-start" }}>
        <div className={s.resultsWrap}>
          {currentQ?.media_url && currentQ.media_type && (
            <MediaBanner url={currentQ.media_url} type={currentQ.media_type} />
          )}
          <h1 className={s.questionText}>{results.prompt}</h1>

          <div className={s.scaleLayout}>
            {/* Left: big average */}
            <div className={s.scaleAvgPanel}>
              <div className={s.scaleAvgLabel}>GENNEMSNIT</div>
              <div className={s.scaleAvgNum}>{displayAvg.toFixed(1)}</div>
              <div className={s.scaleAvgSub}>ud af 10</div>
              {(results.lowLabel || results.highLabel) && (
                <div className={s.scaleEndLabelsScreen}>
                  {results.lowLabel && <div className={s.scaleEndItem}><span className={s.scaleEndVal}>1</span>{results.lowLabel}</div>}
                  {results.highLabel && <div className={s.scaleEndItem}><span className={s.scaleEndVal}>10</span>{results.highLabel}</div>}
                </div>
              )}
            </div>

            {/* Right: histogram */}
            <div className={s.scaleHistWrap}>
              <ScaleHistogram tally={results.tally} isOpen={currentQ?.is_open ?? false} />
            </div>
          </div>

          <div className={s.bottomLine}>
            <span />
            <span className={s.totalLine}>{displayTotal} {displayTotal === 1 ? "svar" : "svar"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── DilemmaChart ───────────────────────────────────────────── */

type ChartItem = { label: string; pct: number; color: string; votes: number };

function DilemmaChart({ items, isOpen }: { items: ChartItem[]; isOpen: boolean }) {
  const [shown, setShown] = useState(false);
  const prevIsOpen = useRef<boolean | null>(null);

  // Initial reveal
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 150);
    return () => clearTimeout(t);
  }, []);

  // Re-reveal when question closes
  useEffect(() => {
    if (prevIsOpen.current === true && isOpen === false) {
      setShown(false);
      const t = setTimeout(() => setShown(true), 120);
      prevIsOpen.current = isOpen;
      return () => clearTimeout(t);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  return (
    <div className={s.dilemmaChart}>
      {items.map((item, i) => (
        <div key={i} className={s.chartRow}>
          <div className={s.chartLabel}>{item.label}</div>
          <div className={s.chartTrack}>
            <div
              className={s.chartFill}
              style={{
                width: shown ? `${Math.max(item.pct, item.pct > 0 ? 1 : 0)}%` : "0%",
                background: item.color,
                transitionProperty: "width",
                transitionDuration: shown ? "0.7s" : "0s",
                transitionDelay: shown ? `${i * 110}ms` : "0ms",
                transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
          <div
            className={s.chartPct}
            style={{
              opacity: shown ? 1 : 0,
              transition: shown ? `opacity 0.35s ease ${i * 110 + 500}ms` : "none",
            }}
          >
            {Math.round(item.pct)}%
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── ConsensusBadge ─────────────────────────────────────────── */

function ConsensusBadge({ total, tally }: { total: number; tally: TallyItem[] }) {
  if (total < 3) return null;
  const topPct = Math.max(...tally.map((t) => total > 0 ? (t.votes / total) * 100 : 0));

  let label: string;
  let color: string;
  let bg: string;
  if (topPct >= 65) {
    label = "STÆRK ENIGHED"; color = "oklch(0.79 0.15 158)";
    bg = "color-mix(in oklch, oklch(0.79 0.15 158) 12%, transparent)";
  } else if (topPct >= 50) {
    label = "FLERTAL"; color = "oklch(0.82 0.155 78)";
    bg = "color-mix(in oklch, oklch(0.82 0.155 78) 12%, transparent)";
  } else {
    label = "SPLITTET"; color = "oklch(0.72 0.165 330)";
    bg = "color-mix(in oklch, oklch(0.72 0.165 330) 12%, transparent)";
  }

  return (
    <span className={s.consensusBadge} style={{ color, background: bg, borderColor: color }}>
      {label}
    </span>
  );
}

/* ── ConsensusMeter ─────────────────────────────────────────── */

function ConsensusMeter({ total, tally }: { total: number; tally: TallyItem[] }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (total < 2) return null;

  const n = tally.length;
  const topPct = Math.max(...tally.map((t) => total > 0 ? (t.votes / total) * 100 : 0));
  // Normalise: 1/n (equal split) → 0%, 100% (all same) → 100%
  const minPossible = 100 / n;
  const consensusPct = Math.max(0, Math.min(100, ((topPct - minPossible) / (100 - minPossible)) * 100));

  let label: string;
  let color: string;
  if (consensusPct >= 65) { label = "STÆRK ENIGHED"; color = "oklch(0.79 0.15 158)"; }
  else if (consensusPct >= 35) { label = "FLERTAL"; color = "oklch(0.82 0.155 78)"; }
  else { label = "SPLITTET"; color = "oklch(0.72 0.165 330)"; }

  return (
    <div className={s.consensusMeter}>
      <div className={s.cmRow}>
        <span className={s.cmLabelLeft}>SPLITTET</span>
        <div className={s.cmTrack}>
          <div
            className={s.cmFill}
            style={{
              width: shown ? `${consensusPct}%` : "0%",
              background: color,
              transition: shown ? "width 1.1s cubic-bezier(0.4,0,0.2,1)" : "none",
            }}
          />
          {/* Marker dot */}
          <div
            className={s.cmDot}
            style={{
              left: shown ? `calc(${consensusPct}% - 8px)` : "-8px",
              background: color,
              boxShadow: `0 0 12px ${color}`,
              transition: shown ? "left 1.1s cubic-bezier(0.4,0,0.2,1)" : "none",
            }}
          />
        </div>
        <span className={s.cmLabelRight}>ENIGHED</span>
      </div>
      <div className={s.cmStatus} style={{ color }}>
        {label}
      </div>
    </div>
  );
}

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
            <div className={s.sessionTitle}>{session.title}</div>
            <div className={s.sessionCode}>{session.code}</div>
            <div className={s.joinUrl}>{joinUrl.replace(/^https?:\/\//, "")}</div>
          </div>
        </div>
      </div>
    </div>
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
  const qIdx = session.questions.findIndex((q) => q.id === session.current_question_id);
  const currentQ = session.questions.find((q) => q.id === session.current_question_id) ?? null;

  const total = results.total;
  const displayTotal = useCountUp(total);
  const chartItems: ChartItem[] = results.tally.map((item) => ({
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
              <span>SPØRGSMÅL {qIdx + 1} / {session.questions.length}</span>
            )}
            {currentQ?.is_open ? (
              <ScreenTimer openedAt={currentQ.opened_at} durationSec={currentQ.duration_seconds} />
            ) : currentQ && (
              <span className={s.closedBadge}>LUKKET</span>
            )}
            <LiveTag />
          </>
        }
      />

      <div className={s.body} style={{ alignItems: "flex-start" }}>
        <div className={s.resultsWrap}>
          {currentQ?.media_url && currentQ.media_type && (
            <MediaBanner url={currentQ.media_url} type={currentQ.media_type} />
          )}
          <h1 className={s.questionText}>{results.prompt}</h1>

          <DilemmaChart items={chartItems} isOpen={currentQ?.is_open ?? false} />

          <ConsensusMeter total={total} tally={results.tally} />

          <div className={s.bottomLine}>
            <span />
            <span className={s.totalLine}>
              {displayTotal} {displayTotal === 1 ? "svar" : "svar"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Word cloud screen ──────────────────────────────────────── */

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

  // Mål cloud-containerens faktiske bredde og højde responsivt
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasDims, setCanvasDims] = useState({ w: 1100, h: 500 });
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setCanvasDims({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

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
      <div className={s.body} style={{ alignItems: "stretch" }}>
        <div className={s.resultsWrap} style={{ flex: 1 }}>
          <h1 className={s.questionText}>{currentQ?.prompt ?? ""}</h1>
          <div className={s.wordCloud} ref={containerRef}>
            {words.length === 0 ? (
              <span className={s.idleSub}>Venter på ord…</span>
            ) : (
              <WordCloudCanvas words={words} width={canvasDims.w} height={canvasDims.h} />
            )}
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
  const showQR = !!session.current_question_id && !!origin;

  let screenContent: React.ReactNode;
  if (session.current_question_id && activeQ?.type === "wordcloud" && words !== null) {
    screenContent = <WordCloudScreen session={session} words={words} />;
  } else if (session.current_question_id && activeQ?.type === "scale" && results) {
    screenContent = <ScaleScreen session={session} results={results} />;
  } else if (session.current_question_id && activeQ?.type === "dilemma" && results) {
    screenContent = <ResultsScreen session={session} results={results} />;
  } else {
    screenContent = <LobbyScreen session={session} joinUrl={joinUrl} />;
  }

  return (
    <>
      {screenContent}
      {showQR && (
        <div className={s.persistentQR}>
          <div className={s.persistentQRCard}>
            <QRCodeSVG
              value={joinUrl}
              size={76}
              bgColor="white"
              fgColor="#111319"
              level="M"
              marginSize={1}
            />
          </div>
          <span className={s.persistentQRLabel}>{code}</span>
        </div>
      )}
    </>
  );
}
