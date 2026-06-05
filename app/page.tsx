import Link from "next/link";

export default function Home() {
  return (
    <main style={s.page}>
      <div style={s.hero}>
        <div style={s.brand}>
          <span style={s.dot} />
          <span style={s.brandName}>POLLINATOR</span>
        </div>
        <h1 style={s.h1}>Workshopfacilitator til dilemmaer og ordskyer</h1>
        <p style={s.sub}>
          Stil spørgsmål til gruppen og se svarene samle sig live på storskærmen.
        </p>
        <div style={s.ctas}>
          <Link href="/host" style={s.btnPrimary}>Opret ny workshop →</Link>
          <Link href="/sessions" style={s.btnGhost}>Tidligere sessioner</Link>
          <Link href="/questions" style={s.btnGhost}>Spørgsmålsbank</Link>
        </div>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "var(--bg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: '"Bahnschrift", var(--oswald,"Oswald"), "Segoe UI", system-ui, sans-serif',
    padding: "40px 24px",
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    maxWidth: 560,
    width: "100%",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  dot: {
    width: 11, height: 11, borderRadius: "50%",
    background: "var(--accent)",
    boxShadow: "0 0 0 4px color-mix(in oklch, var(--accent) 20%, transparent)",
  },
  brandName: {
    fontSize: 13, fontWeight: 600, letterSpacing: "0.28em", color: "var(--fg)",
  },
  h1: {
    fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 600,
    color: "var(--fg)", letterSpacing: "0.01em", lineHeight: 1.15, margin: 0,
  },
  sub: {
    fontSize: 18, color: "var(--muted)", lineHeight: 1.55, margin: 0,
  },
  ctas: {
    display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8,
  },
  btnPrimary: {
    background: "var(--accent)", color: "#13150e",
    border: "none", borderRadius: 10,
    padding: "14px 28px", fontSize: 16, fontWeight: 700,
    fontFamily: "inherit", letterSpacing: "0.04em",
    textDecoration: "none", display: "inline-block",
  },
  btnGhost: {
    background: "var(--panel)", color: "var(--muted)",
    border: "1.5px solid var(--line-2)", borderRadius: 10,
    padding: "13px 24px", fontSize: 15, fontWeight: 600,
    fontFamily: "inherit", letterSpacing: "0.04em",
    textDecoration: "none", display: "inline-block",
  },
};
