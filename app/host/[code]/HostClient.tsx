"use client";

import { useCallback, useEffect, useState } from "react";
import s from "./host.module.css";

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

type Session = {
  id: string;
  code: string;
  title: string;
  state: "lobby" | "active" | "closed";
  current_question_id: string | null;
  questions: Question[];
};

/* ── Option colours (same order as participant + screen) ──── */

const OPT_COLORS = [
  "oklch(0.82 0.155 78)",
  "oklch(0.79 0.15 158)",
  "oklch(0.73 0.15 248)",
  "oklch(0.72 0.165 330)",
];

const DEFAULT_OPTIONS = ["Enig", "Uenig", "Ved ikke"];
const MAX_OPTIONS = 5;

const DURATION_OPTIONS = [
  { label: "Ingen timer", value: null },
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
];

/* ── Countdown hook ─────────────────────────────────────────── */

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

function CountdownBadge({ openedAt, durationSec }: { openedAt: string | null; durationSec: number | null }) {
  const remaining = useCountdown(openedAt, durationSec);
  if (remaining === null) return null;
  const expired = remaining === 0;
  return (
    <span className={`${s.badge} ${expired ? s.expired : s.timer}`}>
      {expired ? "UDLØBET" : `⏱ ${fmtTime(remaining)}`}
    </span>
  );
}

/* ── Helpers ────────────────────────────────────────────────── */

function sortedByPosition(qs: Question[]) {
  return [...qs].sort((a, b) => a.position - b.position);
}

/* ── Pill / badge ───────────────────────────────────────────── */

function StateBadge({ state }: { state: Session["state"] }) {
  const label = { lobby: "LOBBY", active: "AKTIV", closed: "LUKKET" }[state];
  return (
    <span className={`${s.stateBadge} ${s[state]}`}>{label}</span>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export default function HostClient({ code }: { code: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add-question form state
  const [qType, setQType] = useState<"dilemma" | "wordcloud">("dilemma");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  /* ── Polling ─────────────────────────────────────────────── */

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${code}`);
        if (!res.ok || !mounted) return;
        setSession(await res.json());
      } catch { /* silent */ }
    };
    poll();
    const id = setInterval(poll, 2500);
    return () => { mounted = false; clearInterval(id); };
  }, [code]);

  /* ── API helpers ─────────────────────────────────────────── */

  const patchSession = useCallback(async (body: Record<string, unknown>) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fejl"); return; }
      setSession((s) => s ? { ...s, ...data } : s);
    } catch {
      setError("Netværksfejl");
    } finally {
      setLoading(false);
    }
  }, [code]);

  const patchQuestion = useCallback(async (id: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fejl"); return; }
      // Opdater spørgsmålet lokalt
      setSession((s) =>
        s ? { ...s, questions: s.questions.map((q) => q.id === id ? { ...q, ...data } : q) } : s
      );
    } catch {
      setError("Netværksfejl");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Actions ─────────────────────────────────────────────── */

  const openQuestion = (q: Question) =>
    patchSession({ current_question_id: q.id, state: "active" });

  const closeQuestion = () => {
    if (!session?.current_question_id) return;
    patchQuestion(session.current_question_id, { is_open: false });
  };

  const nextQuestion = () => {
    if (!session) return;
    const sorted = sortedByPosition(session.questions);
    const idx = sorted.findIndex((q) => q.id === session.current_question_id);
    const next = sorted[idx + 1];
    if (next) patchSession({ current_question_id: next.id, state: "active" });
  };

  const setSessionState = (state: Session["state"]) =>
    patchSession({ state });

  /* ── Add question ────────────────────────────────────────── */

  async function addQuestion() {
    const trimmed = prompt.trim();
    const validOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmed) { setAddError("Prompt er påkrævet"); return; }
    if (validOpts.length < 2) { setAddError("Mindst 2 svarforslag"); return; }

    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch(`/api/sessions/${code}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, options: validOpts, duration_seconds: durationSec, type: qType }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Fejl"); return; }
      setSession((s) => s ? { ...s, questions: [...s.questions, data] } : s);
      setPrompt("");
      setOptions(DEFAULT_OPTIONS);
      setDurationSec(null);
      setQType("dilemma");
    } catch {
      setAddError("Netværksfejl");
    } finally {
      setAddLoading(false);
    }
  }

  /* ── Option editing ──────────────────────────────────────── */

  const setOpt = (i: number, val: string) =>
    setOptions((opts) => opts.map((o, j) => (j === i ? val : o)));

  const removeOpt = (i: number) =>
    setOptions((opts) => opts.filter((_, j) => j !== i));

  const addOpt = () =>
    setOptions((opts) => opts.length < MAX_OPTIONS ? [...opts, ""] : opts);

  /* ── Derived state ───────────────────────────────────────── */

  if (!session) {
    return (
      <div className={s.page} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--faint)", letterSpacing: "0.12em", fontSize: 15 }}>Forbinder…</span>
      </div>
    );
  }

  const sorted = sortedByPosition(session.questions);
  const currentQ = sorted.find((q) => q.id === session.current_question_id) ?? null;
  const currentIdx = sorted.findIndex((q) => q.id === session.current_question_id);
  const hasNext = currentIdx >= 0 && currentIdx < sorted.length - 1;
  const isOpen = currentQ?.is_open ?? false;

  return (
    <div className={s.page}>

      {/* ── Top bar ────────────────────────────────────────── */}
      <header className={s.topbar}>
        <div className={s.brand}>
          <span className={s.brandDot} />
          <span className={s.brandName}>POLLINATOR</span>
        </div>
        <span className={s.sep}>·</span>
        <span className={s.sessionCode}>{session.code}</span>
        <span className={s.sep}>·</span>
        <span className={s.sessionTitle}>{session.title}</span>
        <StateBadge state={session.state} />

        <div className={s.topLinks}>
          <a href={`/s/${code}`} target="_blank" rel="noopener" className={s.linkBtn}>
            Deltager ↗
          </a>
          <a href={`/screen/${code}`} target="_blank" rel="noopener" className={s.linkBtn}>
            Storskærm ↗
          </a>
        </div>
      </header>

      {error && <div style={{ padding: "12px 32px 0" }} className={s.error}>{error}</div>}

      <div className={s.main}>

        {/* ── Left: question list ──────────────────────────── */}
        <section className={s.left}>
          <div className={s.sectionHead}>
            <span className={s.sectionTitle}>Spørgsmål ({sorted.length})</span>
          </div>

          {sorted.length === 0 && (
            <p style={{ color: "var(--faint)", fontSize: 14, letterSpacing: "0.06em" }}>
              Ingen spørgsmål endnu — tilføj det første til højre.
            </p>
          )}

          <div className={s.qList}>
            {sorted.map((q, i) => {
              const isCurrent = q.id === session.current_question_id;
              const cardClass = [
                s.qCard,
                isCurrent ? s.current : "",
                isCurrent && !q.is_open ? s.closed : "",
              ].join(" ");

              const numClass = [
                s.qNum,
                isCurrent && q.is_open ? s.active : "",
                isCurrent && !q.is_open ? s.closedQ : "",
              ].join(" ");

              return (
                <div key={q.id} className={cardClass}>
                  <div className={numClass}>{i + 1}</div>

                  <div className={s.qBody}>
                    <div className={s.qPrompt}>{q.prompt}</div>
                    <div className={s.qOptions}>
                      {q.type === "wordcloud"
                        ? <span className={`${s.badge} ${s.shut}`} style={{ fontSize: 10 }}>ORDSKY</span>
                        : q.options.join(" · ")}
                    </div>
                    {isCurrent && (
                      <div className={s.qStatus}>
                        {q.is_open
                          ? <span className={`${s.badge} ${s.open}`}>ÅBEN FOR SVAR</span>
                          : <span className={`${s.badge} ${s.shut}`}>LUKKET</span>
                        }
                        {q.is_open && (
                          <CountdownBadge openedAt={q.opened_at} durationSec={q.duration_seconds} />
                        )}
                      </div>
                    )}
                  </div>

                  <div className={s.qActions}>
                    {!isCurrent && (
                      <button
                        className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`}
                        onClick={() => openQuestion(q)}
                        disabled={loading}
                      >
                        Åbn
                      </button>
                    )}
                    {isCurrent && q.is_open && (
                      <button
                        className={`${s.btn} ${s.btnDanger} ${s.btnSmall}`}
                        onClick={closeQuestion}
                        disabled={loading}
                      >
                        Luk
                      </button>
                    )}
                    {isCurrent && !q.is_open && hasNext && (
                      <button
                        className={`${s.btn} ${s.btnPrimary} ${s.btnSmall}`}
                        onClick={nextQuestion}
                        disabled={loading}
                      >
                        Næste →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Right: commands + add form ───────────────────── */}
        <aside className={s.right}>

          {/* Session-state-skifte */}
          <div className={s.commandBlock}>
            <div className={s.commandTitle}>Session-tilstand</div>
            <div className={s.stateRow}>
              {(["lobby", "active", "closed"] as const).map((st) => (
                <button
                  key={st}
                  className={`${s.stateBtn}${session.state === st ? ` ${s.on}` : ""}`}
                  onClick={() => setSessionState(st)}
                  disabled={loading || session.state === st}
                >
                  {st === "lobby" ? "Lobby" : st === "active" ? "Aktiv" : "Luk"}
                </button>
              ))}
            </div>
          </div>

          {/* Hurtighandlinger på aktivt spørgsmål */}
          {session.state === "active" && currentQ && (
            <div className={s.commandBlock}>
              <div className={s.commandTitle}>Aktivt spørgsmål</div>
              <div className={s.commandBtnRow}>
                {isOpen ? (
                  <button
                    className={`${s.btn} ${s.btnDanger}`}
                    onClick={closeQuestion}
                    disabled={loading}
                  >
                    Luk for svar
                  </button>
                ) : (
                  <button
                    className={`${s.btn} ${s.btnPrimary}`}
                    onClick={() => patchQuestion(currentQ.id, { is_open: true })}
                    disabled={loading}
                  >
                    Genåbn svar
                  </button>
                )}
                <button
                  className={`${s.btn} ${s.btnGhost}`}
                  onClick={nextQuestion}
                  disabled={loading || !hasNext}
                  title={!hasNext ? "Ingen flere spørgsmål" : undefined}
                >
                  Næste spørgsmål →
                </button>
              </div>
            </div>
          )}

          {/* Tilføj spørgsmål */}
          <div className={s.commandBlock}>
            <div className={s.commandTitle}>Tilføj spørgsmål</div>

            <div className={s.formBlock}>

              <div>
                <label className={s.label}>Type</label>
                <div className={s.stateRow}>
                  {(["dilemma", "wordcloud"] as const).map((t) => (
                    <button
                      key={t}
                      className={`${s.stateBtn}${qType === t ? ` ${s.on}` : ""}`}
                      onClick={() => setQType(t)}
                      type="button"
                    >
                      {t === "dilemma" ? "Dilemma" : "Ordsky"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={s.label}>Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Hvad er dit dilemma…"
                  className={s.input}
                  rows={3}
                />
              </div>

              {qType === "dilemma" && (
                <div>
                  <label className={s.label}>Svarforslag</label>
                  {options.map((opt, i) => (
                    <div key={i} className={s.optionRow} style={{ marginBottom: 8 }}>
                      <span
                        className={s.optionDot}
                        style={{ background: OPT_COLORS[i % OPT_COLORS.length] }}
                      />
                      <input
                        value={opt}
                        onChange={(e) => setOpt(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className={s.optInput}
                      />
                      {options.length > 2 && (
                        <button className={s.optRemove} onClick={() => removeOpt(i)} tabIndex={-1}>
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className={s.label}>Varighed</label>
                <select
                  value={durationSec ?? ""}
                  onChange={(e) => setDurationSec(e.target.value ? Number(e.target.value) : null)}
                  className={s.input}
                  style={{ resize: "none", cursor: "pointer" }}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value ?? "none"} value={opt.value ?? ""}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {addError && <div className={s.error}>{addError}</div>}

              <div className={s.formFooter}>
                {qType === "dilemma" && options.length < MAX_OPTIONS && (
                  <button className={s.addOptBtn} onClick={addOpt}>
                    + Tilføj option
                  </button>
                )}
                <button
                  className={`${s.btn} ${s.btnAccent}`}
                  onClick={addQuestion}
                  disabled={addLoading || !prompt.trim()}
                  style={{ marginLeft: "auto" }}
                >
                  {addLoading ? "Gemmer…" : "Tilføj spørgsmål"}
                </button>
              </div>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
