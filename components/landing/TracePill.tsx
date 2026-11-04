'use client';

import { useEffect, useState } from 'react';

// Figures come from ProofLine's synthetic demo workbook (see data/).
const TRACES = [
  { q: 'Where does Logistics 890.00 come from?', a: 'T-003 + T-004' },
  { q: 'Where does total spend 2,135.00 come from?', a: '6 source rows' },
  { q: 'Why is Outreach flagged?', a: 'No budget line' },
];

export default function TracePill() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(TRACES[0].q);
  const [answered, setAnswered] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    const wait = (ms: number) => new Promise<void>(resolve => { timer = setTimeout(resolve, ms); });

    // Starts from the first trace already shown (server render), so nothing flashes on load.
    async function loop() {
      while (!cancelled) {
        await wait(3200); if (cancelled) return;
        setAnswered(false);
        await wait(240);
        const previous = TRACES[i].q;
        for (let n = previous.length; n >= 0 && !cancelled; n -= 2) { setTyped(previous.slice(0, n)); await wait(12); }
        i = (i + 1) % TRACES.length;
        setIndex(i);
        await wait(320);
        const { q } = TRACES[i];
        for (let n = 1; n <= q.length && !cancelled; n++) { setTyped(q.slice(0, n)); await wait(34); }
        await wait(260); if (cancelled) return;
        setAnswered(true);
      }
    }
    void loop();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  return (
    <div className="lp-trace" role="img" aria-label="Example: ProofLine traces Logistics 890.00 to transactions T-003 and T-004">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L20 20" /></svg>
      <span className="lp-trace-text" aria-hidden="true">{typed}<i className="lp-caret" /></span>
      <span className={`lp-trace-answer${answered ? ' is-on' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6 12.5l4 4l8 -9" /></svg>
        {TRACES[index].a}
      </span>
    </div>
  );
}
