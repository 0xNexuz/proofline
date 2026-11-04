import { createHash } from 'node:crypto';
import { analyzeWorkbookGrid, buildClaims, type GridValue } from '../verification.ts';
import type { Analysis } from '../finance.ts';

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const MAX_SNAPSHOT_BYTES = 2_000_000;

type RecordValue = Record<string, unknown>;
function object(value: unknown): RecordValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null;
}

function dateCell(value: number, cell: RecordValue, root: RecordValue): string | null {
  const styles = object(root.styles);
  const style = typeof cell.s === 'string' ? object(styles?.[cell.s]) : object(cell.s);
  const numberFormat = object(style?.n);
  if (numberFormat?.pattern !== 'yyyy-mm-dd' || !Number.isSafeInteger(value) || value < 0 || value > 2_958_465) return null;
  const system = root.dateSystem ?? 'date1900';
  if (system !== 'date1900' && system !== 'date1904') return null;
  // Excel's 1900 system includes its historic leap-year offset after serial 60.
  if (system === 'date1900' && value <= 60) return null;
  const epoch = system === 'date1900' ? Date.UTC(1899, 11, 30) : Date.UTC(1904, 0, 1);
  return new Date(epoch + value * 86_400_000).toISOString().slice(0, 10);
}

export type SnapshotResult = {
  workbookUnitId: string;
  snapshotJson: string;
  sha256: string;
  status: 'verified' | 'invalid';
  error: string | null;
  analysis: Analysis | null;
  claims: ReturnType<typeof buildClaims>;
};

export function inspectSnapshot(snapshot: unknown, unsupportedOperation = false): SnapshotResult {
  const snapshotJson = JSON.stringify(snapshot);
  if (!snapshotJson || Buffer.byteLength(snapshotJson, 'utf8') > MAX_SNAPSHOT_BYTES) {
    throw new Error('Workbook snapshot is missing or exceeds the 2 MB local limit');
  }
  const root = object(snapshot);
  if (!root || typeof root.id !== 'string' || !root.id || !Array.isArray(root.sheetOrder) || !object(root.sheets)) {
    throw new Error('Malformed Univer workbook snapshot');
  }
  const workbookUnitId = root.id;
  const sha256 = createHash('sha256').update(snapshotJson).digest('hex');
  let analysis: Analysis | null = null;
  let error: string | null = null;
  try {
    if (unsupportedOperation) throw new Error('A structural worksheet operation needs a fresh validated import before claims can be verified');
    if (root.sheetOrder.length !== 1 || typeof root.sheetOrder[0] !== 'string') {
      throw new Error('Only one Proofline source worksheet is supported');
    }
    const sheet = object((root.sheets as RecordValue)[root.sheetOrder[0]]);
    const cells = object(sheet?.cellData);
    if (!sheet || !cells) throw new Error('Proofline worksheet cell data is missing');
    const rowKeys = Object.keys(cells);
    if (rowKeys.some(key => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= 1200)) {
      throw new Error('Workbook source rows exceed the 1200-row local limit');
    }
    const lastRow = Math.max(0, ...rowKeys.map(Number));
    const values: GridValue[][] = Array.from({ length: lastRow + 1 }, () => Array(5).fill(null));
    const formulas: string[][] = Array.from({ length: lastRow + 1 }, () => Array(5).fill(''));
    for (const key of rowKeys) {
      const row = object(cells[key]);
      if (!row) throw new Error('Malformed worksheet row data');
      for (const [columnKey, rawCell] of Object.entries(row)) {
        if (!/^(0|[1-9]\d*)$/.test(columnKey)) throw new Error('Malformed worksheet column index');
        const column = Number(columnKey);
        if (column >= 5) continue;
        const cell = object(rawCell);
        if (!cell) throw new Error('Malformed worksheet cell data');
        const value = cell.v;
        if (value !== undefined && value !== null && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          throw new Error(`Unsupported source cell value on sheet row ${Number(key) + 1}`);
        }
        values[Number(key)][column] = column === 0 && typeof value === 'number'
          ? (dateCell(value, cell, root) ?? value) : value as GridValue;
        if (cell.f != null) {
          if (typeof cell.f !== 'string') throw new Error('Malformed worksheet formula');
          formulas[Number(key)][column] = cell.f;
        }
      }
    }
    analysis = analyzeWorkbookGrid(values, formulas);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Workbook could not be verified';
  }
  return {
    workbookUnitId, snapshotJson, sha256,
    status: analysis ? 'verified' : 'invalid', error, analysis,
    claims: analysis ? buildClaims(analysis, null) : [],
  };
}
