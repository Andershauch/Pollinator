"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import s from "./page.module.css";

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
    <main className={s.page}>
      {/* ── Nav ─────────────────────────────────── */}
      <nav className={s.nav}>
        <div className={s.navBrand}>
          <span className={s.dot} />
          <span className={s.brandName}>POLLINATOR</span>
        </div>
        <div className={s.navLinks}>
          <Link href="/sessions" className={s.navLink}>Sessioner</Link>
          <Link href="/questions" className={s.navLink}>Spørgsmålsbank</Link>
          <Link href="/" className={s.navLink}>← Forside</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────── */}
      <section className={s.hero}>
        <div className={s.heroText}>
          <h1 className={s.h1}>
            Byg en live-workshop<br />
            <span className={s.h1Accent}>på under 2 minutter</span>
          </h1>
          <p className={s.sub}>
            Stil spørgsmål til dit publikum — se svarene rulle ind i realtid.
          </p>
        </div>

        {/* ── Create form ─────────────────────── */}
        <div className={s.formCard}>
          <div className={s.formLabel}>NAVN PÅ WORKSHOP</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && create()}
            placeholder="fx. Lederdagen 2026, Team kick-off…"
            className={s.input}
            autoFocus
          />
          {error && <div className={s.err}>{error}</div>}
          <button
            onClick={create}
            disabled={loading || !title.trim()}
            className={s.btn}
          >
            {loading ? "Opretter…" : "Opret workshop →"}
          </button>
          <div className={s.formHint}>
            Du får et 6-cifret kode som deltagere scanner eller taster ind.
          </div>
        </div>
      </section>

      {/* ── Feature tiles ───────────────────────── */}
      <section className={s.features}>
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
          <div key={f.title} className={s.tile}>
            <span className={s.tileIcon} style={{ color: f.color }}>{f.icon}</span>
            <div className={s.tileTitle}>{f.title}</div>
            <div className={s.tileDesc}>{f.desc}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
