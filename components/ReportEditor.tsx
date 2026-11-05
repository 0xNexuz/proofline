'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReportContent, ReportHandle } from '@/lib/univer-docs';

type Segment = { type: 'text'; text: string } | { type: 'fact'; token: string; text: string; claimId: string | null };
type Evidence = { token: string; label: string; text: string; sources: string[] };
export type DraftForReport = { workbookId: string; revision: number; model: string; paragraphs: Segment[][]; evidence?: Evidence[] };
type Check = {
  revision: number; ok: boolean; verifiedFigures: number;
  changed: { token: string; label: string; was: string; now: string }[];
  missing: { token: string; was: string }[];
  unverified: { number: string; context: string }[];
};
type Approval = { revision: number; approvedAt: string; verifiedFigures: number };

function buildReport(title: string, draft: DraftForReport): { content: ReportContent; refs: { token: string; text: string }[] } {
  const refs: { token: string; text: string }[] = [];
  const paragraphs = draft.paragraphs.map(paragraph => paragraph.map(segment => {
    if (segment.type === 'fact') refs.push({ token: segment.token, text: segment.text });
    return segment.text;
  }).join(''));
  const evidence = (draft.evidence ?? []).map(item => {
    refs.push({ token: item.token, text: item.text });
    item.sources.forEach(id => refs.push({ token: `tx:${id}`, text: id }));
    return `${item.label}: ${item.text}. ${item.sources.length ? `Source transactions: ${item.sources.join(', ')}.` : 'From the budget rows.'}`;
  });
  return {
    refs,
    content: {
      title: `Budget report: ${title}`,
      blocks: [
        { kind: 'heading', text: 'Summary' },
        ...paragraphs.map(text => ({ kind: 'paragraph' as const, text })),
        ...(evidence.length ? [{ kind: 'heading' as const, text: 'Evidence' }, ...evidence.map(text => ({ kind: 'paragraph' as const, text }))] : []),
        { kind: 'note', text: 'Every figure in this report was inserted by the ProofLine cent engine from the saved workbook. Approval re-checks each figure against the latest saved revision.' },
      ],
    },
  };
}

async function post<T>(url: string, payload: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const response = await fetch(url, { method: 'POST', cache: 'no-store', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Proofline-Request': '1' }, body: JSON.stringify(payload) });
  return { ok: response.ok, status: response.status, data: await response.json() as T & { error?: string } };
}

export default function ReportEditor({ workbook, draft, onClose }: {
  workbook: { id: string; revision: number; title: string };
  draft: DraftForReport;
  onClose: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ReportHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<'check' | 'approve' | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildReport(workbook.title, draft), [workbook.title, draft]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = document.createElement('div');
    container.style.height = '100%';
    host.appendChild(container);
    let disposed = false;
    void import('@/lib/univer-docs').then(({ mountReport }) => {
      if (disposed) return;
      handleRef.current = mountReport(container, report.content);
      setReady(true);
    }).catch(caught => setError(`The report editor could not load: ${caught instanceof Error ? caught.message : String(caught)}`));
    return () => {
      disposed = true;
      const handle = handleRef.current;
      handleRef.current = null;
      queueMicrotask(() => { handle?.dispose(); container.remove(); });
    };
  }, [report]);

  useEffect(() => {
    // Escape closes the dialog, except while typing in the document (Univer uses Escape itself).
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target instanceof Node && hostRef.current?.contains(event.target))) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function run(kind: 'check' | 'approve') {
    const handle = handleRef.current;
    if (!handle) return;
    setBusy(kind); setError(''); setCopied(false);
    try {
      const text = handle.readText();
      const result = await post<Check & Approval & { code?: string; currentRevision?: number }>(
        `/api/workbooks/${encodeURIComponent(workbook.id)}/report/${kind}`,
        { text, refs: report.refs, revision: kind === 'approve' ? (check?.revision ?? workbook.revision) : undefined });
      if (kind === 'check') {
        if (!result.ok) throw new Error(result.data.error || `Check failed (${result.status})`);
        setCheck(result.data);
        setApproval(null);
      } else if (result.ok) {
        setApproval({ revision: result.data.revision, approvedAt: result.data.approvedAt, verifiedFigures: result.data.verifiedFigures });
        setCheck({ revision: result.data.revision, ok: true, verifiedFigures: result.data.verifiedFigures, changed: [], missing: [], unverified: [] });
      } else {
        if (result.data.code === 'mismatch') setCheck(result.data);
        throw new Error(result.data.error || `Approval failed (${result.status})`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally { setBusy(null); }
  }

  async function copy() {
    const text = handleRef.current?.readText();
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setError('Copy failed. Select the text in the editor and copy it manually.'); }
  }

  const issues = check ? check.changed.length + check.missing.length + check.unverified.length : 0;
  return (
    <div className="ws-layer" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="ws-report" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="ws-dialog-head">
          <div>
            <h2 id="report-title">Report</h2>
            <p className="ws-sub">Edit freely in Univer Docs. Before you share it, ProofLine checks every number against the latest saved revision.</p>
          </div>
          <button type="button" className="ws-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ws-report-body">
          <div className="ws-report-doc editor-host" ref={hostRef}>{!ready && !error && <div className="ws-editor-loading"><span className="ws-spinner" aria-hidden="true" />Loading Univer Docs…</div>}</div>
          <aside className="ws-report-side" aria-label="Report checks">
            <div className="ws-report-meta">
              <span className="ws-chip">Univer Docs</span>
              <span className="ws-chip">Drafted from revision {draft.revision}</span>
            </div>
            <div className="button-row">
              <button type="button" onClick={() => void run('check')} disabled={!ready || busy !== null}>{busy === 'check' ? 'Checking…' : 'Check figures'}</button>
              <button type="button" className="primary" onClick={() => void run('approve')} disabled={!ready || busy !== null}>{busy === 'approve' ? 'Approving…' : 'Approve report'}</button>
            </div>
            {approval && <div className="ws-report-result ok" role="status">
              <strong>Approved for revision {approval.revision}</strong>
              <span>{approval.verifiedFigures} figures matched the cent engine. Recorded in the workbook history at {new Date(approval.approvedAt).toLocaleString()}.</span>
            </div>}
            {!approval && check && (check.ok
              ? <div className="ws-report-result ok" role="status"><strong>All figures match revision {check.revision}</strong><span>{check.verifiedFigures} figures checked. You can approve this report.</span></div>
              : <div className="ws-report-result warn" role="status">
                  <strong>{issues} {issues === 1 ? 'figure needs' : 'figures need'} attention (revision {check.revision})</strong>
                  {check.verifiedFigures === 0 && !issues && <span>The report doesn&apos;t cite any verified figure yet.</span>}
                  <ul>
                    {check.changed.map(item => <li key={`c-${item.token}`}><b>{item.label}</b> changed from {item.was} to {item.now} in a later save.</li>)}
                    {check.unverified.map(item => <li key={`u-${item.number}`}><b>{item.number}</b> is not a verified figure: “{item.context}”</li>)}
                    {check.missing.map(item => <li key={`m-${item.token}`}><b>{item.was}</b> no longer exists in the workbook.</li>)}
                  </ul>
                </div>)}
            {error && <p role="alert" className="error">{error}</p>}
            <p className="fineprint">Written by Ant Ling ({draft.model}); figures inserted by the cent engine. Numbers you type yourself are flagged unless they match a verified figure. Dates such as “October 2026” are allowed.</p>
            <button type="button" onClick={() => void copy()} disabled={!ready}>{copied ? 'Copied' : 'Copy report text'}</button>
          </aside>
        </div>
      </div>
    </div>
  );
}
