'use client';

import { useEffect, useRef, useState, type Dispatch } from 'react';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import type { Analysis } from '@/lib/finance';
import { workbookMatrix } from '@/lib/finance';
import { analyzeWorkbookGrid, type GridValue, type VerificationAction, type VerificationState } from '@/lib/verification';
import '@univerjs/preset-sheets-core/lib/index.css';

type UniverSetup = ReturnType<typeof createUniver>;
const STORAGE_KEY = 'proofline:p0:local-workbook'; // Retain P0 snapshots without migration or unverifiable metadata.
const STRUCTURAL_COMMAND = /^sheet\.command\.(?:insert|remove|delete|move)-(?:row|col|range)/;

export default function UniverPanel({ analysis, version, verification, onVerification }: {
  analysis: Analysis | null;
  version: number;
  verification: VerificationState;
  onVerification: Dispatch<VerificationAction>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<UniverSetup | null>(null);
  const scheduleRef = useRef<() => void>(() => {});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const replacingRef = useRef(false);
  const [ready, setReady] = useState(false);
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
      onVerification({ type: 'stale' });
      const generation = ++generationRef.current;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (generation !== generationRef.current) return;
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

    try {
      sdk = createUniver({
        locale: LocaleType.EN_US,
        locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS) },
        presets: [UniverSheetsCorePreset({ container })],
      });
      sdkRef.current = sdk;
      let stored: object | undefined;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
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
        if (STRUCTURAL_COMMAND.test(id)) scheduleValidation();
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
    return () => {
      generationRef.current++;
      if (timerRef.current) clearTimeout(timerRef.current);
      subscriptions.forEach(subscription => subscription.dispose());
      scheduleRef.current = () => {};
      sdkRef.current = null;
      queueMicrotask(() => { sdk?.univer.dispose(); container.remove(); });
    };
  }, [onVerification]);

  useEffect(() => {
    if (!ready || !analysis || !sdkRef.current) return;
    replacingRef.current = true;
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
      setNotice(`Imported ${analysis.transactions.length} transactions. Independently revalidating the workbook…`);
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

  return (
    <section className="editor-card" aria-label="Univer spreadsheet">
      <div className="editor-heading">
        <div><span className="eyebrow">UNIVER SHEETS · REAL SDK</span><h2>Evidence workbook</h2></div>
        <button type="button" onClick={saveLocal} disabled={!ready}>Save workbook locally</button>
      </div>
      <div className="editor-host" ref={containerRef} />
      <p className="editor-status" role="status">{notice}</p>
      <p className="fineprint">Claims use validated source cells and integer-cent arithmetic. Spreadsheet formulas remain editable and do not certify Proofline's independent totals. Storage is browser-local.</p>
    </section>
  );
}
