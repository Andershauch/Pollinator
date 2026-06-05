"use client";

import { useEffect, useState, useCallback } from "react";
import s from "./participant.module.css";

/* ── Types ─────────────────────────────────────────────────── */

type Question = {
  id: string;
  prompt: string;
  options: string[];
  position: number;
  is_open: boolean;
  duration_seconds: number | null;
  opened_at: string | null;
};

type Session = {
  id: string;
  code: string;
  title: string;
  state: "lobby" | "active" | "closed";
  current_question_id: string | null;
  questions: Question[];
};

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

function ParticipantTimer({ openedAt, durationSec }: { openedAt: string | null; durationSec: number | null }) {
  const remaining = useCountdown(openedAt, durationSec);
  if (remaining === null) return null;
  const urgent = remaining <= 30;
  const expired = remaining === 0;
  return (
    <span className={`${s.timerTag} ${urgent ? s.timerUrgent : ""} ${expired ? s.timerExpired : ""}`}>
      {expired ? "LUKKER…" : `⏱ ${fmtTime(remaining)}`}
    </span>
  );
}

/* ── Design ─────────────────────────────────────────────────── */

const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];
const color = (i: number) => COLORS[i % COLORS.length];

/* ── localStorage helpers ───────────────────────────────────── */

const PKEY = "pollinator_pkey";
const VOTES = "pollinator_votes";

function getParticipantKey(): string {
  let k = localStorage.getItem(PKEY);
  if (!k) {
    k = crypto.randomUUID();
    localStorage.setItem(PKEY, k);
  }
  return k;
}

function loadVotes(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(VOTES) ?? "{}");
  } catch {
    return {};
  }
}

function persistVote(qid: string, idx: number) {
  const v = loadVotes();
  v[qid] = idx;
  localStorage.setItem(VOTES, JSON.stringify(v));
}

/* ── Shared small pieces ────────────────────────────────────── */

function Brand() {
  return (
    <div className={s.brand}>
      <span className={s.brandDot} />
      <span className={s.brandName}>POLLINATOR</span>
    </div>
  );
}

function TopBar({ right }: { right: React.ReactNode }) {
  return (
    <div className={s.topbar}>
      <Brand />
      <div>{right}</div>
    </div>
  );
}

function WaitingIndicator({ text }: { text: string }) {
  return (
    <div className={s.waiting}>
      <div className={s.dots}>
        <i /><i /><i />
      </div>
      <div className={s.waitingText}>{text}</div>
    </div>
  );
}

function CheckRing({ sm = false }: { sm?: boolean }) {
  return (
    <div className={`${s.checkRing}${sm ? ` ${s.sm}` : ""}`}>
      <span className={s.check} />
    </div>
  );
}

/* ── Screen: lobby / connected ──────────────────────────────── */

function LobbyScreen({ title }: { title: string }) {
  return (
    <div className={s.screen}>
      <TopBar right={
        <span className={s.statusOk}>
          <span className={s.statusDot} />
          FORBUNDET
        </span>
      } />
      <div className={`${s.main} ${s.center}`}>
        <CheckRing />
        <div className={s.bigLabel}>DU ER MED</div>
        <div className={s.subLabel}>{title}</div>
      </div>
      <div className={s.foot}>
        <WaitingIndicator text="Venter på første spørgsmål" />
      </div>
    </div>
  );
}

/* ── Screen: active question ────────────────────────────────── */

function ActiveScreen({
  question,
  qNum,
  submitting,
  onVote,
}: {
  question: Question;
  qNum: number;
  submitting: boolean;
  onVote: (idx: number) => void;
}) {
  return (
    <div className={s.screen}>
      <TopBar right={
        <div className={s.topRight}>
          <span className={s.tag}>SPØRGSMÅL {qNum}</span>
          <ParticipantTimer openedAt={question.opened_at} durationSec={question.duration_seconds} />
        </div>
      } />
      <div className={s.qHead}>
        <h1 className={s.qText}>{question.prompt}</h1>
      </div>
      <div className={s.opts}>
        {question.options.map((label, i) => (
          <button
            key={i}
            className={s.opt}
            onClick={() => onVote(i)}
            disabled={submitting}
          >
            <span className={s.optNum} style={{ background: color(i) }}>
              {i + 1}
            </span>
            <span className={s.optLabel}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Screen: svar afgivet ───────────────────────────────────── */

function SubmittedScreen({
  optionLabel,
  optionIndex,
  qNum,
  question,
}: {
  optionLabel: string;
  optionIndex: number;
  qNum: number;
  question: Question;
}) {
  return (
    <div className={s.screen}>
      <TopBar right={
        <div className={s.topRight}>
          <span className={s.tag}>SPØRGSMÅL {qNum}</span>
          <ParticipantTimer openedAt={question.opened_at} durationSec={question.duration_seconds} />
        </div>
      } />
      <div className={`${s.main} ${s.center}`}>
        <CheckRing sm />
        <div className={s.submittedLabel}>DU SVAREDE</div>
        <div className={s.chosen}>
          <span className={s.optNum} style={{ background: color(optionIndex) }}>
            {optionIndex + 1}
          </span>
          <span className={s.chosenLabel}>{optionLabel}</span>
        </div>
      </div>
      <div className={s.foot}>
        <WaitingIndicator text="Venter på at spørgsmålet lukker" />
      </div>
    </div>
  );
}

/* ── Screen: spørgsmål lukket / vent ────────────────────────── */

function WaitingScreen() {
  return (
    <div className={s.screen}>
      <TopBar right={<span className={`${s.tag} ${s.tagMuted}`}>LUKKET</span>} />
      <div className={`${s.main} ${s.center}`}>
        <div className={s.pauseRing}>
          <div className={s.pauseBars}><i /><i /></div>
        </div>
        <div className={`${s.bigLabel} ${s.dim}`}>VENT ET ØJEBLIK</div>
        <div className={s.subLabel}>Spørgsmålet er lukket</div>
      </div>
      <div className={s.foot}>
        <WaitingIndicator text="Næste spørgsmål kommer snart" />
      </div>
    </div>
  );
}

/* ── Screen: session afsluttet ──────────────────────────────── */

function ClosedScreen() {
  return (
    <div className={s.screen}>
      <TopBar right={<span className={`${s.tag} ${s.tagMuted}`}>AFSLUTTET</span>} />
      <div className={`${s.main} ${s.center}`}>
        <div className={s.pauseRing}>
          <div className={s.pauseBars}><i /><i /></div>
        </div>
        <div className={`${s.bigLabel} ${s.dim}`}>WORKSHOPPEN ER FÆRDIG</div>
        <div className={s.subLabel}>Tak for din deltagelse</div>
      </div>
    </div>
  );
}

/* ── Screen: ikke fundet ────────────────────────────────────── */

function NotFoundScreen({ code }: { code: string }) {
  return (
    <div className={s.screen}>
      <TopBar right={<span className={`${s.tag} ${s.tagMuted}`}>IKKE FUNDET</span>} />
      <div className={`${s.main} ${s.center}`}>
        <div className={`${s.bigLabel} ${s.dim}`}>{code}</div>
        <div className={s.subLabel}>Session ikke fundet</div>
      </div>
    </div>
  );
}

/* ── Spinner: initial load ──────────────────────────────────── */

function LoadingScreen() {
  return (
    <div className={`${s.screen} ${s.main} ${s.center}`}>
      <WaitingIndicator text="Forbinder…" />
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export default function ParticipantClient({ code }: { code: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "notfound" | "ok">("loading");
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Hent gemte stemmer fra localStorage ved mount
  useEffect(() => {
    setVotes(loadVotes());
  }, []);

  // Poll session hvert 2.5 sek
  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${code}`);
        if (!mounted) return;
        if (res.status === 404) { setStatus("notfound"); return; }
        if (!res.ok) return;
        const data: Session = await res.json();
        setSession(data);
        setStatus("ok");
      } catch {
        /* network-fejl — prøv igen ved næste interval */
      }
    };

    poll();
    const id = setInterval(poll, 2500);
    return () => { mounted = false; clearInterval(id); };
  }, [code]);

  const handleVote = useCallback(async (optionIndex: number) => {
    if (!session?.current_question_id || submitting) return;
    const qid = session.current_question_id;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/questions/${qid}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          option_index: optionIndex,
          participant_key: getParticipantKey(),
        }),
      });

      if (res.ok || res.status === 409) {
        // 409 = allerede stemt — registrer alligevel lokalt
        persistVote(qid, optionIndex);
        setVotes((v) => ({ ...v, [qid]: optionIndex }));
      }
    } finally {
      setSubmitting(false);
    }
  }, [session, submitting]);

  /* ── Render ─────────────────────────────────────────────── */

  if (status === "loading") return <LoadingScreen />;
  if (status === "notfound") return <NotFoundScreen code={code} />;
  if (!session) return <LoadingScreen />;

  if (session.state === "closed") return <ClosedScreen />;

  const currentQ = session.current_question_id
    ? session.questions.find((q) => q.id === session.current_question_id)
    : null;

  // Ingen aktivt spørgsmål → lobby
  if (!currentQ) return <LobbyScreen title={session.title} />;

  const qNum = session.questions.findIndex((q) => q.id === currentQ.id) + 1;
  const votedIndex = votes[currentQ.id];

  // Allerede stemt → vis "Du svarede"
  if (votedIndex !== undefined) {
    return (
      <SubmittedScreen
        optionLabel={currentQ.options[votedIndex] ?? "?"}
        optionIndex={votedIndex}
        qNum={qNum}
        question={currentQ}
      />
    );
  }

  // Spørgsmål lukket og ikke stemt → vent
  if (!currentQ.is_open) return <WaitingScreen />;

  // Aktivt spørgsmål → vis valgknapper
  return (
    <ActiveScreen
      question={currentQ}
      qNum={qNum}
      submitting={submitting}
      onVote={handleVote}
    />
  );
}
