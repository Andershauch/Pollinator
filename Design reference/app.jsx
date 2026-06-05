const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
   CONTENT — edit these to change the workshop / question
   ============================================================ */
const WORKSHOP = {
  title: 'STRATEGIWORKSHOP 2026',
  subtitle: 'Produkt & Vækst · Hele dagen',
  url: 'join.pollinator.live',
  code: 'AB12',
  participants: 47,
};

const QUESTION = {
  index: '03',
  total: '08',
  text: 'Hvis vi kun må vinde på én ting i 2026 — hvad skal det så være?',
  // color is assigned by position here (kept consistent across all screens)
  options: [
    { id: 1, label: 'Brugeroplevelse', pct: 41 },
    { id: 2, label: 'Pålidelighed',    pct: 21 },
    { id: 3, label: 'Hastighed',       pct: 27 },
    { id: 4, label: 'Pris',            pct: 11 },
  ],
  responses: 112,
};

const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)'];

/* ============================================================
   QR placeholder — a stylised, finder-pattern-correct matrix.
   (Not a scannable code; swap for a real QR when you wire data.)
   ============================================================ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function buildQR(n, seed) {
  const m = Array.from({ length: n }, () => Array(n).fill(false));
  const rnd = mulberry32(seed);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) m[r][c] = rnd() > 0.52;
  const finder = (R, C) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = R + r, cc = C + c;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      let on = false;
      if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
        const border = (r === 0 || r === 6 || c === 0 || c === 6);
        const center = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        on = border || center;
      }
      m[rr][cc] = on;
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  for (let i = 8; i < n - 8; i++) { m[6][i] = i % 2 === 0; m[i][6] = i % 2 === 0; }
  const a = n - 9;
  for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
    const border = (Math.abs(r) === 2 || Math.abs(c) === 2);
    m[a + r][a + c] = border || (r === 0 && c === 0);
  }
  return m;
}
function QR({ n = 25, seed = 42 }) {
  const m = useMemo(() => buildQR(n, seed), [n, seed]);
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (m[r][c]) cells.push(<rect key={r + '-' + c} x={c} y={r} width="1.04" height="1.04" />);
  return (
    <svg className="qr-svg" viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-label="QR-kode">
      <g fill="#0c0d11">{cells}</g>
    </svg>
  );
}

/* ============================================================
   Small animation helpers
   ============================================================ */
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
function useCountUp(target, dur = 1200, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, t0;
    const tick = (t) => {
      if (!t0) t0 = t;
      const p = Math.min(1, Math.max(0, (t - t0 - delay) / dur));
      setV(easeOut(p) * target);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur, delay]);
  return v;
}

/* ============================================================
   Shared chrome
   ============================================================ */
function TopBar({ center, right }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-dot" />
        <span className="brand-name">POLLINATOR</span>
      </div>
      {center && <div className="topbar-center">{center}</div>}
      <div className="topbar-right">{right}</div>
    </header>
  );
}
const LiveTag = () => (
  <span className="live"><span className="live-dot" />LIVE</span>
);

/* ============================================================
   1 — LOBBY
   ============================================================ */
function Lobby() {
  const count = Math.round(useCountUp(WORKSHOP.participants, 1400, 200));
  return (
    <div className="screen lobby">
      <TopBar right={<LiveTag />} />
      <div className="lobby-title-wrap">
        <h1 className="lobby-title">{WORKSHOP.title}</h1>
        <div className="lobby-subtitle">{WORKSHOP.subtitle}</div>
      </div>

      <div className="lobby-main">
        <div className="lobby-kicker">SCAN OG DELTAG</div>
        <div className="qr-card"><QR n={25} seed={42} /></div>
        <div className="lobby-codeblock">
          <div className="lobby-codelabel">Deltagelseskode</div>
          <div className="lobby-code">{WORKSHOP.code}</div>
          <div className="lobby-url">{WORKSHOP.url}</div>
        </div>
      </div>

      <footer className="lobby-foot">
        <span className="counter">
          <span className="counter-dot" />
          <span className="counter-num">{count}</span> deltagere tilsluttet
        </span>
      </footer>
    </div>
  );
}

/* ============================================================
   2 — ACTIVE QUESTION
   ============================================================ */
function QuestionScreen() {
  return (
    <div className="screen question">
      <TopBar
        center={<span className="ws-name">{WORKSHOP.title}</span>}
        right={<span className="q-progress">SPØRGSMÅL {QUESTION.index} / {QUESTION.total}</span>}
      />
      <div className="q-body">
        <h1 className="q-text">{QUESTION.text}</h1>
        <div className="q-options">
          {QUESTION.options.map((o, i) => (
            <div className="opt" key={o.id}>
              <span className="opt-num" style={{ background: COLORS[i] }}>{o.id}</span>
              <span className="opt-label">{o.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="q-join">
        <div className="qr-card qr-card--sm"><QR n={25} seed={42} /></div>
        <div className="q-join-text">
          <div className="q-join-label">Kom stadig med</div>
          <div className="q-join-code">{WORKSHOP.code}</div>
          <div className="q-join-url">{WORKSHOP.url}</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   3 — RESULTS
   ============================================================ */
function Bar({ label, pct, color, grown, delay }) {
  const shown = Math.round(useCountUp(pct, 1100, delay));
  return (
    <div className="bar-row">
      <div className="bar-head">
        <span className="bar-dot" style={{ background: color }} />
        <span className="bar-label">{label}</span>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{
            width: grown ? pct + '%' : '0%',
            background: color,
            transitionDelay: delay + 'ms',
          }}
        />
        <span className="bar-pct" style={{ color }}>{shown}<span className="bar-pct-sign">%</span></span>
      </div>
    </div>
  );
}
function Results() {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  const data = useMemo(
    () => QUESTION.options
      .map((o, i) => ({ ...o, color: COLORS[i] }))
      .sort((a, b) => b.pct - a.pct),
    []
  );
  return (
    <div className="screen results">
      <TopBar
        center={<span className="ws-name">{WORKSHOP.title}</span>}
        right={<span className="q-progress">{QUESTION.responses} SVAR · <LiveTag /></span>}
      />
      <div className="res-q">
        <span className="res-q-index">SPØRGSMÅL {QUESTION.index}</span>
        <h2 className="res-q-text">{QUESTION.text}</h2>
      </div>
      <div className="bars">
        {data.map((d, i) => (
          <Bar key={d.id} label={d.label} pct={d.pct} color={d.color} grown={grown} delay={i * 130} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Stage scaler + app shell
   ============================================================ */
function Stage({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    const fit = () => {
      const s = Math.min(window.innerWidth / 1920, (window.innerHeight - 72) / 1080);
      if (ref.current) ref.current.style.transform = `scale(${s})`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return <div className="stage" ref={ref}>{children}</div>;
}

const ORDER = ['lobby', 'question', 'results'];
const LABELS = { lobby: 'Lobby', question: 'Spørgsmål', results: 'Resultater' };

function Controls({ screen, setScreen }) {
  const i = ORDER.indexOf(screen);
  const step = (d) => setScreen(ORDER[Math.max(0, Math.min(ORDER.length - 1, i + d))]);
  return (
    <div className="controls">
      <button className="ctl-arrow" onClick={() => step(-1)} disabled={i === 0} aria-label="Forrige">‹</button>
      <div className="seg">
        {ORDER.map((k) => (
          <button key={k} className={'seg-btn' + (k === screen ? ' on' : '')} onClick={() => setScreen(k)}>
            {LABELS[k]}
          </button>
        ))}
      </div>
      <button className="ctl-arrow" onClick={() => step(1)} disabled={i === ORDER.length - 1} aria-label="Næste">›</button>
      <span className="ctl-hint">← / →</span>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState(() => localStorage.getItem('ws-screen') || 'lobby');
  useEffect(() => { localStorage.setItem('ws-screen', screen); }, [screen]);
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        setScreen((s) => {
          const i = ORDER.indexOf(s) + (e.key === 'ArrowRight' ? 1 : -1);
          return ORDER[Math.max(0, Math.min(ORDER.length - 1, i))];
        });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <React.Fragment>
      <div className="stage-wrap">
        <Stage>
          {screen === 'lobby' && <Lobby key="lobby" />}
          {screen === 'question' && <QuestionScreen key="question" />}
          {screen === 'results' && <Results key="results" />}
        </Stage>
      </div>
      <Controls screen={screen} setScreen={setScreen} />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
