import Link from "next/link";
import s from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.brand}>
          <span className={s.dot} />
          <span className={s.brandName}>POLLINATOR</span>
        </div>
        <h1 className={s.h1}>Side ikke fundet</h1>
        <p className={s.sub}>
          Siden findes ikke, eller også er linket forkert. Tjek koden og prøv igen.
        </p>
        <div className={s.ctas}>
          <Link href="/" className={s.btnPrimary}>Til forsiden →</Link>
        </div>
      </div>
    </main>
  );
}
