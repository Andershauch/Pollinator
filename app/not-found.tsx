import Link from "next/link";

export default function NotFound() {
  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.brand}>
          <span style={s.dot} />
          <span style={s.brandName}>POLLINATOR</span>
        </div>
        <h1 style={s.h1}>Side ikke fundet</h1>
        <p style={s.sub}>
          Siden findes ikke, eller også er linket forkert. Tjek koden og prøv igen.
        </p>
        <div style={s.ctas}>
          <Link href="/" style={s.btnPrimary}>Til forsiden →</Link>
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
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    maxWidth: 480,
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
    fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 600,
    color: "var(--fg)", letterSpacing: "0.01em", lineHeight: 1.2, margin: 0,
  },
  sub: {
    fontSize: 16, color: "var(--muted)", lineHeight: 1.55, margin: 0,
  },
  ctas: {
    display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4,
  },
  btnPrimary: {
    background: "var(--accent)", color: "#13150e",
    border: "none", borderRadius: 10,
    padding: "13px 26px", fontSize: 15, fontWeight: 700,
    fontFamily: "inherit", letterSpacing: "0.04em",
    textDecoration: "none", display: "inline-block",
  },
};
