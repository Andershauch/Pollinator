const { useState } = React;

/* ============================================================
   Shared content — identical to the big-screen tokens so a
   participant looking up at the screen and down at their phone
   sees one tool. Edit here to change workshop / question.
   ============================================================ */
const WORKSHOP = {
  title: 'STRATEGIWORKSHOP 2026',
  code: 'AB12',
};
const QUESTION = {
  index: '03',
  total: '08',
  text: 'Hvis vi kun må vinde på én ting i 2026 — hvad skal det så være?',
  options: [
    { id: 1, label: 'Brugeroplevelse' },
    { id: 2, label: 'Pålidelighed' },
    { id: 3, label: 'Hastighed' },
    { id: 4, label: 'Pris' },
  ],
};
const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)'];

/* ============================================================
   Small shared pieces
   ============================================================ */
function Brand() {
  return (
    <div className="pbrand">
      <span className="pbrand-dot" />
      <span className="pbrand-name">POLLINATOR</span>
    </div>
  );
}
function TopBar({ right }) {
  return (
    <div className="ptop">
      <Brand />
      <div className="ptop-right">{right}</div>
    </div>
  );
}
const Dots = () => <div className="dots"><i /><i /><i /></div>;
function Waiting({ text }) {
  return (
    <div className="waiting">
      <Dots />
      <div className="waiting-text">{text}</div>
    </div>
  );
}

/* ============================================================
   1 — TILSLUTNING / LOBBY  ("Du er med")
   ============================================================ */
function Connected() {
  return (
    <div className="pscreen">
      <TopBar right={<span className="status-ok"><span className="status-dot" />FORBUNDET</span>} />
      <div className="pmain center">
        <div className="check-ring"><span className="check" /></div>
        <div className="big-confirm">DU ER MED</div>
        <div className="ws-sub">{WORKSHOP.title}</div>
      </div>
      <div className="pfoot">
        <Waiting text="Venter på første spørgsmål" />
      </div>
    </div>
  );
}

/* ============================================================
   3 — SVAR AFGIVET  (also shown after a tap in state 2)
   ============================================================ */
function Submitted({ choiceIndex, onReset }) {
  const o = QUESTION.options[choiceIndex];
  return (
    <div className="pscreen">
      <TopBar right={<span className="ptag">SPØRGSMÅL {QUESTION.index}/{QUESTION.total}</span>} />
      <div className="pmain center">
        <div className="check-ring sm"><span className="check" /></div>
        <div className="submitted-label">DU SVAREDE</div>
        <div className="chosen">
          <span className="popt-num" style={{ background: COLORS[choiceIndex] }}>{o.id}</span>
          <span className="chosen-label">{o.label}</span>
        </div>
      </div>
      <div className="pfoot">
        <Waiting text="Venter på at spørgsmålet lukker" />
        {onReset && <button className="reset" onClick={onReset}>↺ Prøv igen</button>}
      </div>
    </div>
  );
}

/* ============================================================
   2 — AKTIVT SPØRGSMÅL  (interactive — tap to answer)
   ============================================================ */
function Active() {
  const [chosen, setChosen] = useState(null);
  if (chosen !== null) return <Submitted choiceIndex={chosen} onReset={() => setChosen(null)} />;
  return (
    <div className="pscreen">
      <TopBar right={<span className="ptag">SPØRGSMÅL {QUESTION.index}/{QUESTION.total}</span>} />
      <div className="q-head"><h1 className="pq">{QUESTION.text}</h1></div>
      <div className="popts">
        {QUESTION.options.map((o, i) => (
          <button className="popt" key={o.id} onClick={() => setChosen(i)}>
            <span className="popt-num" style={{ background: COLORS[i] }}>{o.id}</span>
            <span className="popt-label">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   4 — LUKKET / VENTER
   ============================================================ */
function Closed() {
  return (
    <div className="pscreen">
      <TopBar right={<span className="ptag muted">LUKKET</span>} />
      <div className="pmain center">
        <div className="pause-ring"><span className="pause"><i /><i /></span></div>
        <div className="big-confirm dim">VENT ET ØJEBLIK</div>
        <div className="ws-sub">Spørgsmålet er lukket</div>
      </div>
      <div className="pfoot">
        <Waiting text="Næste spørgsmål kommer snart" />
      </div>
    </div>
  );
}

/* ============================================================
   Gallery — all four states side by side
   ============================================================ */
const FRAMES = [
  { label: '1 · Tilslutning', node: <Connected /> },
  { label: '2 · Aktivt spørgsmål', node: <Active /> },
  { label: '3 · Svar afgivet', node: <Submitted choiceIndex={0} /> },
  { label: '4 · Lukket / venter', node: <Closed /> },
];

function App() {
  return (
    <div className="gallery">
      <header className="gh">
        <div className="gh-kicker">POLLINATOR · DELTAGER-VIEW</div>
        <h1 className="gh-title">Mobil — det deltagerne ser</h1>
        <p className="gh-sub">
          Åbnes på telefonen efter scanning af QR-koden på storskærmen. Samme farveskala,
          font og nummerering, så skærm og telefon opleves som ét værktøj. Tryk på et svar
          i ramme 2 for at se interaktionen.
        </p>
      </header>
      <div className="frames">
        {FRAMES.map((f, i) => (
          <div className="frame-col" key={i}>
            <div className="frame-label">{f.label}</div>
            <IOSDevice dark width={358} height={775}>{f.node}</IOSDevice>
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
