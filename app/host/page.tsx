"use client";

import { useState } from "react";

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
  state: "lobby" | "active" | "closed";
  current_question_id: string | null;
  questions: Question[];
};

export default function HostPage() {
  const [title, setTitle] = useState("Workshop test");
  const [session, setSession] = useState<Session | null>(null);
  const [newPrompt, setNewPrompt] = useState("Er AI en trussel mod demokratiet?");
  const [log, setLog] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function showLog(data: Record<string, unknown>) {
    setLog(data);
    setError(null);
  }

  async function run<T extends Record<string, unknown>>(fn: () => Promise<Response>): Promise<T | null> {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      const data: T = await res.json();
      showLog(data);
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
        return null;
      }
      return data;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function createSession() {
    const data = await run<Session>(() =>
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
    );
    if (data) setSession({ ...data, questions: [] });
  }

  async function refresh() {
    if (!session) return;
    const data = await run<Session>(() =>
      fetch(`/api/sessions/${session.code}`)
    );
    if (data) setSession(data);
  }

  async function addQuestion() {
    if (!session) return;
    const data = await run<Question>(() =>
      fetch(`/api/sessions/${session.code}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: newPrompt,
          options: ["Enig", "Uenig", "Ved ikke"],
        }),
      })
    );
    if (data) {
      setSession((s) => s ? { ...s, questions: [...s.questions, data] } : s);
      setNewPrompt("");
    }
  }

  async function patch(body: Record<string, unknown>) {
    if (!session) return;
    const data = await run<Session>(() =>
      fetch(`/api/sessions/${session.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
    if (data) setSession((s) => s ? { ...s, ...data } : s);
  }

  const isActive = (qid: string) => session?.current_question_id === qid;

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Pollinator – Host testside</h1>

      {/* ── Opret session ── */}
      {!session ? (
        <section style={styles.card}>
          <h2 style={styles.h2}>Opret session</h2>
          <div style={styles.row}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sessionstitel"
              style={styles.input}
            />
            <button onClick={createSession} disabled={loading} style={styles.btn}>
              Opret session
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* ── Session-header ── */}
          <section style={styles.card}>
            <div style={styles.row}>
              <div>
                <span style={styles.label}>Kode</span>
                <span style={styles.code}>{session.code}</span>
              </div>
              <div>
                <span style={styles.label}>Titel</span>
                <span>{session.title}</span>
              </div>
              <div>
                <span style={styles.label}>State</span>
                <span style={{ ...styles.badge, background: stateColor(session.state) }}>
                  {session.state}
                </span>
              </div>
            </div>

            {/* State-knapper */}
            <div style={{ ...styles.row, marginTop: "0.75rem" }}>
              {(["lobby", "active", "closed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => patch({ state: s })}
                  disabled={loading || session.state === s}
                  style={{
                    ...styles.btn,
                    background: session.state === s ? "#555" : styles.btn.background,
                  }}
                >
                  → {s}
                </button>
              ))}
              <button onClick={refresh} disabled={loading} style={{ ...styles.btn, background: "#444" }}>
                ↻ Refresh
              </button>
              <button
                onClick={() => setSession(null)}
                style={{ ...styles.btn, background: "#8a2a2a" }}
              >
                Ny session
              </button>
            </div>
          </section>

          {/* ── Tilføj spørgsmål ── */}
          <section style={styles.card}>
            <h2 style={styles.h2}>Tilføj spørgsmål</h2>
            <p style={styles.hint}>Options er altid: Enig / Uenig / Ved ikke</p>
            <div style={styles.row}>
              <input
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Spørgsmålstekst..."
                style={{ ...styles.input, flexGrow: 1 }}
                onKeyDown={(e) => e.key === "Enter" && addQuestion()}
              />
              <button onClick={addQuestion} disabled={loading || !newPrompt.trim()} style={styles.btn}>
                Tilføj
              </button>
            </div>
          </section>

          {/* ── Spørgsmålsliste ── */}
          {session.questions.length > 0 && (
            <section style={styles.card}>
              <h2 style={styles.h2}>Spørgsmål ({session.questions.length})</h2>
              <ul style={styles.list}>
                {session.questions.map((q, i) => (
                  <li
                    key={q.id}
                    style={{
                      ...styles.qItem,
                      borderColor: isActive(q.id) ? "#4caf50" : "#333",
                      background: isActive(q.id) ? "#0d1f0d" : "#1a1a1a",
                    }}
                  >
                    <span style={styles.qNum}>{i + 1}</span>
                    <span style={{ flex: 1 }}>{q.prompt}</span>
                    <button
                      onClick={() =>
                        patch({ current_question_id: q.id, state: "active" })
                      }
                      disabled={loading || isActive(q.id)}
                      style={{
                        ...styles.btn,
                        fontSize: "0.8rem",
                        padding: "0.3rem 0.7rem",
                        background: isActive(q.id) ? "#1a5c1a" : styles.btn.background,
                      }}
                    >
                      {isActive(q.id) ? "✓ Aktivt" : "▶ Aktiver"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* ── Fejl ── */}
      {error && (
        <div style={styles.error}>⚠ {error}</div>
      )}

      {/* ── JSON-log ── */}
      {log && (
        <section style={styles.card}>
          <h2 style={styles.h2}>Seneste API-svar</h2>
          <pre style={styles.pre}>{JSON.stringify(log, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}

function stateColor(state: string) {
  return state === "active" ? "#1a5c1a" : state === "closed" ? "#5c1a1a" : "#2a2a5c";
}

const styles = {
  page: {
    fontFamily: "'Courier New', monospace",
    padding: "2rem",
    maxWidth: "700px",
    margin: "0 auto",
    color: "#e0e0e0",
    background: "#0d0d0d",
    minHeight: "100vh",
  } satisfies React.CSSProperties,
  h1: { fontSize: "1.4rem", marginBottom: "1.5rem", color: "#fff" } satisfies React.CSSProperties,
  h2: { fontSize: "1rem", marginBottom: "0.75rem", color: "#aaa" } satisfies React.CSSProperties,
  card: {
    background: "#161616",
    border: "1px solid #2a2a2a",
    borderRadius: "6px",
    padding: "1.25rem",
    marginBottom: "1rem",
  } satisfies React.CSSProperties,
  row: { display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" as const } satisfies React.CSSProperties,
  input: {
    padding: "0.5rem 0.75rem",
    background: "#222",
    border: "1px solid #444",
    color: "#e0e0e0",
    borderRadius: "4px",
    fontSize: "0.9rem",
    minWidth: "240px",
  } satisfies React.CSSProperties,
  btn: {
    padding: "0.5rem 1rem",
    background: "#2a2a8a",
    color: "white",
    border: "none",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "0.9rem",
    whiteSpace: "nowrap" as const,
  } satisfies React.CSSProperties,
  label: {
    display: "block",
    fontSize: "0.7rem",
    color: "#666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "2px",
  } satisfies React.CSSProperties,
  code: {
    fontSize: "2rem",
    fontWeight: "bold" as const,
    letterSpacing: "0.25em",
    color: "#fff",
  } satisfies React.CSSProperties,
  badge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "4px",
    fontSize: "0.85rem",
  } satisfies React.CSSProperties,
  hint: { fontSize: "0.8rem", color: "#555", margin: "0 0 0.75rem" } satisfies React.CSSProperties,
  list: { listStyle: "none", padding: 0, margin: 0 } satisfies React.CSSProperties,
  qItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.6rem 0.75rem",
    border: "1px solid #333",
    borderRadius: "4px",
    marginBottom: "0.5rem",
  } satisfies React.CSSProperties,
  qNum: {
    fontSize: "0.8rem",
    color: "#555",
    minWidth: "1.2rem",
  } satisfies React.CSSProperties,
  error: {
    background: "#2d0a0a",
    border: "1px solid #8a2a2a",
    borderRadius: "4px",
    padding: "0.75rem 1rem",
    color: "#f87171",
    marginBottom: "1rem",
  } satisfies React.CSSProperties,
  pre: {
    background: "#0a0a0a",
    color: "#4ade80",
    padding: "1rem",
    overflow: "auto",
    fontSize: "0.78rem",
    borderRadius: "4px",
    margin: 0,
    maxHeight: "400px",
  } satisfies React.CSSProperties,
} as const;
