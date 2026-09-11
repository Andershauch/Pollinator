"use client";

import { useEffect } from "react";
import Link from "next/link";
import s from "./error.module.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.brand}>
          <span className={s.dot} />
          <span className={s.brandName}>POLLINATOR</span>
        </div>
        <h1 className={s.h1}>Der gik noget galt</h1>
        <p className={s.sub}>
          Siden stødte på en uventet fejl. Prøv igen, eller gå til forsiden.
        </p>
        <div className={s.ctas}>
          <button type="button" onClick={() => reset()} className={s.btnPrimary}>
            Prøv igen
          </button>
          <Link href="/" className={s.btnGhost}>Til forsiden</Link>
        </div>
      </div>
    </main>
  );
}
