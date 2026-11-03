/**
 * Financial source of truth for Proofline P0.
 * No AI inference occurs in this module. All money is represented in integer cents.
 */
export type Budget = { category: string; budgetCents: number; sourceRow: number };
export type Transaction = {
  id: string; date: string; category: string; description: string;
  amountCents: number; sourceRow: number;
};
export type Summary = {
  category: string; budgetCents: number; actualCents: number;
  varianceCents: number; status: 'over budget' | 'within budget' | 'unbudgeted';
  transactionIds: string[];
};
export type Analysis = {
  budgets: Budget[]; transactions: Transaction[]; summaries: Summary[];
  budgetTotalCents: number; actualTotalCents: number;
  exceptionCount: number;
};

const unsafeSpreadsheetText = /^[\s]*[=+\-@]/;

function safeText(value: string, field: string, row: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} is blank on CSV row ${row}`);
  if (unsafeSpreadsheetText.test(trimmed)) {
    throw new Error(`${field} on CSV row ${row} starts with a potentially unsafe spreadsheet character`);
  }
  return trimmed;
}

export function parseCsv(text: string): string[][] {
  // RFC-4180-style quoted fields and CRLF support for the two fixed MVP templates.
  // BOM accepted; formula-looking text is rejected at the column-validation stage.
  const input = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let cells: string[] = [];
  let value = '';
  let quoted = false;
  let closedQuote = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (closedQuote && ch !== ',' && ch !== '\n' && ch !== '\r') {
      throw new Error(`Unexpected character after closing quote near character ${i + 1}`);
    }
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { value += '"'; i++; }
      else if (quoted) { quoted = false; closedQuote = true; }
      else if (value.length === 0) quoted = true;
      else throw new Error(`Unexpected quote near character ${i + 1}`);
    } else if (ch === ',' && !quoted) {
      cells.push(value); value = ''; closedQuote = false;
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      cells.push(value); value = '';
      if (!cells.every(c => !c.trim())) rows.push(cells);
      cells = []; closedQuote = false;
      if (ch === '\r' && input[i + 1] === '\n') i++;
    } else {
      value += ch;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field');
  cells.push(value);
  if (!cells.every(c => !c.trim())) rows.push(cells);
  return rows;
}

function records(text: string, columns: string[]): string[][] {
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('CSV is empty');
  const actual = rows[0].map(c => c.trim().toLowerCase());
  if (actual.join('|') !== columns.join('|')) {
    throw new Error(`Required header: ${columns.join(',')}`);
  }
  if (rows.length < 2) throw new Error('CSV has no data rows');
  if (rows.length > 501) throw new Error('P0 limit: 500 data rows per CSV');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length !== columns.length) {
      throw new Error(`CSV row ${i + 1} has ${rows[i].length} columns; expected ${columns.length}`);
    }
  }
  return rows.slice(1);
}

export function toCents(raw: string, row: number): number {
  const amount = raw.trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(amount)) {
    throw new Error(`Invalid money value on CSV row ${row}: ${JSON.stringify(raw)}`);
  }
  const negative = amount.startsWith('-');
  const [whole, fraction = ''] = (negative ? amount.slice(1) : amount).split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error(`Money value too large on CSV row ${row}`);
  return negative ? -result : result;
}

export function parseBudgets(text: string): Budget[] {
  const rows = records(text, ['category', 'budget']);
  const seen = new Set<string>();
  return rows.map(([category, budget], index) => {
    const row = index + 2;
    const name = safeText(category, 'Category', row);
    const key = name.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate budget category at CSV row ${row}: ${name}`);
    seen.add(key);
    const budgetCents = toCents(budget, row);
    if (budgetCents < 0) throw new Error(`Budget cannot be negative on row ${row}`);
    return { category: name, budgetCents, sourceRow: row };
  });
}

export function parseTransactions(text: string): Transaction[] {
  const rows = records(text, ['id', 'date', 'category', 'description', 'amount']);
  const seen = new Set<string>();
  return rows.map(([id, date, category, description, amount], index) => {
    const row = index + 2;
    const txId = safeText(id, 'ID', row);
    if (seen.has(txId.toLowerCase())) throw new Error(`Duplicate transaction ID ${txId} at row ${row}`);
    seen.add(txId.toLowerCase());
    const normalizedDate = date.trim();
    const dateObject = new Date(`${normalizedDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) ||
        Number.isNaN(dateObject.getTime()) ||
        dateObject.toISOString().slice(0, 10) !== normalizedDate) {
      throw new Error(`Invalid ISO date at CSV row ${row}`);
    }
    return {
      id: txId,
      date: normalizedDate,
      category: safeText(category, 'Category', row),
      description: safeText(description, 'Description', row),
      amountCents: toCents(amount, row),
      sourceRow: row,
    };
  });
}

export function analyze(budgets: Budget[], transactions: Transaction[]): Analysis {
  const keys = new Map<string, { category: string; budgetCents: number; actualCents: number; transactionIds: string[]; hasBudget: boolean }>();
  for (const budget of budgets) {
    keys.set(budget.category.toLowerCase(), {
      category: budget.category, budgetCents: budget.budgetCents, actualCents: 0,
      transactionIds: [], hasBudget: true,
    });
  }
  for (const tx of transactions) {
    const key = tx.category.toLowerCase();
    const entry = keys.get(key) ?? {
      category: tx.category, budgetCents: 0, actualCents: 0,
      transactionIds: [], hasBudget: false,
    };
    entry.actualCents += tx.amountCents;
    if (!Number.isSafeInteger(entry.actualCents)) throw new Error('Total exceeds safe integer range');
    entry.transactionIds.push(tx.id);
    keys.set(key, entry);
  }
  const summaries = [...keys.values()].map(e => {
    const varianceCents = e.actualCents - e.budgetCents;
    return {
      category: e.category, budgetCents: e.budgetCents, actualCents: e.actualCents,
      varianceCents,
      status: !e.hasBudget ? 'unbudgeted' as const :
        varianceCents > 0 ? 'over budget' as const : 'within budget' as const,
      transactionIds: e.transactionIds,
    };
  });
  const budgetTotalCents = summaries.reduce((acc, x) => acc + x.budgetCents, 0);
  const actualTotalCents = summaries.reduce((acc, x) => acc + x.actualCents, 0);
  if (!Number.isSafeInteger(budgetTotalCents) || !Number.isSafeInteger(actualTotalCents)) {
    throw new Error('Total exceeds safe integer range');
  }
  return {
    budgets, transactions, summaries, budgetTotalCents, actualTotalCents,
    exceptionCount: summaries.filter(x => x.status !== 'within budget').length,
  };
}

export function money(cents: number): string {
  return `${cents < 0 ? '-' : ''}${(Math.abs(cents) / 100).toFixed(2)}`;
}

export type Cell = string | number;
export function workbookMatrix(analysis: Analysis): Cell[][] {
  const { summaries, transactions } = analysis;
  const matrix: Cell[][] = [['PROOFLINE / EVIDENCE WORKBOOK', '', '', '', ''], ['', '', '', '', ''], ['Category', 'Budget', 'Actual (formula)', 'Variance (formula)', 'Status']];
  const firstTransactionRow = summaries.length + 7; // 1-indexed, after 2 spacer rows and transaction header
  const lastTransactionRow = firstTransactionRow + transactions.length - 1;
  for (const s of summaries) {
    const current = matrix.length + 1; // 1-based Excel row
    matrix.push([
      s.category, s.budgetCents / 100,
      `=SUMIF(C${firstTransactionRow}:C${lastTransactionRow},A${current},E${firstTransactionRow}:E${lastTransactionRow})`,
      `=C${current}-B${current}`,
      `=IF(AND(B${current}=0,C${current}>0),"Check budget",IF(D${current}>0,"Over budget","Within budget"))`,
    ]);
  }
  matrix.push(['', '', '', '', '']);
  matrix.push(['', '', '', '', '']);
  matrix.push(['Date', 'Transaction ID', 'Category', 'Description', 'Amount']);
  for (const tx of transactions) {
    matrix.push([tx.date, tx.id, tx.category, tx.description, tx.amountCents / 100]);
  }
  return matrix;
}
