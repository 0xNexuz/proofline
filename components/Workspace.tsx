'use client';

import dynamic from 'next/dynamic';
import { useReducer, useState } from 'react';
import type { Analysis } from '@/lib/finance';
import { analyze, money, parseBudgets, parseTransactions } from '@/lib/finance';
import { initialVerification, verificationReducer } from '@/lib/verification';
import ClaimInspector from '@/components/ClaimInspector';

const UniverPanel = dynamic(() => import('@/components/UniverPanel'), { ssr: false });
const SAMPLE_BUDGET = `category,budget\nOperations,1500.00\nLogistics,700.00\nCommunity,800.00`;
const SAMPLE_TX = `id,date,category,description,amount\nT-001,2026-10-01,Operations,Laptop supplies,250.00\nT-002,2026-10-02,Operations,Workspace utilities,640.00\nT-003,2026-10-03,Logistics,Transport to field site,500.00\nT-004,2026-10-05,Logistics,Additional transport,390.00\nT-005,2026-10-08,Community,Community materials,275.00\nT-006,2026-10-09,Outreach,Unbudgeted activity,80.00`;

export default function Workspace() {
  const [budgetCsv, setBudgetCsv] = useState('');
  const [transactionCsv, setTransactionCsv] = useState('');
  const [budgetFilename, setBudgetFilename] = useState<string>('No file selected');
  const [txFilename, setTxFilename] = useState<string>('No file selected');
  const [importAnalysis, setImportAnalysis] = useState<Analysis | null>(null);
  const [verification, dispatchVerification] = useReducer(verificationReducer, initialVerification);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string>('');

  function run(budget = budgetCsv, transactions = transactionCsv) {
    try {
      if (!budget || !transactions) throw new Error('Choose both budget and transaction CSV files first.');
      const result = analyze(parseBudgets(budget), parseTransactions(transactions));
      dispatchVerification({ type: 'stale' });
      setImportAnalysis(result);
      setRevision(x => x + 1);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function loadExample() {
    setBudgetCsv(SAMPLE_BUDGET);
    setTransactionCsv(SAMPLE_TX);
    setBudgetFilename('sample-budget.csv');
    setTxFilename('sample-transactions.csv');
    run(SAMPLE_BUDGET, SAMPLE_TX);
  }

  async function chooseCsv(file: File | undefined, kind: 'budget' | 'transactions') {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setError('Please select a .csv file.'); return; }
    if (file.size > 350_000) { setError('P0 supports CSV files up to 350 KB.'); return; }
    const content = await file.text();
    if (kind === 'budget') { setBudgetCsv(content); setBudgetFilename(file.name); }
    else { setTransactionCsv(content); setTxFilename(file.name); }
    setError('');
  }

  return (
    <main className="container">
      <header className="masthead">
        <div><div className="brand">PROOFLINE<span className="brand-dot">.</span></div><p className="subtitle">Evidence-first financial intelligence · Built with Univer</p></div>
        <span className="pill">P1 · VERIFIED CLAIMS</span>
      </header>
      <section className="hero">
        <div><span className="eyebrow">EVERY CLAIM HAS A SOURCE.</span><h1>Financial reports should<br />show their working.</h1><p>Import budgets and transactions, inspect the underlying Univer workbook, and see which claims remain verified after an edit.</p></div>
        <div className="hero-note">Claims are calculated independently from workbook source cells. Invalid edits withhold current totals until the workbook is repaired.</div>
      </section>
      <section className="controls" aria-label="Import financial evidence">
        <div className="controls-heading"><h2>Import evidence</h2><p>Choose the two CSV templates, or use synthetic demo data.</p></div>
        <div className="input-row">
          <label className="file-input"><strong>Budget CSV</strong><span>{budgetFilename}</span><input type="file" accept=".csv,text/csv" onChange={e => void chooseCsv(e.target.files?.[0], 'budget')} /></label>
          <label className="file-input"><strong>Transactions CSV</strong><span>{txFilename}</span><input type="file" accept=".csv,text/csv" onChange={e => void chooseCsv(e.target.files?.[0], 'transactions')} /></label>
        </div>
        <div className="button-row"><button className="primary" type="button" onClick={() => run()}>Generate workbook</button><button type="button" onClick={loadExample}>Load synthetic demo</button></div>
        {error && <p role="alert" className="error">{error}</p>}
        <p className="fineprint">Budget header: <code>category,budget</code> · Transactions header: <code>id,date,category,description,amount</code>. Source IDs must remain unique. Data stays in this browser.</p>
      </section>
      {verification.current && <section className="analysis" aria-label="Verified financial analysis">
        <div className="stat"><span>Budget total</span><strong>{money(verification.current.budgetTotalCents)}</strong></div>
        <div className="stat"><span>Actual spend</span><strong>{money(verification.current.actualTotalCents)}</strong></div>
        <div className="stat"><span>Exception categories</span><strong>{verification.current.exceptionCount}</strong></div>
        <div className="stat"><span>Unique transactions</span><strong>{verification.current.transactions.length}</strong></div>
        <div className="summary-list">
          <h2>Independently verified results</h2>
          {verification.current.summaries.map(s => <div className="summary-row" key={s.category}>
            <div><strong>{s.category}</strong><small>Source transactions: {s.transactionIds.join(', ') || 'none'}</small></div>
            <div className="summary-value"><strong>{money(s.actualCents)} / {money(s.budgetCents)}</strong><small className={s.status === 'within budget' ? 'ok' : 'warning'}>{s.status} · variance {money(s.varianceCents)}</small></div>
          </div>)}
        </div>
      </section>}
      {(verification.phase === 'stale' || verification.phase === 'invalid') && <section className="withheld" aria-label="Current totals withheld">
        <strong>Current financial totals withheld</strong><span>{verification.phase === 'stale' ? 'Revalidating workbook source cells…' : 'Repair the workbook source cells to restore verified totals.'}</span>
      </section>}
      <ClaimInspector verification={verification} />
      <UniverPanel analysis={importAnalysis} version={revision} verification={verification} onVerification={dispatchVerification} />
      <footer>Univer provides the editable spreadsheet and formula runtime. Proofline independently validates source cells, calculates integer-cent claims, and tracks supporting records. Ant Ling assists development in Codex; it is not an application runtime integration.</footer>
    </main>
  );
}
