"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HostLanding() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function create() {
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fejl"); return; }
      router.push(`/host/${data.code}`);
    } catch {
      setError("Netværksfejl");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={p.page}>
      <div style={p.card}>
        <div style={p.brand}>
          <span style={p.dot} />
          <span style={p.name}>POLLINATOR</span>
        </div>
        <h1 style={p.h1}>Opret workshop</h1>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Navn på workshop…"
          style={p.input}
          autoFocus
        />
        {error && <div style={p.err}>{error}</div>}
        <button onClick={create} disabled={loading || !title.trim()} style={p.btn}>
          {loading ? "Opretter…" : "Opret session →"}
        </button>
      </div>
    </main>
  );
}

const p: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh", background: "var(--bg)", display: "flex",
    alignItems: "center", justifyContent: "center",
    fontFamily: '"Bahnschrift", var(--oswald,"Oswald"), "Segoe UI", system-ui, sans-serif',
  },
  card: {
    background: "var(--panel)", border: "1px solid var(--line)",
    borderRadius: 16, padding: "48px 52px", width: "min(480px, 92vw)",
    display: "flex", flexDirection: "column", gap: 20,
  },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  dot: {
    width: 11, height: 11, borderRadius: "50%", background: "var(--accent)",
    boxShadow: "0 0 0 4px color-mix(in oklch, var(--accent) 20%, transparent)",
  },
  name: { fontSize: 13, fontWeight: 600, letterSpacing: "0.28em", color: "var(--fg)" },
  h1: { fontSize: 32, fontWeight: 600, color: "var(--fg)", letterSpacing: "0.01em" },
  input: {
    background: "var(--bg-2)", border: "1.5px solid var(--line-2)",
    borderRadius: 10, padding: "14px 16px", fontSize: 18, color: "var(--fg)",
    fontFamily: "inherit", outline: "none", width: "100%",
  },
  btn: {
    background: "var(--accent)", color: "#13150e", border: "none",
    borderRadius: 10, padding: "14px 24px", fontSize: 16, fontWeight: 700,
    fontFamily: "inherit", letterSpacing: "0.04em", cursor: "pointer",
    opacity: 1, transition: "opacity 0.15s",
  },
  err: { color: "var(--c4)", fontSize: 14, letterSpacing: "0.04em" },
};
