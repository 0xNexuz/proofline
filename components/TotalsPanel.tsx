'use client';

import { money } from '@/lib/finance';
import type { VerificationState } from '@/lib/verification';

/** Verified totals with one budget bar per category. Clicking a category opens its claim. */
export default function TotalsPanel({ verification, onFocusClaim, onLoadSample }: {
  verification: VerificationState;
  onFocusClaim: (claimId: string) => void;
  onLoadSample: () => void;
}) {
  const current = verification.current;
  return (
    <section className="ws-card totals-card" aria-label="Verified totals">
      <div className="ws-card-head">
        <h2>Verified totals</h2>
        {verification.phase === 'verified' && <span className="ws-dot-label ok">Checked to the cent</span>}
      </div>

      {verification.phase === 'idle' && <div className="totals-empty">
        <p>No workbook yet. Totals appear here once the cent engine has checked the source rows.</p>
        <button type="button" className="primary" onClick={onLoadSample}>Load the sample budget</button>
      </div>}

      {(verification.phase === 'stale' || verification.phase === 'invalid') && <div className={`totals-hold ${verification.phase}`} role="status">
        <strong>{verification.phase === 'stale' ? 'Re-checking…' : 'Totals on hold'}</strong>
        <span>{verification.phase === 'stale'
          ? 'The workbook changed. Totals come back once the source rows pass the check.'
          : `${verification.error ?? 'The workbook needs repair.'} Fix the highlighted rows, or import the CSVs again.`}</span>
      </div>}

      {current && <>
        <dl className="totals-stats">
          <div><dt>Budget</dt><dd>{money(current.budgetTotalCents)}</dd></div>
          <div><dt>Actual</dt><dd>{money(current.actualTotalCents)}</dd></div>
          <div><dt>Needs attention</dt><dd>{current.exceptionCount} {current.exceptionCount === 1 ? 'category' : 'categories'}</dd></div>
          <div><dt>Transactions</dt><dd>{current.transactions.length}</dd></div>
        </dl>
        <ul className="totals-cats">
          {current.summaries.map(summary => {
            const ratio = summary.budgetCents > 0 ? summary.actualCents / summary.budgetCents : 1;
            const state = summary.status === 'within budget' ? 'ok' : summary.status === 'unbudgeted' ? 'none' : 'over';
            const note = state === 'ok' ? `${money(-summary.varianceCents)} left`
              : state === 'over' ? `Over by ${money(summary.varianceCents)}` : 'No budget line';
            return (
              <li key={summary.category}>
                <button type="button" onClick={() => onFocusClaim(`category:${summary.category.toLowerCase()}:actual`)}
                  aria-label={`${summary.category}: ${money(summary.actualCents)} of ${money(summary.budgetCents)}, ${note}. Open claim.`}>
                  <span className="cat-row">
                    <strong>{summary.category}</strong>
                    <span className="cat-figs">{money(summary.actualCents)} <small>of {money(summary.budgetCents)}</small></span>
                  </span>
                  <span className={`cat-bar ${state}`} aria-hidden="true"><i style={{ width: `${Math.min(ratio, 1) * 100}%` }} /></span>
                  <span className={`cat-note ${state}`}>{note}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </>}
    </section>
  );
}
