"use client";

import { useCallback, useEffect, useState } from "react";
import s from "./host.module.css";

/* ── Types ─────────────────────────────────────────────────── */

type BankQuestion = {
  prompt: string;
  type: "dilemma" | "wordcloud" | "scale";
  options: string[];
  times_used: number;
};

type SessionSummary = {
  id: string;
  code: string;
  title: string;
  created_at: string;
  question_count: number;
};

type SessionQuestion = {
  id: string;
  prompt: string;
  type: "dilemma" | "wordcloud" | "scale";
  options: string[];
  position: number;
};

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
  const [qType, setQType] = useState<"dilemma" | "wordcloud" | "scale">("dilemma");
  const [scaleLowLabel, setScaleLowLabel] = useState("Slet ikke");
  const [scaleHighLabel, setScaleHighLabel] = useState("Fuldstændig");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Spørgsmålsbank
  const [bankOpen, setBankOpen] = useState(false);
  const [bankTab, setBankTab] = useState<"questions" | "sessions">("questions");
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  // Sessions-tab
  const [sessionList, setSessionList] = useState<SessionSummary[]>([]);
  const [sessionListLoading, setSessionListLoading] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [expandedQs, setExpandedQs] = useState<Record<string, SessionQuestion[]>>({});
  const [expandedLoading, setExpandedLoading] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

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

  /* ── Bank ────────────────────────────────────────────────── */

  async function openBank() {
    setBankOpen(true);
    setBankTab("questions");
    if (bank.length > 0) return;
    setBankLoading(true);
    try {
      const res = await fetch("/api/questions/bank");
      if (res.ok) setBank(await res.json());
    } finally {
      setBankLoading(false);
    }
  }

  function switchBankTab(tab: "questions" | "sessions") {
    setBankTab(tab);
    if (tab === "sessions") loadSessionList();
  }

  function applyFromBank(q: BankQuestion | SessionQuestion) {
    setQType(q.type);
    setPrompt(q.prompt);
    if (q.type === "dilemma") {
      setOptions(q.options.length >= 2 ? q.options : DEFAULT_OPTIONS);
    } else if (q.type === "scale") {
      setScaleLowLabel(q.options[0] ?? "Slet ikke");
      setScaleHighLabel(q.options[1] ?? "Fuldstændig");
    }
    setBankOpen(false);
    setTimeout(() => {
      document.getElementById("addForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function loadSessionList() {
    if (sessionList.length > 0) return;
    setSessionListLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data: SessionSummary[] = await res.json();
        // Filtrer den aktuelle session fra
        setSessionList(data.filter((s) => s.code !== code.toUpperCase()));
      }
    } finally {
      setSessionListLoading(false);
    }
  }

  async function toggleSession(sessionCode: string) {
    if (expandedCode === sessionCode) {
      setExpandedCode(null);
      return;
    }
    setExpandedCode(sessionCode);
    if (expandedQs[sessionCode]) return; // allerede hentet
    setExpandedLoading(sessionCode);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedQs((prev) => ({ ...prev, [sessionCode]: data.questions ?? [] }));
      }
    } finally {
      setExpandedLoading(null);
    }
  }

  async function importSingleQuestion(q: SessionQuestion) {
    const bodyOptions = q.type === "dilemma" ? q.options
      : q.type === "scale" ? q.options.slice(0, 2)
      : [];
    await fetch(`/api/sessions/${code}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: q.prompt, options: bodyOptions, type: q.type }),
    });
    // Opdater session lokalt (polling vil også fange det)
  }

  async function importAllFromSession(sessionCode: string) {
    const qs = expandedQs[sessionCode];
    if (!qs?.length) return;
    setImporting(true);
    try {
      await Promise.all(qs.map((q) => importSingleQuestion(q)));
      // Tving en session-genindlæsning
      const res = await fetch(`/api/sessions/${code}`);
      if (res.ok) setSession(await res.json());
      setBankOpen(false);
    } finally {
      setImporting(false);
    }
  }

  async function importOne(q: SessionQuestion) {
    setImporting(true);
    try {
      await importSingleQuestion(q);
      const res = await fetch(`/api/sessions/${code}`);
      if (res.ok) setSession(await res.json());
    } finally {
      setImporting(false);
    }
  }

  /* ── Add question ────────────────────────────────────────── */

  async function addQuestion() {
    const trimmed = prompt.trim();
    if (!trimmed) { setAddError("Prompt er påkrævet"); return; }

    let bodyOptions: string[] = [];
    if (qType === "dilemma") {
      const validOpts = options.map((o) => o.trim()).filter(Boolean);
      if (validOpts.length < 2) { setAddError("Mindst 2 svarforslag"); return; }
      bodyOptions = validOpts;
    } else if (qType === "scale") {
      bodyOptions = [scaleLowLabel.trim() || "Slet ikke", scaleHighLabel.trim() || "Fuldstændig"];
    }

    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch(`/api/sessions/${code}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, options: bodyOptions, duration_seconds: durationSec, type: qType }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Fejl"); return; }
      setSession((s) => s ? { ...s, questions: [...s.questions, data] } : s);
      setPrompt("");
      setOptions(DEFAULT_OPTIONS);
      setDurationSec(null);
      setQType("dilemma");
      setScaleLowLabel("Slet ikke");
      setScaleHighLabel("Fuldstændig");
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
          <a href={`/report/${code}`} target="_blank" rel="noopener" className={s.linkBtn}>
            Rapport ↗
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
                        : q.type === "scale"
                        ? <span className={`${s.badge} ${s.shut}`} style={{ fontSize: 10 }}>SKALA 1–10</span>
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
          <div className={s.commandBlock} id="addForm">
            <div className={s.commandTitleRow}>
              <span className={s.commandTitle}>Tilføj spørgsmål</span>
              <button className={s.bankTrigger} onClick={openBank} type="button">
                Fra bank ↑
              </button>
            </div>

            <div className={s.formBlock}>

              <div>
                <label className={s.label}>Type</label>
                <div className={s.stateRow}>
                  {(["dilemma", "scale", "wordcloud"] as const).map((t) => (
                    <button
                      key={t}
                      className={`${s.stateBtn}${qType === t ? ` ${s.on}` : ""}`}
                      onClick={() => setQType(t)}
                      type="button"
                    >
                      {t === "dilemma" ? "Dilemma" : t === "scale" ? "Skala" : "Ordsky"}
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

              {qType === "scale" && (
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label className={s.label}>Lav ende (1)</label>
                    <input value={scaleLowLabel} onChange={(e) => setScaleLowLabel(e.target.value)}
                      placeholder="Slet ikke" className={s.optInput} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className={s.label}>Høj ende (10)</label>
                    <input value={scaleHighLabel} onChange={(e) => setScaleHighLabel(e.target.value)}
                      placeholder="Fuldstændig" className={s.optInput} />
                  </div>
                </div>
              )}

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

      {/* ── Sticky mobile action bar ──────────────────────── */}
      <div className={s.stickyBar}>
        <div className={s.stickyInfo}>
          {session.state !== "active" && (
            <span className={s.stickyHint}>Session er ikke aktiv</span>
          )}
          {session.state === "active" && !currentQ && (
            <span className={s.stickyHint}>Klar — åbn første spørgsmål</span>
          )}
          {session.state === "active" && currentQ && (
            <>
              <span className={s.stickyNum}>{currentIdx + 1}</span>
              <span className={s.stickyPromptText}>{currentQ.prompt}</span>
            </>
          )}
        </div>
        <div className={s.stickyActions}>
          {session.state !== "active" && (
            <button
              className={`${s.btn} ${s.btnPrimary} ${s.stickyBtn}`}
              onClick={() => setSessionState("active")}
              disabled={loading || sorted.length === 0}
            >
              Start session
            </button>
          )}
          {session.state === "active" && !currentQ && sorted.length > 0 && (
            <button
              className={`${s.btn} ${s.btnPrimary} ${s.stickyBtn}`}
              onClick={() => openQuestion(sorted[0])}
              disabled={loading}
            >
              Åbn første →
            </button>
          )}
          {session.state === "active" && currentQ?.is_open && (
            <button
              className={`${s.btn} ${s.btnDanger} ${s.stickyBtn}`}
              onClick={closeQuestion}
              disabled={loading}
            >
              Luk svar ■
            </button>
          )}
          {session.state === "active" && currentQ && !currentQ.is_open && (
            <button
              className={`${s.btn} ${s.btnPrimary} ${s.stickyBtn}`}
              onClick={hasNext ? nextQuestion : undefined}
              disabled={loading || !hasNext}
            >
              {hasNext ? "Næste →" : "Færdig ✓"}
            </button>
          )}
        </div>
      </div>

      {/* ── Bank drawer ───────────────────────────────────── */}
      {bankOpen && (
        <div className={s.bankOverlay} onClick={() => setBankOpen(false)}>
          <div className={s.bankDrawer} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className={s.bankHead}>
              <div className={s.bankTabs}>
                <button
                  className={`${s.bankTab}${bankTab === "questions" ? ` ${s.bankTabOn}` : ""}`}
                  onClick={() => switchBankTab("questions")}
                >
                  Spørgsmål
                </button>
                <button
                  className={`${s.bankTab}${bankTab === "sessions" ? ` ${s.bankTabOn}` : ""}`}
                  onClick={() => switchBankTab("sessions")}
                >
                  Workshops
                </button>
              </div>
              <button className={s.bankClose} onClick={() => setBankOpen(false)}>×</button>
            </div>

            {/* ── Tab: individuelle spørgsmål ── */}
            {bankTab === "questions" && (
              <div className={s.bankList}>
                {bankLoading && <div className={s.bankEmpty}>Henter…</div>}
                {!bankLoading && bank.length === 0 && (
                  <div className={s.bankEmpty}>Ingen tidligere spørgsmål endnu.</div>
                )}
                {bank.map((q, i) => (
                  <button key={i} className={s.bankItem} onClick={() => applyFromBank(q)}>
                    <span className={`${s.bankBadge} ${s[`bankBadge_${q.type}`]}`}>
                      {q.type === "wordcloud" ? "ORDSKY" : q.type === "scale" ? "SKALA" : "DILEMMA"}
                    </span>
                    <span className={s.bankPrompt}>{q.prompt}</span>
                    <span className={s.bankUsed}>{q.times_used}×</span>
                  </button>
                ))}
              </div>
            )}

            {/* ── Tab: workshops ── */}
            {bankTab === "sessions" && (
              <div className={s.bankList}>
                {sessionListLoading && <div className={s.bankEmpty}>Henter workshops…</div>}
                {!sessionListLoading && sessionList.length === 0 && (
                  <div className={s.bankEmpty}>Ingen tidligere workshops endnu.</div>
                )}
                {sessionList.map((sess) => {
                  const isOpen = expandedCode === sess.code;
                  const qs = expandedQs[sess.code];
                  const isLoading = expandedLoading === sess.code;
                  return (
                    <div key={sess.code} className={s.sessItem}>
                      {/* Session header row */}
                      <button
                        className={s.sessRow}
                        onClick={() => toggleSession(sess.code)}
                      >
                        <span className={s.sessChevron}>{isOpen ? "▾" : "▸"}</span>
                        <span className={s.sessTitle}>{sess.title}</span>
                        <span className={s.sessMeta}>
                          {new Date(sess.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}
                          {" · "}{sess.question_count} spørgsmål
                        </span>
                      </button>

                      {/* Expanded questions */}
                      {isOpen && (
                        <div className={s.sessQList}>
                          {isLoading && <div className={s.sessQLoading}>Henter…</div>}
                          {!isLoading && qs?.length === 0 && (
                            <div className={s.sessQLoading}>Ingen spørgsmål i denne session.</div>
                          )}
                          {!isLoading && qs && qs.length > 0 && (
                            <>
                              <div className={s.sessQActions}>
                                <button
                                  className={s.sessAddAll}
                                  onClick={() => importAllFromSession(sess.code)}
                                  disabled={importing}
                                >
                                  {importing ? "Importerer…" : `Tilføj alle ${qs.length} →`}
                                </button>
                              </div>
                              {[...qs].sort((a, b) => a.position - b.position).map((q) => (
                                <div key={q.id} className={s.sessQ}>
                                  <span className={`${s.bankBadge} ${s[`bankBadge_${q.type}`]}`}>
                                    {q.type === "wordcloud" ? "ORDSKY" : q.type === "scale" ? "SKALA" : "DILEMMA"}
                                  </span>
                                  <span className={s.bankPrompt}>{q.prompt}</span>
                                  <button
                                    className={s.sessAddOne}
                                    onClick={() => importOne(q)}
                                    disabled={importing}
                                    title="Tilføj dette spørgsmål"
                                  >
                                    +
                                  </button>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
