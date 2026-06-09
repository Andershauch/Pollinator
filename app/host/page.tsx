"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      {/* ── Nav ─────────────────────────────────── */}
      <nav style={p.nav}>
        <div style={p.navBrand}>
          <span style={p.dot} />
          <span style={p.brandName}>POLLINATOR</span>
        </div>
        <div style={p.navLinks}>
          <Link href="/sessions" style={p.navLink}>Sessioner</Link>
          <Link href="/questions" style={p.navLink}>Spørgsmålsbank</Link>
          <Link href="/" style={p.navLink}>← Forside</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────── */}
      <section style={p.hero}>
        <div style={p.heroText}>
          <h1 style={p.h1}>
            Byg en live-workshop<br />
            <span style={p.h1Accent}>på under 2 minutter</span>
          </h1>
          <p style={p.sub}>
            Stil spørgsmål til dit publikum — se svarene rulle ind i realtid.
          </p>
        </div>

        {/* ── Create form ─────────────────────── */}
        <div style={p.formCard}>
          <div style={p.formLabel}>NAVN PÅ WORKSHOP</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && create()}
            placeholder="fx. Lederdagen 2026, Team kick-off…"
            style={p.input}
            autoFocus
          />
          {error && <div style={p.err}>{error}</div>}
          <button
            onClick={create}
            disabled={loading || !title.trim()}
            style={{ ...p.btn, opacity: loading || !title.trim() ? 0.45 : 1 }}
          >
            {loading ? "Opretter…" : "Opret workshop →"}
          </button>
          <div style={p.formHint}>
            Du får et 6-cifret kode som deltagere scanner eller taster ind.
          </div>
        </div>
      </section>

      {/* ── Feature tiles ───────────────────────── */}
      <section style={p.features}>
        {[
          {
            color: "var(--c2)",
            icon: "⚡",
            title: "Dilemma",
            desc: "2–5 svarmuligheder. Se hvem der er enige — og hvem der er uenige.",
          },
          {
            color: "var(--c3)",
            icon: "◎",
            title: "Skala 1–10",
            desc: "Slider-input. Mål intensitet og styrke — vis gennemsnit på storskærm.",
          },
          {
            color: "var(--c1)",
            icon: "☁",
            title: "Ordsky",
            desc: "Ét ord pr. deltager. De hyppigste vokser størst — live.",
          },
        ].map((f) => (
          <div key={f.title} style={p.tile}>
            <span style={{ ...p.tileIcon, color: f.color }}>{f.icon}</span>
            <div style={p.tileTitle}>{f.title}</div>
            <div style={p.tileDesc}>{f.desc}</div>
          </div>
        ))}
      </section>
    </main>
  );
}

const p: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "var(--bg)",
    color: "var(--fg)",
    fontFamily: '"Bahnschrift", var(--oswald,"Oswald"), "Segoe UI", system-ui, sans-serif',
    display: "flex",
    flexDirection: "column",
  },

  /* Nav */
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 32px",
    borderBottom: "1px solid var(--line)",
    flexWrap: "wrap",
    gap: 12,
  },
  navBrand: { display: "flex", alignItems: "center", gap: 10 },
  dot: {
    width: 10, height: 10, borderRadius: "50%",
    background: "var(--accent)",
    boxShadow: "0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent)",
    display: "inline-block",
  },
  brandName: { fontSize: 13, fontWeight: 600, letterSpacing: "0.28em", color: "var(--fg)" },
  navLinks: { display: "flex", gap: 6, flexWrap: "wrap" },
  navLink: {
    fontSize: 13, fontWeight: 500, letterSpacing: "0.1em",
    color: "var(--muted)", textDecoration: "none",
    background: "var(--panel)", border: "1px solid var(--line)",
    borderRadius: 8, padding: "7px 14px",
    transition: "border-color 0.15s, color 0.15s",
  },

  /* Hero */
  hero: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
    padding: "64px 24px 48px",
  },
  heroText: { textAlign: "center", maxWidth: 560 },
  h1: {
    fontSize: "clamp(30px, 5vw, 52px)",
    fontWeight: 700,
    lineHeight: 1.12,
    letterSpacing: "-0.01em",
    margin: "0 0 16px",
    color: "var(--fg)",
  },
  h1Accent: { color: "var(--accent)" },
  sub: {
    fontSize: "clamp(15px, 2vw, 18px)",
    fontWeight: 400,
    letterSpacing: "0.04em",
    color: "var(--muted)",
    margin: 0,
  },

  /* Form card */
  formCard: {
    width: "min(500px, 100%)",
    background: "var(--panel)",
    border: "1px solid var(--line-2)",
    borderRadius: 18,
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  formLabel: {
    fontSize: 11, fontWeight: 600, letterSpacing: "0.24em",
    color: "var(--faint)",
  },
  input: {
    background: "var(--bg-2)",
    border: "1.5px solid var(--line-2)",
    borderRadius: 12,
    padding: "16px 18px",
    fontSize: 18,
    color: "var(--fg)",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
  },
  btn: {
    background: "var(--accent)",
    color: "#13150e",
    border: "none",
    borderRadius: 12,
    padding: "16px 24px",
    fontSize: 17,
    fontWeight: 700,
    fontFamily: "inherit",
    letterSpacing: "0.04em",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  err: { color: "var(--c4)", fontSize: 13, letterSpacing: "0.04em" },
  formHint: {
    fontSize: 12, color: "var(--faint)", letterSpacing: "0.04em",
    lineHeight: 1.5, textAlign: "center",
  },

  /* Feature tiles */
  features: {
    display: "flex",
    gap: 16,
    padding: "0 24px 48px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  tile: {
    flex: "1 1 160px",
    maxWidth: 220,
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: 14,
    padding: "22px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  tileIcon: { fontSize: 22, lineHeight: 1 },
  tileTitle: { fontSize: 16, fontWeight: 600, color: "var(--fg)", letterSpacing: "0.02em" },
  tileDesc: { fontSize: 13, color: "var(--muted)", lineHeight: 1.5, letterSpacing: "0.02em" },
};
