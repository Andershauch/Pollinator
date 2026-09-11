"use client";

import { useState } from "react";
import s from "./page.module.css";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button onClick={copy} className={s.copyBtn}>
      {copied ? "Kopieret ✓" : "Kopiér"}
    </button>
  );
}
