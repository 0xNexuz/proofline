'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const ReportEditor = dynamic(() => import('./ReportEditor'), { ssr: false });

type Segment = { type: 'text'; text: string } | { type: 'fact'; token: string; text: string; claimId: string | null };
type Draft = {
  workbookId: string; revision: number; provider: string; model: string;
  paragraphs: Segment[][]; factsUsed: string[]; attempts: number; requestId: string | null;
  evidence?: { token: string; label: string; text: string; sources: string[] }[];
};
type Status = { configured: boolean; model: string | null } | null;

export default function ReportDraft({ workbook, onFocusClaim }: {
  workbook: { id: string; revision: number; title: string } | null;
  onFocusClaim: (claimId: string) => void;
}) {
  const [status, setStatus] = useState<Status>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    void fetch('/api/ai/status', { cache: 'no-store' }).then(r => r.json() as Promise<Status>)
      .then(setStatus).catch(() => setStatus({ configured: false, model: null }));
  }, []);

  async function generate() {
    if (!workbook) return;
    setBusy(true); setError(''); setCopied(false);
    try {
      const response = await fetch(`/api/workbooks/${encodeURIComponent(workbook.id)}/report`, {
        method: 'POST', cache: 'no-store', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Proofline-Request': '1' },
        body: JSON.stringify({ revision: workbook.revision }),
      });
      const data = await response.json() as Draft & { error?: string };
      if (!response.ok) throw new Error(data.error || `Drafting failed (${response.status})`);
      setDraft(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally { setBusy(false); }
  }

  async function copy() {
    if (!draft) return;
    const text = draft.paragraphs.map(p => p.map(s => s.text).join('')).join('\n\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setError('Copy failed. Select the text and copy it manually.'); }
  }

  const configured = status?.configured === true;
  const outdated = draft && workbook && (draft.workbookId !== workbook.id || draft.revision !== workbook.revision);

  return (
    <section className="ws-card report-card" aria-label="Report draft">
      <div className="claims-heading">
        <div><h2>Report summary</h2><p className="ws-sub">Written by Ant Ling. Every figure is inserted by the cent engine.</p></div>
        <button type="button" className="primary" onClick={() => void generate()} disabled={!configured || !workbook || busy}>
          {busy ? 'Drafting…' : draft ? 'Draft again' : 'Draft summary'}
        </button>
      </div>
      <p className="fineprint">
        {status === null ? 'Checking whether Ant Ling is connected…'
          : !configured ? 'Ant Ling is not connected on this server yet. Once ANT_LING_API_KEY is set, you can draft a summary here.'
          : !workbook ? 'Save or open a private workbook first. Drafts are written from a verified saved revision.'
          : `Drafts from saved revision ${workbook.revision}. Ant Ling receives the verified totals, category names and transaction IDs, not your files or descriptions. It writes the wording; every figure is inserted by Proofline's cent engine.`}
      </p>
      {error && <p role="alert" className="error">{error}</p>}
      {draft && <div className="report-body" aria-live="polite">
        {outdated && <p className="claim-warning">This draft was written from revision {draft.revision}. Draft again to include later changes.</p>}
        {draft.paragraphs.map((paragraph, index) => <p key={index}>{paragraph.map((segment, n) => segment.type === 'text'
          ? <span key={n}>{segment.text}</span>
          : <button key={n} type="button" className="fact" title={segment.claimId ? `Open claim ${segment.claimId}` : segment.token}
              disabled={!segment.claimId} onClick={() => segment.claimId && onFocusClaim(segment.claimId)}>{segment.text}</button>)}</p>)}
        <div className="report-meta">
          <span>Drafted by {draft.provider} ({draft.model}) from revision {draft.revision}. {draft.factsUsed.length} verified figures inserted by Proofline{draft.attempts > 1 ? `; first draft rejected by the number check and rewritten` : ''}.</span>
          <div className="button-row">
            <button type="button" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy text'}</button>
            <button type="button" className="primary" onClick={() => setEditing(true)} disabled={!workbook}>Open as report</button>
          </div>
        </div>
      </div>}
      {editing && draft && workbook && createPortal(<ReportEditor workbook={workbook} draft={draft} onClose={() => setEditing(false)} />, document.querySelector('.ws') ?? document.body)}
    </section>
  );
}
