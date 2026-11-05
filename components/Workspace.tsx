'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Analysis, Budget, Transaction } from '@/lib/finance';
import { analyze, categoryGaps, parseBudgets, parseTransactions } from '@/lib/finance';
import { initialVerification, verificationReducer, type VerificationPhase } from '@/lib/verification';
import ClaimInspector from '@/components/ClaimInspector';
import AccountPanel, { type AccountUser, type WorkbookItem } from '@/components/AccountPanel';
import ReportDraft from '@/components/ReportDraft';
import TotalsPanel from '@/components/TotalsPanel';
import CategoryReview, { type CategoryDecision } from '@/components/CategoryReview';

function EditorLoading() {
  return <section className="ws-card ws-sheet-card" aria-label="Univer spreadsheet"><div className="ws-editor-loading" role="status">
    <span className="ws-spinner" aria-hidden="true" />Loading the Univer workbook…</div></section>;
}
const UniverPanel = dynamic(() => import('@/components/UniverPanel'), { ssr: false, loading: EditorLoading });

const PHASE_LABEL: Record<VerificationPhase, string> = { idle: 'No workbook', stale: 'Re-checking', verified: 'Verified', invalid: 'Totals on hold' };
const SAMPLE_BUDGET = `category,budget\nOperations,1500.00\nLogistics,700.00\nCommunity,800.00`;
const SAMPLE_TX = `id,date,category,description,amount\nT-001,2026-10-01,Operations,Laptop supplies,250.00\nT-002,2026-10-02,Operations,Workspace utilities,640.00\nT-003,2026-10-03,Logistics,Transport to field site,500.00\nT-004,2026-10-05,Logistics,Additional transport,390.00\nT-005,2026-10-08,Community,Community materials,275.00\nT-006,2026-10-09,Outreach,Unbudgeted activity,80.00`;
// Same budget and amounts as the main sample, but three transactions arrive without a category.
const SAMPLE_TX_UNCATEGORISED = `id,date,category,description,amount\nT-001,2026-10-01,Operations,Laptop supplies,250.00\nT-002,2026-10-02,,Electricity and internet for October,640.00\nT-003,2026-10-03,Logistics,Transport to field site,500.00\nT-004,2026-10-05,,Fuel for the second field trip,390.00\nT-005,2026-10-08,,Printed flyers for the town hall,275.00\nT-006,2026-10-09,Outreach,Radio jingle for the launch,80.00`;
const LOCAL_KEY = 'proofline:p0:local-workbook';
type Review = { budgets: Budget[]; transactions: Transaction[]; blank: Transaction[]; unmatched: Transaction[] };
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
  const [importOpen, setImportOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  // Category choices confirmed at import; recorded in the audit trail after the first save.
  const [categoryLog, setCategoryLog] = useState<{ decisions: CategoryDecision[]; model: string | null } | null>(null);
  const [categoryNotes, setCategoryNotes] = useState<Record<string, { category: string; text: string }>>({});
  const focusClaim = useCallback((id: string) => setClaimFocus(current => ({ id, seq: (current?.seq ?? 0) + 1 })), []);

  useEffect(() => {
    if (!importOpen && !accountOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setImportOpen(false); setAccountOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [importOpen, accountOpen]);

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
      setCategoryLog(null);
      setCategoryNotes({});
      dispatchVerification({ type: 'reset' });
      setImportAnalysis(null);
      setRemoteLoad(null);
      setSelected(null);
      await refreshWorkbooks();
      setAccountOpen(false);
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
      setCategoryLog(null);
      setCategoryNotes({});
      setRemoteLoad({ sequence: Date.now(), snapshot: result.snapshot, status: result.status, error: result.error });
      setAudit([]);
      setAccountOpen(false);
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
    if (categoryLog && !migration && result.status === 'verified') {
      const log = categoryLog;
      setCategoryLog(null);
      try {
        await api(`/api/workbooks/${encodeURIComponent(result.id)}/categories`, 'POST', { revision: result.revision, ...log });
      } catch (caught) {
        setAccountError(`Revision saved, but the category review could not be added to its history: ${caught instanceof Error ? caught.message : String(caught)}`);
      }
    }
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
      const budgets = parseBudgets(budget);
      const parsed = parseTransactions(transactions, { allowBlankCategory: true });
      const gaps = categoryGaps(budgets, parsed);
      if (gaps.blank.length) {
        // Rows without a category go through review (with Ant Ling's suggestions when signed in) first.
        setReview({ budgets, transactions: parsed, ...gaps });
        setError('');
        setImportOpen(true);
        return;
      }
      build(budgets, parsed, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function build(budgets: Budget[], transactions: Transaction[], log: { decisions: CategoryDecision[]; model: string | null } | null) {
    try {
      const result = analyze(budgets, transactions);
      setCategoryLog(log);
      setCategoryNotes(log ? Object.fromEntries(log.decisions.filter(item => item.outcome !== 'kept').map(item => [item.id, { category: item.to,
        text: item.outcome === 'accepted' ? `Category set at import from Ant Ling's suggestion (${item.confidence === 'high' ? 'confident' : 'confirmed by you'}).`
          : item.outcome === 'changed' ? `Category chosen at import; Ant Ling had suggested ${item.suggested}.`
          : 'Category chosen at import.' }])) : {});
      setReview(null);
      dispatchVerification({ type: 'stale' });
      setSelected(null);
      setRemoteLoad(null);
      setImportAnalysis(result);
      setRevision(x => x + 1);
      setError('');
      setImportOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function finishReview(choices: Record<string, string>, decisions: CategoryDecision[], model: string | null) {
    if (!review) return;
    build(review.budgets, review.transactions.map(tx => choices[tx.id] ? { ...tx, category: choices[tx.id] } : tx), { decisions, model });
  }

  function loadUncategorisedExample() {
    setBudgetCsv(SAMPLE_BUDGET);
    setTransactionCsv(SAMPLE_TX_UNCATEGORISED);
    setBudgetFilename('sample-budget.csv');
    setTxFilename('sample-transactions-uncategorised.csv');
    run(SAMPLE_BUDGET, SAMPLE_TX_UNCATEGORISED);
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

  const title = selected?.title ?? (verification.phase === 'idle' ? 'No workbook yet' : 'Unsaved workbook');
  const meta = selected ? `Revision ${selected.revision}` : user ? 'Not saved yet' : 'Sign in to save';

  return (
    <div className="ws">
      <header className="ws-top">
        <Link href="/" className="ws-brand" aria-label="ProofLine home">PROOFLINE<span>.</span></Link>
        <div className="ws-context">
          <span className="ws-title">{title}</span>
          <span className="ws-meta">{meta}</span>
        </div>
        <span className={`ws-pill ${verification.phase}`} role="status" aria-label={`Verification: ${PHASE_LABEL[verification.phase]}`}>
          <i aria-hidden="true" />{PHASE_LABEL[verification.phase]}
        </span>
        <nav className="ws-actions" aria-label="Workbook actions">
          <button type="button" className="ws-btn on-dark" onClick={() => { setError(''); setImportOpen(true); }}>Import CSVs</button>
          <button type="button" className="ws-btn on-dark" onClick={loadExample}>Load sample</button>
          <button type="button" className="ws-btn account" aria-haspopup="dialog" onClick={() => setAccountOpen(true)}>
            {user ? <><span className="ws-avatar" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>{user.username}</> : 'Sign in'}
          </button>
        </nav>
      </header>

      {accountError && !accountOpen && <div className="ws-banner" role="alert">
        <span>{accountError}</span><button type="button" onClick={() => setAccountError('')}>Dismiss</button>
      </div>}

      <div className="ws-main">
        <div className="ws-sheet">
          {sessionReady ? <UniverPanel key={user?.id ?? 'guest'} analysis={importAnalysis} version={revision}
            verification={verification} onVerification={dispatchVerification} restoreLocalInitially={!user}
            remoteLoad={remoteLoad} serverUser={user?.username ?? null} selectedRevision={selected?.revision ?? null}
            onServerSave={saveRemote}
            emptyState={verification.phase === 'idle' ? <div className="ws-empty-card">
              <h2>Start with a budget</h2>
              <p>Load the sample budget to see a workbook whose totals are checked to the cent, or import your own budget and transaction CSVs.</p>
              <div className="button-row">
                <button type="button" className="primary" onClick={loadExample}>Load the sample budget</button>
                <button type="button" onClick={() => setImportOpen(true)}>Import CSVs</button>
              </div>
            </div> : null} /> : <EditorLoading />}
        </div>

        <aside className="ws-rail" aria-label="Verified results">
          <TotalsPanel verification={verification} onFocusClaim={focusClaim} onLoadSample={loadExample} />
          <ClaimInspector verification={verification} focus={claimFocus} notes={categoryNotes} />
          {user ? <ReportDraft workbook={selected} onFocusClaim={focusClaim} />
            : <section className="ws-card ws-note"><h2>Report summary</h2>
              <p>Sign in and save a workbook to draft a summary with Ant Ling. It writes the wording; every figure comes from the cent engine.</p>
              <button type="button" onClick={() => setAccountOpen(true)}>Sign in</button></section>}
          <p className="ws-foot">Spreadsheet editing by Univer. Checking, sources and storage by ProofLine. Ant Ling drafts report wording when connected and never supplies figures.</p>
        </aside>
      </div>

      {importOpen && <div className="ws-layer" onMouseDown={event => { if (event.target === event.currentTarget) setImportOpen(false); }}>
        <div className={`ws-dialog${review ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="import-title">
          <div className="ws-dialog-head">
            <h2 id="import-title">{review ? 'Review categories' : 'Import CSVs'}</h2>
            <button type="button" className="ws-close" aria-label="Close" onClick={() => setImportOpen(false)}>×</button>
          </div>
          {review ? <CategoryReview key={`${txFilename}:${review.transactions.length}`} categories={review.budgets.map(budget => budget.category)}
            blank={review.blank} unmatched={review.unmatched} signedIn={Boolean(user)} onSignIn={() => setAccountOpen(true)}
            onBack={() => setReview(null)} onBuild={finishReview} /> : <>
          <p className="fineprint">Choose a budget file and a transactions file. The workbook is rebuilt from them and every total is checked again. Transactions may leave the category blank: you will choose one for each, with suggestions from Ant Ling when you are signed in.</p>
          <div className="input-row">
            <label className="file-input"><strong>Budget</strong><span>{budgetFilename}</span><code>category,budget</code>
              <input type="file" accept=".csv,text/csv" onChange={e => void chooseCsv(e.target.files?.[0], 'budget')} /></label>
            <label className="file-input"><strong>Transactions</strong><span>{txFilename}</span><code>id,date,category,description,amount</code>
              <input type="file" accept=".csv,text/csv" onChange={e => void chooseCsv(e.target.files?.[0], 'transactions')} /></label>
          </div>
          {error && <p role="alert" className="error">{error}</p>}
          <div className="button-row end">
            <button type="button" onClick={loadExample}>Use the sample</button>
            <button type="button" onClick={loadUncategorisedExample}>Sample with blank categories</button>
            <button className="primary" type="button" onClick={() => run()}>Build workbook</button>
          </div></>}
        </div>
      </div>}

      {accountOpen && <div className="ws-layer side" onMouseDown={event => { if (event.target === event.currentTarget) setAccountOpen(false); }}>
        <div className="ws-drawer" role="dialog" aria-modal="true" aria-labelledby="account-title">
          <div className="ws-dialog-head">
            <h2 id="account-title">{user ? 'Your account' : 'Sign in'}</h2>
            <button type="button" className="ws-close" aria-label="Close" onClick={() => setAccountOpen(false)}>×</button>
          </div>
          <AccountPanel user={user} workbooks={workbooks} selectedId={selected?.id ?? null} busy={accountBusy}
            error={accountError} audit={audit} onAuth={onAuth} onLogout={onLogout} onOpen={onOpen}
            onMigrate={onMigrate} onAudit={onAudit} />
        </div>
      </div>}
    </div>
  );
}
