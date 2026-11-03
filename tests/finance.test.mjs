import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  parseCsv, parseBudgets, parseTransactions, toCents, analyze, workbookMatrix,
} from '../lib/finance.ts';

const budgetCsv = 'category,budget\nLogistics,700.00\nOperations,1500.00';
const transactionsCsv = 'id,date,category,description,amount\nT-1,2026-10-01,Logistics,Transport,500.00\nT-2,2026-10-02,Logistics,Fuel,300.50\nT-3,2026-10-03,Operations,Refund,-10.00';

test('parses quoted fields and embedded commas safely', () => {
  assert.deepEqual(parseCsv('a,b\r\n"quoted, value","a""b"\r\n'), [
    ['a', 'b'], ['quoted, value', 'a"b'],
  ]);
});
test('rejects malformed quoted fields instead of silently changing source values', () => {
  assert.throws(() => parseCsv('a,b\n"foo"bar,baz'), /Unexpected character after closing quote/);
  assert.throws(() => parseCsv('a,b\n"unclosed,baz'), /unclosed quoted field/);
});
test('integer cents reject extra precision', () => {
  assert.equal(toCents('0.01', 2), 1);
  assert.equal(toCents('-4.50', 2), -450);
  assert.throws(() => toCents('2.123', 2), /Invalid money/);
});
test('budgets and transactions produce independently verifiable results', () => {
  const report = analyze(parseBudgets(budgetCsv), parseTransactions(transactionsCsv));
  assert.equal(report.budgetTotalCents, 220000);
  assert.equal(report.actualTotalCents, 79050);
  assert.equal(report.exceptionCount, 1);
  const logistics = report.summaries.find(s => s.category === 'Logistics');
  assert.equal(logistics.actualCents, 80050);
  assert.equal(logistics.varianceCents, 10050);
  assert.deepEqual(logistics.transactionIds, ['T-1', 'T-2']);
});
test('an unbudgeted category is explicitly marked', () => {
  const report = analyze(parseBudgets(budgetCsv), parseTransactions('id,date,category,description,amount\nT-9,2026-10-01,Marketing,Posters,20.00'));
  assert.equal(report.summaries.find(s => s.category === 'Marketing').status, 'unbudgeted');
});
test('duplicate transaction IDs and formula-looking descriptions are rejected', () => {
  const duplicate = 'id,date,category,description,amount\nT-1,2026-10-01,Logistics,Transport,2.00\nT-1,2026-10-01,Logistics,Fuel,3.00';
  assert.throws(() => parseTransactions(duplicate), /Duplicate transaction ID/);
  assert.throws(() => parseTransactions('id,date,category,description,amount\nT-1,2026-10-01,Logistics,=HYPERLINK(),2.00'), /unsafe spreadsheet character/);
});
test('workbook matrix includes true Univer formula strings and source IDs', () => {
  const report = analyze(parseBudgets(budgetCsv), parseTransactions(transactionsCsv));
  const rows = workbookMatrix(report);
  assert.match(String(rows[3][2]), /SUMIF/);
  assert.match(String(rows[3][3]), /C4-B4/);
  assert.equal(rows[rows.length - 1][1], 'T-3');
});
test('rejects impossible calendar days rather than silently normalizing them', () => {
  assert.throws(() => parseTransactions('id,date,category,description,amount\nT-1,2026-02-30,Logistics,Taxi,1.00'), /Invalid ISO date/);
});
test('sample CSV files reproduce the P0 financial acceptance figures', () => {
  const budgets = readFileSync(new URL('../data/sample-budget.csv', import.meta.url), 'utf8');
  const transactions = readFileSync(new URL('../data/sample-transactions.csv', import.meta.url), 'utf8');
  const report = analyze(parseBudgets(budgets), parseTransactions(transactions));
  assert.equal(report.budgetTotalCents, 300000);
  assert.equal(report.actualTotalCents, 213500);
  assert.equal(report.transactions.length, 6);
  assert.equal(report.summaries.length, 4);
  assert.equal(report.summaries.find(s => s.category === 'Logistics').actualCents, 89000);
  assert.equal(report.summaries.find(s => s.category === 'Outreach').status, 'unbudgeted');
  assert.equal(report.summaries.find(s => s.category === 'Outreach').actualCents, 8000);
  const matrix = workbookMatrix(report);
  assert.equal(matrix[3][2], '=SUMIF(C11:C16,A4,E11:E16)');
  assert.equal(matrix[15][1], 'T-006');
});
test('rejects invalid headers, repeated categories, unsafe IDs, and unsafe totals', () => {
  assert.throws(() => parseBudgets('name,budget\nLogistics,1.00'), /Required header/);
  assert.throws(() => parseBudgets('category,budget\nLogistics,1.00\nlogistics,2.00'), /Duplicate budget category/);
  assert.throws(() => parseTransactions('id,date,category,description,amount\n=1,2026-10-01,Logistics,Fuel,1.00'), /unsafe spreadsheet character/);
  assert.throws(() => toCents('999999999999999999999', 2), /too large/);
});
