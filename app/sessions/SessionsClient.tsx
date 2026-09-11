"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "./page.module.css";

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
    <button onClick={restart} disabled={loading} className={s.restartBtn}>
      {loading ? "…" : "Genstart ↗"}
    </button>
  );
}
