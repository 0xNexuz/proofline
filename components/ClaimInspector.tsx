'use client';

import { useMemo, useState } from 'react';
import { money } from '@/lib/finance';
import { buildClaims, type VerificationState } from '@/lib/verification';

export default function ClaimInspector({ verification }: { verification: VerificationState }) {
  const [selectedId, setSelectedId] = useState('total:actual');
  const claims = useMemo(
    () => buildClaims(verification.current, verification.previous),
    [verification.current, verification.previous],
  );
  const selected = claims.find(claim => claim.id === selectedId) ?? claims[0];
  const status = verification.phase === 'verified' ? 'Verified' :
    verification.phase === 'stale' ? 'Revalidating' :
    verification.phase === 'invalid' ? 'Invalid' : 'No claims yet';

  return (
    <section className="claims-card" aria-label="Claim inspection">
      <div className="claims-heading">
        <div><span className="eyebrow">SOURCE → CALCULATION → CLAIM</span><h2>Claim inspection</h2></div>
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
              <strong>{tx.id} · {tx.category}</strong><span>Sheet row {tx.sourceRow} · {tx.date} · {money(tx.amountCents)}</span><small>{tx.description}</small>
            </div>)}
          </article>
        </div>
      )}
    </section>
  );
}
