'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { money } from '@/lib/finance';
import { buildClaims, type VerificationState } from '@/lib/verification';

export default function ClaimInspector({ verification, focus = null, notes = {} }: {
  verification: VerificationState;
  /** Opens a claim from elsewhere (e.g. a figure in a report draft). `seq` re-triggers the same claim. */
  focus?: { id: string; seq: number } | null;
  /** Per-transaction notes, such as how its category was chosen at import. */
  notes?: Record<string, { category: string; text: string }>;
}) {
  const [selectedId, setSelectedId] = useState('total:actual');
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focus) return;
    setSelectedId(focus.id);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focus]);
  const claims = useMemo(
    () => buildClaims(verification.current, verification.previous),
    [verification.current, verification.previous],
  );
  const selected = claims.find(claim => claim.id === selectedId) ?? claims[0];
  const status = verification.phase === 'verified' ? 'Verified' :
    verification.phase === 'stale' ? 'Revalidating' :
    verification.phase === 'invalid' ? 'On hold' : 'No claims yet';

  return (
    <section className="ws-card claims-card" aria-label="Claim inspection" ref={sectionRef}>
      <div className="claims-heading">
        <div><h2>Claim inspection</h2><p className="ws-sub">Pick a figure to see how it was calculated and which rows it came from.</p></div>
        <span className={`verification-badge ${verification.phase}`} data-testid="verification-status">{status}</span>
      </div>
      {verification.phase === 'stale' && <p role="status" className="claim-warning">Workbook changed. Current claims are withheld until independent revalidation finishes.</p>}
      {verification.phase === 'invalid' && <p role="alert" className="claim-warning">Current workbook is not verified: {verification.error}</p>}
      {!selected ? <p className="muted">Load the synthetic demo or upload both CSVs to create inspectable claims.</p> : (
        <div className="claims-layout">
          <div className="claim-list" role="group" aria-label="Financial claims">
            {claims.map(claim => <button
              key={claim.id}
              type="button"
              className={claim.id === selected.id ? 'selected' : ''}
              onClick={() => setSelectedId(claim.id)}
            >{claim.title}</button>)}
          </div>
          <article className="claim-detail" data-testid="claim-detail">
            <p className="claim-id">{selected.id}</p>
            <h3>{selected.title}</h3>
            <p><strong>Calculation method:</strong> {selected.method}</p>
            <div className="claim-values">
              <div><span>Previous verified value</span><strong>{selected.previousCents == null ? '—' : money(selected.previousCents)}</strong></div>
              <div><span>Updated value</span><strong data-testid="claim-updated-value">{verification.phase === 'verified' && selected.valueCents != null ? money(selected.valueCents) : 'Withheld'}</strong></div>
            </div>
            <p><strong>Verification status:</strong> {status}{verification.phase === 'verified' ? ' from current workbook source cells' : ''}</p>
            <h4>{verification.phase === 'verified' ? 'Supporting source records' : 'Last verified source records (current workbook unverified)'}</h4>
            {selected.sourceRecords.length === 0 && selected.budgetSources.length === 0 && <p className="muted">No contributing records.</p>}
            {selected.budgetSources.map(budget => <div className="source-record" key={`budget:${budget.category}`}>
              <strong>Budget · {budget.category}</strong><span>Sheet row {budget.sourceRow} · {money(budget.budgetCents)}</span>
            </div>)}
            {selected.sourceRecords.map(tx => <div className="source-record" key={`transaction:${tx.id}`}>
              <strong>{tx.id} · {tx.category}</strong><span>Sheet row {tx.sourceRow} · {tx.date} · {money(tx.amountCents)}</span><small>{tx.description}</small>{notes[tx.id]?.category === tx.category && <small className="source-note">{notes[tx.id].text}</small>}
            </div>)}
          </article>
        </div>
      )}
    </section>
  );
}
