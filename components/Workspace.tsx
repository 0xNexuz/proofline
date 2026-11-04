'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Analysis } from '@/lib/finance';
import { analyze, money, parseBudgets, parseTransactions } from '@/lib/finance';
import { initialVerification, verificationReducer } from '@/lib/verification';
import ClaimInspector from '@/components/ClaimInspector';
import AccountPanel, { type AccountUser, type WorkbookItem } from '@/components/AccountPanel';
import ReportDraft from '@/components/ReportDraft';

const UniverPanel = dynamic(() => import('@/components/UniverPanel'), { ssr: false });
const SAMPLE_BUDGET = `category,budget\nOperations,1500.00\nLogistics,700.00\nCommunity,800.00`;
const SAMPLE_TX = `id,date,category,description,amount\nT-001,2026-10-01,Operations,Laptop supplies,250.00\nT-002,2026-10-02,Operations,Workspace utilities,640.00\nT-003,2026-10-03,Logistics,Transport to field site,500.00\nT-004,2026-10-05,Logistics,Additional transport,390.00\nT-005,2026-10-08,Community,Community materials,275.00\nT-006,2026-10-09,Outreach,Unbudgeted activity,80.00`;
const LOCAL_KEY = 'proofline:p0:local-workbook';
type RemoteLoad = { sequence: number; snapshot: object; status: string; error: string | null };

async function api<T>(url: string, method = 'GET', payload?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: 'no-store', credentials: 'same-origin',
    headers: payload === undefined ? undefined : { 'Content-Type': 'application/json', 'X-Proofline-Request': '1' },
    body: payload === undefined ? undefined : JSON.stringify(payload) });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export default function Workspace() {
  const [budgetCsv, setBudgetCsv] = useState('');
  const [transactionCsv, setTransactionCsv] = useState('');
  const [budgetFilename, setBudgetFilename] = useState<string>('No file selected');
  const [txFilename, setTxFilename] = useState<string>('No file selected');
  const [importAnalysis, setImportAnalysis] = useState<Analysis | null>(null);
  const [verification, dispatchVerification] = useReducer(verificationReducer, initialVerification);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<AccountUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [workbooks, setWorkbooks] = useState<WorkbookItem[]>([]);
  const [selected, setSelected] = useState<{ id: string; revision: number; title: string } | null>(null);
  const [remoteLoad, setRemoteLoad] = useState<RemoteLoad | null>(null);
  const [accountError, setAccountError] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [audit, setAudit] = useState<{ action: string; revision: number; createdAt: string; verificationImpact: string }[]>([]);
  const pendingSave = useRef<{ fingerprint: string; key: string } | null>(null);
  const [claimFocus, setClaimFocus] = useState<{ id: string; seq: number } | null>(null);

  const refreshWorkbooks = useCallback(async () => {
    const result = await api<{ workbooks: WorkbookItem[] }>('/api/workbooks');
    setWorkbooks(result.workbooks);
  }, []);

  useEffect(() => {
    void api<{ user: AccountUser | null }>('/api/auth').then(result => {
      setUser(result.user);
      if (result.user) void refreshWorkbooks().catch(() => setAccountError('Could not list private workbooks.'));
      setSessionReady(true);
    }).catch(() => { setAccountError('Authentication service is unavailable. Local P1 editing remains available.'); setSessionReady(true); });
  }, [refreshWorkbooks]);

  async function onAuth(action: 'register' | 'login', username: string, password: string) {
    setAccountBusy(true); setAccountError('');
    try {
      const result = await api<{ user: AccountUser }>('/api/auth', 'POST', { action, username, password });
      setUser(result.user);
      dispatchVerification({ type: 'reset' });
      setImportAnalysis(null);
      setRemoteLoad(null);
      setSelected(null);
      await refreshWorkbooks();
    } catch (caught) { setAccountError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setAccountBusy(false); }
  }

  async function onLogout() {
    setAccountBusy(true);
    try { await api('/api/auth', 'POST', { action: 'logout' }); window.location.reload(); }
    catch (caught) { setAccountError(caught instanceof Error ? caught.message : String(caught)); setAccountBusy(false); }
  }

  async function onOpen(id: string) {
    setAccountBusy(true); setAccountError('');
    try {
      const result = await api<{ id: string; revision: number; title: string; snapshot: object; status: string; error: string | null }>(`/api/workbooks/${encodeURIComponent(id)}`);
      setSelected({ id: result.id, revision: result.revision, title: result.title });
      setImportAnalysis(null);
      setRemoteLoad({ sequence: Date.now(), snapshot: result.snapshot, status: result.status, error: result.error });
      setAudit([]);
    } catch (caught) { setAccountError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setAccountBusy(false); }
  }

  async function onAudit(id: string) {
    setAccountBusy(true); setAccountError('');
    try {
      const result = await api<{ entries: typeof audit }>(`/api/workbooks/${encodeURIComponent(id)}/audit`);
      setAudit(result.entries);
    } catch (caught) { setAccountError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setAccountBusy(false); }
  }

  async function saveRemote(snapshot: object, unsupportedOperation: boolean, migration = false) {
    if (!user) throw new Error('Sign in before saving to private server storage');
    const target = migration ? null : selected;
    const title = target?.title ?? 'Proofline evidence workbook';
    const fingerprint = JSON.stringify({ id: target?.id, revision: target?.revision, snapshot, unsupportedOperation, migration });
    if (pendingSave.current?.fingerprint !== fingerprint) pendingSave.current = { fingerprint, key: crypto.randomUUID() };
    const payload = { title, snapshot, expectedRevision: target?.revision ?? 0,
      idempotencyKey: pendingSave.current.key, unsupportedOperation, migration };
    const result = await api<{ id: string; revision: number; status: string; error: string | null }>(
      target ? `/api/workbooks/${encodeURIComponent(target.id)}` : '/api/workbooks', target ? 'PUT' : 'POST', payload);
    pendingSave.current = null;
    setSelected({ id: result.id, revision: result.revision, title });
    try { await refreshWorkbooks(); }
    catch { setAccountError('Revision saved, but the workbook list could not refresh. Reload to see it.'); }
    return result;
  }

  async function onMigrate() {
    setAccountBusy(true); setAccountError('');
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY);
      if (!raw) throw new Error('No browser-local P1 workbook was found');
      const snapshot = JSON.parse(raw) as object;
      const result = await saveRemote(snapshot, false, true);
      setImportAnalysis(null);
      setRemoteLoad({ sequence: Date.now(), snapshot, status: result.status, error: result.error });
      setAccountError(result.status === 'verified' ? 'Local P1 workbook imported as a new private revision. Browser-local data was retained.' :
        `Imported workbook is unverified: ${result.error}`);
    } catch (caught) { setAccountError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setAccountBusy(false); }
  }

  function run(budget = budgetCsv, transactions = transactionCsv) {
    try {
      if (!budget || !transactions) throw new Error('Choose both budget and transaction CSV files first.');
      const result = analyze(parseBudgets(budget), parseTransactions(transactions));
      dispatchVerification({ type: 'stale' });
      setSelected(null);
      setRemoteLoad(null);
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
        <div><a href="/" className="brand" style={{ color: 'inherit', textDecoration: 'none' }} aria-label="ProofLine home">PROOFLINE<span className="brand-dot">.</span></a><p className="subtitle">Evidence-first financial intelligence · Built with Univer</p></div>
        <span className="pill">P2 · PRIVATE REVISIONS</span>
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
        <p className="fineprint">Budget header: <code>category,budget</code> · Transactions header: <code>id,date,category,description,amount</code>. Source IDs must remain unique. Sign in to save a private server revision.</p>
      </section>
      <AccountPanel user={user} workbooks={workbooks} selectedId={selected?.id ?? null} busy={accountBusy}
        error={accountError} audit={audit} onAuth={onAuth} onLogout={onLogout} onOpen={onOpen}
        onMigrate={onMigrate} onAudit={onAudit} />
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
      <ClaimInspector verification={verification} focus={claimFocus} />
      {user && <ReportDraft workbook={selected} onFocusClaim={id => setClaimFocus(current => ({ id, seq: (current?.seq ?? 0) + 1 }))} />}
      {sessionReady && <UniverPanel key={user?.id ?? 'guest'} analysis={importAnalysis} version={revision}
        verification={verification} onVerification={dispatchVerification} restoreLocalInitially={!user}
        remoteLoad={remoteLoad} serverUser={user?.username ?? null} selectedRevision={selected?.revision ?? null}
        onServerSave={saveRemote} />}
      <footer>Univer provides the editable spreadsheet and formula runtime. Proofline independently validates source cells, calculates integer-cent claims, and tracks supporting records. Ant Ling drafts report wording from saved, verified revisions when connected; it never supplies figures.</footer>
    </main>
  );
}
