'use client';

import { useEffect, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import type { Analysis } from '@/lib/finance';
import { workbookMatrix } from '@/lib/finance';
import { analyzeWorkbookGrid, isUnsupportedStructuralCommand, type GridValue, type VerificationAction, type VerificationState } from '@/lib/verification';
import '@univerjs/preset-sheets-core/lib/index.css';
import type * as UniverPro from '@/lib/univer-pro';

type UniverSetup = ReturnType<typeof createUniver>;
const STORAGE_KEY = 'proofline:p0:local-workbook'; // Retain P0 snapshots without migration or unverifiable metadata.
type RemoteLoad = { sequence: number; snapshot: object; status: string; error: string | null };
type ProModule = typeof UniverPro;
// Univer browser license (license.txt contents). Inlined at build time; redeploy after changing it.
const UNIVER_LICENSE = (process.env.NEXT_PUBLIC_UNIVER_LICENSE ?? '').trim();
// Local-only switch to try licensed features without a license; Univer then shows its watermark.
const PRO_PREVIEW = process.env.NEXT_PUBLIC_UNIVER_PRO_PREVIEW === '1';
const PRO_ENABLED = UNIVER_LICENSE.length > 0 || PRO_PREVIEW;

export default function UniverPanel({ analysis, version, verification, onVerification, remoteLoad,
  serverUser, selectedRevision, onServerSave, restoreLocalInitially, emptyState = null }: {
  analysis: Analysis | null;
  version: number;
  verification: VerificationState;
  onVerification: Dispatch<VerificationAction>;
  remoteLoad: RemoteLoad | null;
  serverUser: string | null;
  selectedRevision: number | null;
  onServerSave: (snapshot: object, unsupportedOperation: boolean) => Promise<{ status: string; error: string | null; revision: number }>;
  restoreLocalInitially: boolean;
  /** Shown over the grid while there is no workbook yet. */
  emptyState?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<UniverSetup | null>(null);
  const scheduleRef = useRef<() => void>(() => {});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const replacingRef = useRef(false);
  const unsupportedRef = useRef(false);
  const unverifiedReasonRef = useRef('A structural worksheet edit needs a fresh validated CSV import before claims can be verified');
  const [ready, setReady] = useState(false);
  const proRef = useRef<ProModule | null>(null);
  const [proMode, setProMode] = useState<'off' | 'licensed' | 'preview'>('off');
  const [notice, setNotice] = useState('Initializing Univer Sheets…');

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    const container = document.createElement('div');
    container.style.height = '100%';
    host.appendChild(container);
    let sdk: UniverSetup | null = null;
    const subscriptions: { dispose(): void }[] = [];

    const scheduleValidation = () => {
      if (replacingRef.current) return;
      if (unsupportedRef.current) {
        onVerification({ type: 'invalid', error: unverifiedReasonRef.current });
        setNotice(`${unverifiedReasonRef.current} Import validated CSVs to restore claim verification.`);
        return;
      }
      onVerification({ type: 'stale' });
      const generation = ++generationRef.current;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (generation !== generationRef.current) return;
        if (unsupportedRef.current) return;
        try {
          const sheet = sdkRef.current?.univerAPI.getActiveWorkbook()?.getActiveSheet();
          if (!sheet) throw new Error('Proofline worksheet is missing');
          const lastRow = sheet.getLastRow();
          if (lastRow >= 1200) throw new Error('Workbook exceeds the 1200-row local verification limit');
          const sourceRange = sheet.getRange(0, 0, Math.max(lastRow + 1, 1), 5);
          const values = sourceRange.getValues() as GridValue[][];
          const formulas = sourceRange.getFormulas();
          const result = analyzeWorkbookGrid(values, formulas);
          onVerification({ type: 'verified', analysis: result });
          setNotice(`Independently verified ${result.transactions.length} transaction records from current Univer source cells.`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          onVerification({ type: 'invalid', error: message });
          setNotice(`Workbook requires repair: ${message}`);
        }
      }, 180);
    };
    scheduleRef.current = scheduleValidation;

    let disposed = false;
    const init = async () => {
    try {
      let pro: ReturnType<ProModule['proPresets']> | null = null;
      if (PRO_ENABLED) {
        try {
          const mod = await import('@/lib/univer-pro');
          pro = mod.proPresets(UNIVER_LICENSE);
          proRef.current = mod;
        } catch (error) {
          proRef.current = null;
          console.error('Univer licensed features could not load; continuing with open-source Sheets.', error);
        }
        if (disposed) return;
      }
      sdk = createUniver({
        locale: LocaleType.EN_US,
        locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS, ...(pro?.locales ?? [])) },
        presets: [UniverSheetsCorePreset({ container }), ...(pro?.presets ?? [])],
      });
      sdkRef.current = sdk;
      setProMode(pro ? (UNIVER_LICENSE ? 'licensed' : 'preview') : 'off');
      let stored: object | undefined;
      try {
        const raw = restoreLocalInitially ? window.localStorage.getItem(STORAGE_KEY) : null;
        if (raw) stored = JSON.parse(raw) as object;
      } catch {
        setNotice('Previous local workbook could not be restored. Load CSVs to create a new workbook.');
      }
      sdk.univerAPI.createWorkbook(stored ?? {});

      subscriptions.push(sdk.univerAPI.addEvent(sdk.univerAPI.Event.SheetValueChanged, ({ effectedRanges }) => {
        if (!effectedRanges.length || effectedRanges.some(range => range.getColumn() < 5 && range.getColumn() + range.getWidth() > 0)) {
          scheduleValidation();
        }
      }));
      subscriptions.push(sdk.univerAPI.addEvent(sdk.univerAPI.Event.CommandExecuted, ({ id }) => {
        if (isUnsupportedStructuralCommand(id)) {
          unsupportedRef.current = true;
          unverifiedReasonRef.current = 'A structural worksheet edit needs a fresh validated CSV import before claims can be verified.';
          generationRef.current++;
          if (timerRef.current) clearTimeout(timerRef.current);
          scheduleValidation();
        }
      }));
      subscriptions.push(sdk.univerAPI.addEvent(sdk.univerAPI.Event.ActiveSheetChanged, scheduleValidation));
      subscriptions.push(sdk.univerAPI.addEvent(sdk.univerAPI.Event.SheetDeleted, scheduleValidation));

      setReady(true);
      if (stored) {
        setNotice('Restored local workbook. Revalidating source cells…');
        scheduleValidation();
      } else {
        setNotice('Univer editor ready. Load sample CSVs or upload your own.');
      }
    } catch (error) {
      setNotice(`Univer initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      onVerification({ type: 'invalid', error: 'Univer initialization failed' });
    }
    };
    void init();
    return () => {
      disposed = true;
      generationRef.current++;
      if (timerRef.current) clearTimeout(timerRef.current);
      subscriptions.forEach(subscription => subscription.dispose());
      scheduleRef.current = () => {};
      sdkRef.current = null;
      queueMicrotask(() => { sdk?.univer.dispose(); container.remove(); });
    };
  }, [onVerification, restoreLocalInitially]);

  useEffect(() => {
    if (!ready || !analysis || !sdkRef.current) return;
    replacingRef.current = true;
    unsupportedRef.current = false;
    generationRef.current++;
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      const { univerAPI } = sdkRef.current;
      const previous = univerAPI.getActiveWorkbook();
      if (previous) univerAPI.disposeUnit(previous.getId());
      univerAPI.createWorkbook({});
      const sheet = univerAPI.getActiveWorkbook()?.getActiveSheet();
      if (!sheet) throw new Error('Univer did not create a worksheet');
      const matrix = workbookMatrix(analysis);
      sheet.getRange(`A1:E${matrix.length}`).setValues(matrix);
      try { styleWorkbook(sheet, analysis.summaries.length); }
      catch (error) { console.warn('Workbook formatting skipped', error); }
      setNotice(`Imported ${analysis.transactions.length} transactions. Independently revalidating the workbook…`);
      const pro = proRef.current;
      if (pro) {
        void pro.insertBudgetChart(univerAPI, sheet, analysis.summaries.length).catch((error: unknown) => {
          console.error('Budget chart could not be inserted', error);
          setNotice(`Workbook imported, but the budget chart could not be added: ${error instanceof Error ? error.message : String(error)}`);
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onVerification({ type: 'invalid', error: message });
      setNotice(`Workbook import failed: ${message}`);
      return;
    } finally {
      replacingRef.current = false;
    }
    scheduleRef.current();
  }, [analysis, version, ready, onVerification]);

  useEffect(() => {
    if (!ready || !remoteLoad || !sdkRef.current) return;
    replacingRef.current = true;
    generationRef.current++;
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      const { univerAPI } = sdkRef.current;
      const previous = univerAPI.getActiveWorkbook();
      if (previous) univerAPI.disposeUnit(previous.getId());
      univerAPI.createWorkbook(remoteLoad.snapshot);
      unsupportedRef.current = remoteLoad.status !== 'verified';
      if (unsupportedRef.current) unverifiedReasonRef.current = remoteLoad.error || 'Server validation failed for this revision.';
      setNotice(unsupportedRef.current
        ? `Loaded unverified private revision: ${remoteLoad.error || 'server validation failed'}. Import validated CSVs to restore claim verification.`
        : 'Loaded private server revision. Revalidating source cells…');
    } catch (error) {
      onVerification({ type: 'invalid', error: error instanceof Error ? error.message : String(error) });
      setNotice('Private workbook could not be loaded into Univer.');
      return;
    } finally { replacingRef.current = false; }
    scheduleRef.current();
  }, [remoteLoad, ready, onVerification]);

  function saveLocal() {
    try {
      const snapshot = sdkRef.current?.univerAPI.getActiveWorkbook()?.save();
      if (!snapshot) throw new Error('No active workbook');
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      setNotice(verification.phase === 'verified'
        ? 'Saved verified workbook to this browser. It will be revalidated on reload.'
        : 'Saved workbook to this browser. Claims remain unverified until source cells validate.');
    } catch (error) {
      setNotice(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function saveServer() {
    try {
      const snapshot = sdkRef.current?.univerAPI.getActiveWorkbook()?.save();
      if (!snapshot) throw new Error('No active workbook');
      const result = await onServerSave(snapshot, unsupportedRef.current);
      if (result.status === 'invalid') {
        onVerification({ type: 'invalid', error: result.error || 'Server could not verify this revision' });
      }
      setNotice(result.status === 'verified'
        ? `Saved private server revision ${result.revision}. Source cells were independently verified.`
        : `Saved private server revision ${result.revision}, but claims remain unverified: ${result.error}`);
    } catch (error) {
      setNotice(`Private save failed. The editor and browser-local P1 copy were not overwritten: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const saveLabel = serverUser ? (selectedRevision ? `Revision ${selectedRevision}` : 'Not saved to your account yet') : 'Sign in to save revisions';
  return (
    <section className="ws-card ws-sheet-card" aria-label="Univer spreadsheet">
      <div className="ws-sheetbar">
        <div className="ws-sheetbar-title">
          <h2>Evidence workbook</h2>
          <span className="ws-chip">Univer Sheets</span>
          {proMode === 'licensed' && <span className="ws-chip strong">Licensed features</span>}
          {proMode === 'preview' && <span className="ws-chip warn">Licensed preview, no license</span>}
        </div>
        <div className="button-row">
          <button type="button" onClick={saveLocal} disabled={!ready}>Save on this device</button>
          <button type="button" className="primary" onClick={() => void saveServer()} disabled={!ready || !serverUser}
            title={serverUser ? 'Save a private revision to your account' : 'Sign in to save revisions'}>Save revision</button>
        </div>
      </div>
      <p className="ws-sheet-status" role="status"><span className={`ws-dot ${verification.phase}`} aria-hidden="true" />{notice}<span className="ws-save-meta">{saveLabel}</span></p>
      <div className="ws-editor-wrap">
        <div className="editor-host" ref={containerRef} />
        {emptyState && ready && <div className="ws-empty">{emptyState}</div>}
      </div>
      <p className="fineprint">Totals are certified from the source rows in whole cents; spreadsheet formulas stay editable but never certify a total. Inserting, deleting, moving or sorting rows puts totals on hold until a fresh import.{proMode !== 'off' ? ' The Budget vs actual chart is drawn by Univer from the workbook formulas.' : ''}</p>
    </section>
  );
}

/** Readable formatting for an imported Proofline workbook: bold headers, header tint, column widths. Values untouched. */
function styleWorkbook(sheet: NonNullable<ReturnType<NonNullable<ReturnType<UniverSetup['univerAPI']['getActiveWorkbook']>>['getActiveSheet']>>,
  categoryCount: number) {
  const txHeaderRow = categoryCount + 6;
  [96, 112, 116, 150, 116].forEach((width, column) => sheet.setColumnWidth(column, width));
  sheet.getRange('A1').setFontWeight('bold').setFontSize(13);
  for (const row of [3, txHeaderRow]) {
    sheet.getRange(`A${row}:E${row}`).setFontWeight('bold').setBackgroundColor('#EEE8DF');
  }
  // No number formats: in Univer 1.3.1 a format such as #,##0.00 makes FRange.getValues() return display
  // text ("1,500.00"), which the verifier correctly rejects as an invalid amount (ledger I-014).
}
