'use client';

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { PARTS, type Part, type PartKey } from './parts';

const C = 500;
const PLATE_R = 262;
const DISC_R = 226;
const HUB_R = 58;
const LABEL_R = 142;
const KNOB_AT = 114;
const KNOB_R = 25;

const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (r: number, deg: number) => [C + r * Math.cos(rad(deg)), C + r * Math.sin(rad(deg))] as const;
const f = (n: number) => Math.round(n * 100) / 100;

function sector(r: number, a0: number, a1: number) {
  const [x0, y0] = pt(r, a0);
  const [x1, y1] = pt(r, a1);
  return `M ${C} ${C} L ${f(x0)} ${f(y0)} A ${r} ${r} 0 0 1 ${f(x1)} ${f(y1)} Z`;
}

function band(r1: number, r2: number, a0: number, a1: number) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [ox0, oy0] = pt(r2, a0);
  const [ox1, oy1] = pt(r2, a1);
  const [ix1, iy1] = pt(r1, a1);
  const [ix0, iy0] = pt(r1, a0);
  return `M ${f(ox0)} ${f(oy0)} A ${r2} ${r2} 0 ${large} 1 ${f(ox1)} ${f(oy1)} L ${f(ix1)} ${f(iy1)} A ${r1} ${r1} 0 ${large} 0 ${f(ix0)} ${f(iy0)} Z`;
}

/** The tab on a quadrant's clockwise edge, protruding into the next quadrant. */
function knob(part: Part) {
  const [cx, cy] = pt(KNOB_AT, part.to);
  const along = rad(part.to);
  const sx = cx - KNOB_R * Math.cos(along), sy = cy - KNOB_R * Math.sin(along);
  const ex = cx + KNOB_R * Math.cos(along), ey = cy + KNOB_R * Math.sin(along);
  // Half-circle seam on the neighbouring quadrant's side (sweep 0 = counter-clockwise on screen).
  return { cx: f(cx), cy: f(cy), seam: `M ${f(sx)} ${f(sy)} A ${KNOB_R} ${KNOB_R} 0 0 0 ${f(ex)} ${f(ey)}` };
}

// Outer ring segments: boundaries in degrees; hatched ones mark checked paths.
const RING = [-118, -58, 6, 66, 128, 204, 242];
const HATCHED = new Set([2, 5]);

const DEFAULT_CAPTION = {
  chip: 'How it works',
  title: 'Built on Univer Sheets',
  text: 'The workbook is a real, editable spreadsheet. ProofLine checks its totals separately, to the cent.',
  status: null as Part['status'] | null,
};

const DOCS = [
  { name: 'budget.csv', left: 2, top: 12, width: 15, r: -9, rows: 4 },
  { name: 'transactions.csv', left: 0, top: 43, width: 16, r: 6, rows: 5 },
  { name: 'receipt', left: 85, top: 45, width: 12.5, r: 9, rows: 3, receipt: true },
  { name: 'report', left: 63, top: 79, width: 16, r: -6, rows: 3, next: true },
];

function Icon({ k, color }: { k: PartKey; color: string }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (k === 'univer') return <g {...s}><rect x={-18} y={-14} width={36} height={28} rx={5} /><path d="M-18 -4H18M-6 -14V14M6 -14V14" /></g>;
  if (k === 'engine') return <g {...s}><circle r={17} /><path d="M5 -8a9 9 0 1 0 0 16M-1 -14V14" /></g>;
  if (k === 'you') return <g {...s}><circle r={17} /><path d="M-8 0l5 6l11 -12" /></g>;
  return <g {...s}><path d="M-17 -10H11M-17 0H17M-17 10H3" /><circle cx={12} cy={10} r={2.5} fill={color} stroke="none" /></g>;
}

export default function HeroArt() {
  const [active, setActive] = useState<PartKey | null>(null);
  const clayRef = useRef<HTMLDivElement>(null);
  const part = PARTS.find(p => p.key === active) ?? null;
  const caption = part ? { chip: DEFAULT_CAPTION.chip, title: part.name, text: part.text, status: part.status } : DEFAULT_CAPTION;

  const onTilt = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const el = clayRef.current;
    if (!el || event.pointerType === 'touch') return;
    const box = el.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - 0.5;
    const py = (event.clientY - box.top) / box.height - 0.5;
    el.style.setProperty('--ry', `${f(px * 18)}deg`);
    el.style.setProperty('--rx', `${f(-py * 14)}deg`);
  }, []);
  const onTiltEnd = useCallback(() => {
    clayRef.current?.style.setProperty('--ry', '0deg');
    clayRef.current?.style.setProperty('--rx', '0deg');
  }, []);

  const lineA = [pt(1900, 34), pt(1900, 214)];
  const lineB = [pt(1900, 111), pt(1900, 291)];

  return (
    <figure className="lp-art" data-active={active ?? 'none'} aria-label="ProofLine build artwork: a four-part proof wheel under a live spreadsheet card">
      <div className="lp-stage">
        <svg className="lp-svg" viewBox="0 0 1000 1000" aria-hidden="false">
          <defs>
            <pattern id="lp-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
              <line x1="0" y1="0" x2="0" y2="14" stroke="#fff" strokeWidth="2.2" opacity=".85" />
            </pattern>
            <filter id="lp-plate-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#0b1d6b" floodOpacity=".35" />
            </filter>
          </defs>

          <g className="lp-lines" aria-hidden="true">
            <line x1={f(lineA[0][0])} y1={f(lineA[0][1])} x2={f(lineA[1][0])} y2={f(lineA[1][1])} pathLength={1} />
            <line x1={f(lineB[0][0])} y1={f(lineB[0][1])} x2={f(lineB[1][0])} y2={f(lineB[1][1])} pathLength={1} />
          </g>

          <g className="lp-ring" aria-hidden="true">
            <circle cx={C} cy={C} r={292} pathLength={1} />
            {RING.map((a0, i) => {
              const a1 = i === RING.length - 1 ? RING[0] + 360 : RING[i + 1];
              return <path key={a0} d={band(304, 404, a0, a1)} className={HATCHED.has(i) ? 'is-hatched' : ''}
                style={{ '--i': i } as CSSProperties} />;
            })}
          </g>

          <circle className="lp-plate" cx={C} cy={C} r={PLATE_R} filter="url(#lp-plate-shadow)" />

          <g className="lp-disc">
            {PARTS.map((p, i) => {
              const mid = (p.from + p.to) / 2;
              const [lx, ly] = pt(LABEL_R, mid);
              const [dx, dy] = [Math.cos(rad(mid)) * 14, Math.sin(rad(mid)) * 14];
              return (
                <g key={p.key} className={`lp-q lp-q-${p.key}${active === p.key ? ' is-active' : ''}`}
                  style={{ '--dx': `${f(dx)}px`, '--dy': `${f(dy)}px`, '--i': i } as CSSProperties}
                  tabIndex={0} role="button" aria-label={`${p.name}: ${p.text}`} aria-pressed={active === p.key}
                  onPointerEnter={() => setActive(p.key)} onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(p.key)} onBlur={() => setActive(null)}
                  onClick={() => setActive(current => current === p.key ? null : p.key)}>
                  <path className="lp-q-face" d={sector(DISC_R, p.from, p.to)} fill={p.color} />
                  <g transform={`translate(${f(lx)} ${f(ly - 20)})`}><Icon k={p.key} color={p.ink} /></g>
                  <text x={f(lx)} y={f(ly + 30)} fill={p.ink} textAnchor="middle" className="lp-q-label">{p.label}</text>
                </g>
              );
            })}
            {PARTS.map(p => {
              const k = knob(p);
              return (
                <g key={`knob-${p.key}`} className={`lp-knob lp-q-${p.key}${active === p.key ? ' is-active' : ''}`} aria-hidden="true">
                  <circle cx={k.cx} cy={k.cy} r={KNOB_R} fill={p.color} />
                  <path d={k.seam} className="lp-knob-seam" />
                </g>
              );
            })}
          </g>

          <g className="lp-hub" aria-hidden="true">
            <circle cx={C} cy={C} r={HUB_R} />
            <path d="M478 497l15 15l30 -32" className="lp-hub-check" pathLength={1} />
            <text x={C} y={C + 37} textAnchor="middle">proof</text>
          </g>
        </svg>

        {DOCS.map((d, i) => (
          <div key={d.name} aria-hidden="true" className={`lp-doc${d.next ? ' is-next' : ''}${d.receipt ? ' is-receipt' : ''}`}
            style={{ left: `${d.left}%`, top: `${d.top}%`, width: `${d.width}%`, '--r': `${d.r}deg`, '--i': i } as CSSProperties}>
            <span className="lp-doc-name">{d.name}</span>
            {d.next && <span className="lp-doc-chart"><i /><i /><i /><i /></span>}
            {Array.from({ length: d.rows }, (_, row) => <span key={row} className="lp-doc-row" />)}
          </div>
        ))}

        <div className="lp-clay-wrap">
          <div className="lp-clay" ref={clayRef} onPointerMove={onTilt} onPointerLeave={onTiltEnd} aria-hidden="true">
            <div className="lp-clay-top">
              <span className="lp-pie" />
              <span className="lp-clay-lines"><i /><i /><i /></span>
            </div>
            <div className="lp-grid">
              {Array.from({ length: 20 }, (_, n) => {
                const row = Math.floor(n / 5), col = n % 5;
                const kind = row === 0 ? 'head' : (row === 2 && col === 2) || (row === 3 && col === 2) ? 'ok' : row === 3 && col === 4 ? 'flag' : '';
                return <span key={n} className={kind} style={{ '--n': n } as CSSProperties} />;
              })}
            </div>
          </div>
        </div>
      </div>

      <figcaption className="lp-glass" aria-live="polite">
        <div className="lp-glass-head">
          <span className="lp-chip">{caption.chip}</span>
          <span className="lp-glass-rule" />
        </div>
        <div className="lp-glass-body" key={caption.title}>
          <strong>{caption.title}</strong>
          <p>{caption.text}</p>
        </div>
        <span className="lp-glass-hint">Hover or tap a piece of the wheel</span>
      </figcaption>
    </figure>
  );
}
