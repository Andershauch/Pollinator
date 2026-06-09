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
  type: "dilemma" | "wordcloud" | "scale";
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
const WORDS = "pollinator_words";

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

function loadWords(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(WORDS) ?? "{}"); } catch { return {}; }
}

function persistWord(qid: string, word: string) {
  const w = loadWords();
  if (!w[qid]) w[qid] = [];
  if (!w[qid].includes(word)) w[qid].push(word);
  localStorage.setItem(WORDS, JSON.stringify(w));
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

/* ── Screen: skala input ────────────────────────────────────── */

function ScaleInputScreen({
  question, qNum, submitting, onVote,
}: {
  question: Question; qNum: number; submitting: boolean; onVote: (idx: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const lowLabel = question.options[0] ?? "";
  const highLabel = question.options[1] ?? "";

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
      <div className={s.scaleArea}>
        <div className={s.scaleGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              className={`${s.scalePick}${selected === n ? ` ${s.scalePickOn}` : ""}`}
              onClick={() => setSelected(n)}
              disabled={submitting}
            >
              {n}
            </button>
          ))}
        </div>
        {(lowLabel || highLabel) && (
          <div className={s.scaleEndLabels}>
            <span>{lowLabel}</span>
            <span>{highLabel}</span>
          </div>
        )}
        <button
          className={s.scaleSubmit}
          onClick={() => selected !== null && onVote(selected)}
          disabled={selected === null || submitting}
        >
          {submitting ? "Sender…" : "Send svar"}
        </button>
      </div>
    </div>
  );
}

function ScaleSubmittedScreen({
  value, qNum, question,
}: {
  value: number; qNum: number; question: Question;
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
        <div className={s.scaleBigNum}>{value}</div>
        <div className={s.subLabel}>ud af 10</div>
      </div>
      <div className={s.foot}>
        <WaitingIndicator text="Venter på at spørgsmålet lukker" />
      </div>
    </div>
  );
}

/* ── Screen: ordsky input ───────────────────────────────────── */

function WordCloudInputScreen({
  question,
  qNum,
  submittedWords,
  onSubmitWord,
}: {
  question: Question;
  qNum: number;
  submittedWords: string[];
  onSubmitWord: (word: string) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    const word = input.trim().toLowerCase();
    if (!word) return;
    if (submittedWords.includes(word)) { setErr("Du har allerede sendt det ord"); return; }
    setBusy(true);
    setErr("");
    await onSubmitWord(word);
    setInput("");
    setBusy(false);
  };

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
      <div className={s.wordArea}>
        <div className={s.wordRow}>
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
            placeholder="Skriv et ord og tryk Enter…"
            className={s.wordInput}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button
            onClick={submit}
            disabled={busy || !input.trim()}
            className={`${s.wordBtn}`}
          >
            Send
          </button>
        </div>
        {err && <div className={s.wordErr}>{err}</div>}
        {submittedWords.length > 0 && (
          <div className={s.wordChips}>
            {submittedWords.map((w) => (
              <span key={w} className={s.wordChip}>{w}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export default function ParticipantClient({ code }: { code: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "notfound" | "ok">("loading");
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [submittedWords, setSubmittedWords] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  // Hent gemte stemmer + ord fra localStorage ved mount
  useEffect(() => {
    setVotes(loadVotes());
    setSubmittedWords(loadWords());
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

  const handleWordSubmit = useCallback(async (word: string) => {
    if (!session?.current_question_id) return;
    const qid = session.current_question_id;
    const res = await fetch(`/api/questions/${qid}/words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, participant_key: getParticipantKey() }),
    });
    if (res.ok || res.status === 409) {
      persistWord(qid, word);
      setSubmittedWords((prev) => ({
        ...prev,
        [qid]: [...(prev[qid] ?? []), ...(prev[qid]?.includes(word) ? [] : [word])],
      }));
    }
  }, [session]);

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

  // ── Ordsky-flow ────────────────────────────────────────────
  if (currentQ.type === "wordcloud") {
    if (!currentQ.is_open) return <WaitingScreen />;
    return (
      <WordCloudInputScreen
        question={currentQ}
        qNum={qNum}
        submittedWords={submittedWords[currentQ.id] ?? []}
        onSubmitWord={handleWordSubmit}
      />
    );
  }

  // ── Skala-flow ─────────────────────────────────────────────
  if (currentQ.type === "scale") {
    const scaleVote = votes[currentQ.id];
    if (scaleVote !== undefined) {
      return (
        <ScaleSubmittedScreen value={scaleVote} qNum={qNum} question={currentQ} />
      );
    }
    if (!currentQ.is_open) return <WaitingScreen />;
    return (
      <ScaleInputScreen
        question={currentQ}
        qNum={qNum}
        submitting={submitting}
        onVote={handleVote}
      />
    );
  }

  // ── Dilemma-flow ───────────────────────────────────────────
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
