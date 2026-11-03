import {
  analyze, parseBudgets, parseTransactions,
  type Analysis, type Budget, type Transaction,
} from './finance.ts';

export type GridValue = string | number | boolean | null | undefined;
export type VerificationPhase = 'idle' | 'stale' | 'verified' | 'invalid';
export type VerificationState = {
  phase: VerificationPhase;
  current: Analysis | null;
  previous: Analysis | null;
  error: string | null;
};
export type VerificationAction =
  | { type: 'stale' }
  | { type: 'verified'; analysis: Analysis }
  | { type: 'invalid'; error: string };

export const initialVerification: VerificationState = {
  phase: 'idle', current: null, previous: null, error: null,
};

export function verificationReducer(state: VerificationState, action: VerificationAction): VerificationState {
  if (action.type === 'stale') {
    return { phase: 'stale', current: null, previous: state.current ?? state.previous, error: null };
  }
  if (action.type === 'invalid') {
    return { phase: 'invalid', current: null, previous: state.current ?? state.previous, error: action.error };
  }
  return { phase: 'verified', current: action.analysis, previous: state.current ?? state.previous, error: null };
}

function label(value: GridValue): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sourceText(value: GridValue, field: string, row: number): string {
  if (typeof value !== 'string') throw new Error(`${field} must be text on sheet row ${row}`);
  return value;
}

function sourceMoney(value: GridValue, field: string, row: number): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`${field} must be a money value on sheet row ${row}`);
  }
  return String(value);
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function withSheetRows<T>(parse: () => T, rows: { row: number }[]): T {
  try {
    return parse();
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new Error(error.message.replace(/\b(?:CSV )?row (\d+)\b/g, (match, number: string) => {
      const sheetRow = rows[Number(number) - 2]?.row;
      return sheetRow === undefined ? match : `sheet row ${sheetRow}`;
    }));
  }
}

function assertLiteral(formulas: string[][], row: number, columns: number[]): void {
  for (const column of columns) {
    if (formulas[row]?.[column]) {
      throw new Error(`Source formula is not allowed at sheet row ${row + 1}, column ${column + 1}`);
    }
  }
}

/**
 * Read only the source columns of the P0/P1 workbook. Formula output columns are
 * deliberately excluded from financial certification.
 */
export function analyzeWorkbookGrid(values: GridValue[][], formulas: string[][] = []): Analysis {
  if (values.length > 1200) throw new Error('Workbook exceeds the 1200-row local verification limit');
  if (label(values[0]?.[0]) !== 'PROOFLINE / EVIDENCE WORKBOOK') {
    throw new Error('Proofline workbook title is missing');
  }
  const budgetHeaders = values.flatMap((row, index) =>
    label(row[0]) === 'Category' && label(row[1]) === 'Budget' ? [index] : []);
  const transactionHeaders = values.flatMap((row, index) =>
    ['Date', 'Transaction ID', 'Category', 'Description', 'Amount'].every((name, col) => label(row[col]) === name) ? [index] : []);
  if (budgetHeaders.length !== 1 || transactionHeaders.length !== 1 || transactionHeaders[0] <= budgetHeaders[0]) {
    throw new Error('Proofline source headers are missing, duplicated, or out of order');
  }
  const budgetHeader = budgetHeaders[0];
  const transactionHeader = transactionHeaders[0];
  const budgetRows: { row: number; cells: string[] }[] = [];
  const transactionRows: { row: number; cells: string[] }[] = [];

  for (let index = budgetHeader + 1; index < transactionHeader; index++) {
    const row = values[index] ?? [];
    if (row.slice(0, 2).every(value => value == null || value === '')) continue;
    assertLiteral(formulas, index, [0, 1]);
    budgetRows.push({
      row: index + 1,
      cells: [sourceText(row[0], 'Category', index + 1), sourceMoney(row[1], 'Budget', index + 1)],
    });
  }
  for (let index = transactionHeader + 1; index < values.length; index++) {
    const row = values[index] ?? [];
    if (row.slice(0, 5).every(value => value == null || value === '')) continue;
    assertLiteral(formulas, index, [0, 1, 2, 3, 4]);
    transactionRows.push({
      row: index + 1,
      cells: [
        sourceText(row[1], 'Transaction ID', index + 1),
        sourceText(row[0], 'Date', index + 1),
        sourceText(row[2], 'Category', index + 1),
        sourceText(row[3], 'Description', index + 1),
        sourceMoney(row[4], 'Amount', index + 1),
      ],
    });
  }
  if (budgetRows.length > 500 || transactionRows.length > 500) {
    throw new Error('P1 limit: 500 budget and 500 transaction rows');
  }
  const budgets: Budget[] = budgetRows.length ? withSheetRows(() => parseBudgets(
    `category,budget\n${budgetRows.map(({ cells }) => cells.map(csvCell).join(',')).join('\n')}`,
  ), budgetRows).map((budget, index) => ({ ...budget, sourceRow: budgetRows[index].row })) : [];
  const transactions: Transaction[] = transactionRows.length ? withSheetRows(() => parseTransactions(
    `id,date,category,description,amount\n${transactionRows.map(({ cells }) => cells.map(csvCell).join(',')).join('\n')}`,
  ), transactionRows).map((transaction, index) => ({ ...transaction, sourceRow: transactionRows[index].row })) : [];
  return analyze(budgets, transactions);
}

export type Claim = {
  id: string;
  title: string;
  method: string;
  valueCents: number | null;
  previousCents: number | null;
  sourceRecords: Transaction[];
  budgetSources: Budget[];
};

export function buildClaims(current: Analysis | null, previous: Analysis | null): Claim[] {
  const basis = current ?? previous;
  if (!basis) return [];
  const oldSummaries = new Map(previous?.summaries.map(summary => [summary.category.toLowerCase(), summary]) ?? []);
  const currentSummaries = new Map(current?.summaries.map(summary => [summary.category.toLowerCase(), summary]) ?? []);
  const source = basis;
  const claims: Claim[] = [
    {
      id: 'total:actual', title: 'Total actual spend', method: 'Sum all validated transaction amounts in integer cents',
      valueCents: current?.actualTotalCents ?? null, previousCents: previous?.actualTotalCents ?? null,
      sourceRecords: source?.transactions ?? [], budgetSources: [],
    },
    {
      id: 'total:budget', title: 'Total budget', method: 'Sum all validated budget rows in integer cents',
      valueCents: current?.budgetTotalCents ?? null, previousCents: previous?.budgetTotalCents ?? null,
      sourceRecords: [], budgetSources: source?.budgets ?? [],
    },
  ];
  const categories = new Map([...oldSummaries, ...currentSummaries]);
  for (const [key, summary] of categories) {
    const updated = currentSummaries.get(key);
    const old = oldSummaries.get(key);
    const transactions = source.transactions.filter(tx => tx.category.toLowerCase() === key);
    const budgets = source.budgets.filter(budget => budget.category.toLowerCase() === key);
    claims.push({
      id: `category:${key}:actual`, title: `${summary.category} actual`,
      method: 'Sum validated transaction amounts whose category matches this claim',
      valueCents: current ? (updated?.actualCents ?? 0) : null, previousCents: old?.actualCents ?? null,
      sourceRecords: transactions, budgetSources: [],
    });
    claims.push({
      id: `category:${key}:variance`, title: `${summary.category} variance`,
      method: 'Validated category actual minus validated category budget',
      valueCents: current ? (updated?.varianceCents ?? 0) : null, previousCents: old?.varianceCents ?? null,
      sourceRecords: transactions, budgetSources: budgets,
    });
  }
  return claims;
}
