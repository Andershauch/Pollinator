import Link from "next/link";
import s from "./page.module.css";

export default function Home() {
  return (
    <main className={s.page}>
      <div className={s.hero}>
        <div className={s.brand}>
          <span className={s.dot} />
          <span className={s.brandName}>POLLINATOR</span>
        </div>
        <h1 className={s.h1}>Workshopfacilitator til dilemmaer og ordskyer</h1>
        <p className={s.sub}>
          Stil spørgsmål til gruppen og se svarene samle sig live på storskærmen.
        </p>
        <div className={s.ctas}>
          <Link href="/host" className={s.btnPrimary}>Opret ny workshop →</Link>
          <Link href="/sessions" className={s.btnGhost}>Tidligere sessioner</Link>
          <Link href="/questions" className={s.btnGhost}>Spørgsmålsbank</Link>
        </div>
      </div>
    </main>
  );
}
