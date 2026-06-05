"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SessionsClient({ code }: { code: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function restart() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${code}/clone`, { method: "POST" });
      const data = await res.json();
      if (res.ok) router.push(`/host/${data.code}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={restart} disabled={loading} style={btn}>
      {loading ? "…" : "Genstart ↗"}
    </button>
  );
}

const btn: React.CSSProperties = {
  background: "var(--c2)", color: "#0d1a0f",
  border: "none", borderRadius: 8,
  padding: "8px 16px", fontSize: 13, fontWeight: 700,
  fontFamily: '"Bahnschrift", var(--oswald,"Oswald"), "Segoe UI", system-ui, sans-serif',
  letterSpacing: "0.06em", cursor: "pointer",
};
