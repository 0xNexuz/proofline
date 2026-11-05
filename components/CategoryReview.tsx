'use client';

import { useEffect, useMemo, useState } from 'react';
import { money, type Transaction } from '@/lib/finance';

type Suggestion = { id: string; category: string | null; confidence: 'high' | 'low'; reason: string };
export type CategoryDecision = {
  id: string; from: string; to: string;
  suggested: string | null; confidence: 'high' | 'low' | null;
  outcome: 'accepted' | 'changed' | 'manual' | 'kept';
};
export const UNCATEGORISED = 'Uncategorised';
const MAX_ROWS = 40;

/**
 * Import step for transactions with no category (and labels that match no budget line).
 * Ant Ling may suggest a budget line for each; confident suggestions for blank rows are filled in,
 * uncertain ones need a click, and a label the file already states only changes when the user says so.
 */
export default function CategoryReview({ categories, blank, unmatched, signedIn, onSignIn, onBack, onBuild }: {
  categories: string[];
  blank: Transaction[];
  unmatched: Transaction[];
  signedIn: boolean;
  onSignIn: () => void;
  onBack: () => void;
  onBuild: (choices: Record<string, string>, decisions: CategoryDecision[], model: string | null) => void;
}) {
  const rows = useMemo(() => [...blank, ...unmatched], [blank, unmatched]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [model, setModel] = useState<string | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>(() => Object.fromEntries(unmatched.map(tx => [tx.id, tx.category])));
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/ai/status', { cache: 'no-store' }).then(r => r.json() as Promise<{ configured: boolean }>)
      .then(result => setConfigured(result.configured)).catch(() => setConfigured(false));
  }, []);

  async function suggest() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST', cache: 'no-store', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Proofline-Request': '1' },
        body: JSON.stringify({ categories, transactions: rows.slice(0, MAX_ROWS).map(tx => ({ id: tx.id, description: tx.description, category: tx.category })) }),
      });
      const data = await response.json() as { suggestions?: Suggestion[]; model?: string; error?: string };
      if (!response.ok || !data.suggestions) throw new Error(data.error || `Suggestions failed (${response.status})`);
      const byId = Object.fromEntries(data.suggestions.map(item => [item.id, item]));
      setSuggestions(byId);
      setModel(data.model ?? null);
      // Fill blank rows the user has not touched yet: confident suggestions count as accepted,
      // uncertain ones are pre-selected but still need a click on Confirm.
      setChoice(current => {
        const next = { ...current };
        for (const tx of blank) {
          const item = byId[tx.id];
          if (!confirmed.has(tx.id) && item?.category) next[tx.id] = item.category;
        }
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally { setBusy(false); }
  }

  function decide(id: string, value: string) {
    setChoice(current => ({ ...current, [id]: value }));
    setConfirmed(current => new Set(current).add(id));
  }

  const needsCheck = (tx: Transaction) => {
    if (confirmed.has(tx.id)) return false;
    if (!choice[tx.id]) return true;
    if (!tx.category) return suggestions[tx.id]?.confidence !== 'high' || choice[tx.id] !== suggestions[tx.id]?.category;
    return false; // an unchanged existing label never needs confirming
  };
  const open = rows.filter(needsCheck);
  const confident = blank.filter(tx => !confirmed.has(tx.id) && suggestions[tx.id]?.confidence === 'high' && choice[tx.id] === suggestions[tx.id]?.category).length;

  function build() {
    const decisions: CategoryDecision[] = rows.map(tx => {
      const to = choice[tx.id];
      const item = suggestions[tx.id];
      const outcome: CategoryDecision['outcome'] = tx.category && to === tx.category ? 'kept'
        : item?.category ? (to === item.category ? 'accepted' : 'changed') : 'manual';
      return { id: tx.id, from: tx.category, to, suggested: item?.category ?? null, confidence: item ? item.confidence : null, outcome };
    });
    onBuild(Object.fromEntries(rows.map(tx => [tx.id, choice[tx.id]])), decisions, Object.keys(suggestions).length ? model : null);
  }

  const asked = Object.keys(suggestions).length > 0;
  const renderRow = (tx: Transaction) => {
    const item = suggestions[tx.id];
    const value = choice[tx.id] ?? '';
    const check = needsCheck(tx);
    const offer = tx.category && item?.category && item.category !== value;
    return <li className={`cat-row${check ? ' needs' : ''}`} key={tx.id}>
      <div className="cat-tx">
        <strong>{tx.id}</strong>
        <span>{tx.description}</span>
        <small>{tx.date} · {money(tx.amountCents)}{tx.category ? ` · labelled “${tx.category}”` : ' · no category'}</small>
      </div>
      <div className="cat-pick">
        <select aria-label={`Category for ${tx.id}`} value={value} onChange={event => decide(tx.id, event.target.value)}>
          {!value && <option value="">Choose a category</option>}
          {categories.map(name => <option key={name} value={name}>{name}</option>)}
          {tx.category ? <option value={tx.category}>Keep “{tx.category}” (not in budget)</option>
            : <option value={UNCATEGORISED}>{UNCATEGORISED} (not in budget)</option>}
        </select>
        {item && <p className="cat-ai">
          <span className={`ws-chip ${!item.category ? '' : item.confidence === 'high' && !tx.category ? 'strong' : 'warn'}`}>
            {!item.category ? 'No clear match' : item.confidence === 'high' && !tx.category ? 'Confident' : 'Check this'}
          </span>
          <span>{item.category ? `Ant Ling: ${item.category}.` : 'Ant Ling found no budget line that fits.'} {item.reason}</span>
        </p>}
        {offer && <button type="button" onClick={() => decide(tx.id, item.category!)}>Use {item.category}</button>}
        {check && value && <button type="button" className="primary" onClick={() => decide(tx.id, value)}>Confirm {value}</button>}
      </div>
    </li>;
  };

  return <div className="cat-review">
    <div className="cat-intro">
      <p><strong>{blank.length} {blank.length === 1 ? 'transaction has' : 'transactions have'} no category.</strong> Choose a budget line for each before the workbook is built.
        {configured && signedIn && ' Ant Ling can suggest one: it receives the ID, description and label of the rows below and your budget category names. Amounts and files stay here.'}</p>
      {configured === false && <p className="fineprint">Ant Ling is not connected on this server, so choose the categories yourself.</p>}
      {configured && !signedIn && <p className="fineprint">Sign in to get suggestions from Ant Ling, or choose the categories yourself. <button type="button" className="linkish" onClick={onSignIn}>Sign in</button></p>}
      {configured && signedIn && <button type="button" className={asked ? '' : 'primary'} onClick={() => void suggest()} disabled={busy}>
        {busy ? 'Asking Ant Ling…' : asked ? 'Suggest again' : 'Suggest categories'}</button>}
      {rows.length > MAX_ROWS && <p className="fineprint">Ant Ling looks at the first {MAX_ROWS} rows per request; choose the rest yourself.</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </div>
    <ul className="cat-list" aria-label="Transactions without a category">{blank.map(renderRow)}</ul>
    {unmatched.length > 0 && <>
      <h3 className="cat-sub">Labels that match no budget line</h3>
      <p className="fineprint">These stay as they are, shown as unbudgeted, unless you change them.</p>
      <ul className="cat-list" aria-label="Labels outside the budget">{unmatched.map(renderRow)}</ul>
    </>}
    <div className="cat-foot">
      <span className="fineprint" role="status">{open.length
        ? `${open.length} ${open.length === 1 ? 'row needs' : 'rows need'} your choice or confirmation.`
        : `Ready.${confident ? ` ${confident} confident ${confident === 1 ? 'suggestion' : 'suggestions'} applied; change any you disagree with.` : ''}`}</span>
      <div className="button-row">
        <button type="button" onClick={onBack}>Back</button>
        <button type="button" className="primary" onClick={build} disabled={open.length > 0}>Build workbook</button>
      </div>
    </div>
  </div>;
}
