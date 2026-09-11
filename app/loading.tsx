export default function Loading() {
  return (
    <main style={s.page}>
      <div style={s.pulseWrap}>
        <span style={s.dot} />
        <span style={s.label}>Indlæser…</span>
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
  },
  pulseWrap: { display: "flex", alignItems: "center", gap: 12 },
  dot: {
    width: 11, height: 11, borderRadius: "50%",
    background: "var(--accent)",
    boxShadow: "0 0 0 4px color-mix(in oklch, var(--accent) 20%, transparent)",
    animation: "pollinator-pulse 1.1s ease-in-out infinite",
  },
  label: {
    fontSize: 13, fontWeight: 600, letterSpacing: "0.24em", color: "var(--muted)",
  },
};
