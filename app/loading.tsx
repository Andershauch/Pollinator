import s from "./loading.module.css";

export default function Loading() {
  return (
    <main className={s.page}>
      <div className={s.pulseWrap}>
        <span className={s.dot} />
        <span className={s.label}>Indlæser…</span>
      </div>
    </main>
  );
}
