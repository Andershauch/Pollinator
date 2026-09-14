"use client";

import { useState } from "react";
import Link from "next/link";
import SessionsClient from "./SessionsClient";
import s from "./page.module.css";

type SessionRow = {
  id: string;
  code: string;
  title: string;
  created_at: string;
  state: "lobby" | "active" | "closed";
  question_count: number;
  response_count: number;
  types: string[];
};

export default function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? sessions.filter((sess) =>
        sess.title.toLowerCase().includes(q) || sess.code.toLowerCase().includes(q)
      )
    : sessions;

  return (
    <>
      {sessions.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg på titel eller kode…"
          className={s.search}
        />
      )}

      {filtered.length === 0 ? (
        <p className={s.empty}>
          {sessions.length === 0 ? "Ingen sessioner endnu." : "Ingen sessioner matcher søgningen."}
        </p>
      ) : (
        <div className={s.list}>
          {filtered.map((sess) => (
            <div key={sess.id} className={s.card}>
              <div className={s.cardMain}>
                <div className={s.cardTitle}>{sess.title}</div>
                <div className={s.cardMeta}>
                  <span className={`${s.stateBadge} ${sess.state === "active" ? s.stateActive : sess.state === "closed" ? s.stateClosed : s.stateLobby}`}>
                    {sess.state === "active" ? "AKTIV" : sess.state === "closed" ? "LUKKET" : "LOBBY"}
                  </span>
                  <span className={s.dot2} />
                  <span>{new Date(sess.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className={s.dot2} />
                  <span>{sess.question_count} spørgsmål</span>
                  <span className={s.dot2} />
                  <span>{sess.response_count} svar</span>
                  {sess.types.includes("wordcloud") && <span className={`${s.badge} ${s.badgeCloud}`}>ORDSKY</span>}
                  {sess.types.includes("dilemma") && <span className={`${s.badge} ${s.badgeDilemma}`}>DILEMMA</span>}
                  {sess.types.includes("scale") && <span className={`${s.badge} ${s.badgeScale}`}>SKALA</span>}
                  {sess.types.includes("text") && <span className={`${s.badge} ${s.badgeText}`}>FRITEKST</span>}
                  {sess.types.includes("ranking") && <span className={`${s.badge} ${s.badgeRanking}`}>RANGERING</span>}
                </div>
              </div>
              <div className={s.cardActions}>
                <Link href={`/report/${sess.code}`} className={s.btnSmallGhost}>Rapport</Link>
                <SessionsClient code={sess.code} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
