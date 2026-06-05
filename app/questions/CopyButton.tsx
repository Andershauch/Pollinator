"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button onClick={copy} style={btn}>
      {copied ? "Kopieret ✓" : "Kopiér"}
    </button>
  );
}

const btn: React.CSSProperties = {
  background: "var(--bg-2)", color: "var(--muted)",
  border: "1.5px solid var(--line-2)", borderRadius: 8,
  padding: "7px 14px", fontSize: 12, fontWeight: 600,
  fontFamily: '"Bahnschrift", var(--oswald,"Oswald"), "Segoe UI", system-ui, sans-serif',
  letterSpacing: "0.08em", cursor: "pointer",
};
