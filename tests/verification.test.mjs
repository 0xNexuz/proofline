import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { analyze, parseBudgets, parseTransactions, workbookMatrix } from '../lib/finance.ts';
import { analyzeWorkbookGrid, buildClaims, initialVerification, verificationReducer, isUnsupportedStructuralCommand } from '../lib/verification.ts';

function sampleGrid() {
  const budgets = readFileSync(new URL('../data/sample-budget.csv', import.meta.url), 'utf8');
  const transactions = readFileSync(new URL('../data/sample-transactions.csv', import.meta.url), 'utf8');
  return workbookMatrix(analyze(parseBudgets(budgets), parseTransactions(transactions)));
}

test('revalidates workbook source rows independently of display formulas', () => {
  const grid = sampleGrid();
  grid[3][2] = '=1'; // A tampered display formula cannot certify the claim.
  const result = analyzeWorkbookGrid(grid);
  assert.equal(result.budgetTotalCents, 300000);
  assert.equal(result.actualTotalCents, 213500);
  assert.equal(result.transactions.find(tx => tx.id === 'T-006').sourceRow, 16);
  const actual = buildClaims(result, null).find(claim => claim.id === 'category:outreach:actual');
  assert.equal(actual.valueCents, 8000);
  assert.deepEqual(actual.sourceRecords.map(tx => tx.id), ['T-006']);
});

test('edit marks previous claims stale before the recalculated result is verified', () => {
  const before = analyzeWorkbookGrid(sampleGrid());
  let state = verificationReducer(initialVerification, { type: 'stale' });
  state = verificationReducer(state, { type: 'verified', analysis: before });
  const grid = sampleGrid();
  grid[15][4] = 85;
  state = verificationReducer(state, { type: 'stale' });
  assert.equal(state.phase, 'stale');
  assert.equal(state.current, null);
  assert.equal(buildClaims(state.current, state.previous)[0].valueCents, null);
  const after = analyzeWorkbookGrid(grid);
  state = verificationReducer(state, { type: 'verified', analysis: after });
  const claim = buildClaims(state.current, state.previous).find(item => item.id === 'category:outreach:actual');
  assert.equal(claim.previousCents, 8000);
  assert.equal(claim.valueCents, 8500);
  assert.equal(claim.sourceRecords[0].id, 'T-006');
  assert.equal(state.current.actualTotalCents, 214000);
});

test('invalid amount, duplicate ID, and source formula withhold all current claims', () => {
  const previous = analyzeWorkbookGrid(sampleGrid());
  for (const mutation of [
    grid => { grid[15][4] = '85.001'; },
    grid => { grid[15][1] = 'T-005'; },
  ]) {
    const grid = sampleGrid();
    mutation(grid);
    assert.throws(() => analyzeWorkbookGrid(grid), /Invalid money|Duplicate transaction ID/);
    const state = verificationReducer({ phase: 'stale', current: null, previous, error: null }, { type: 'invalid', error: 'Invalid source' });
    assert.equal(state.current, null);
    assert.equal(buildClaims(state.current, state.previous)[0].valueCents, null);
  }
  const formulas = Array.from({ length: 16 }, () => Array(5).fill(''));
  formulas[15][4] = '=1+2';
  assert.throws(() => analyzeWorkbookGrid(sampleGrid(), formulas), /Source formula is not allowed/);
});

test('deleted source rows recalculate claims and map IDs to their new sheet rows', () => {
  const grid = sampleGrid();
  grid.splice(14, 1); // Delete T-005, shifting T-006 from sheet row 16 to 15.
  const result = analyzeWorkbookGrid(grid);
  assert.equal(result.actualTotalCents, 186000);
  assert.equal(result.transactions.length, 5);
  assert.equal(result.transactions.find(tx => tx.id === 'T-006').sourceRow, 15);
  assert.equal(result.summaries.find(summary => summary.category === 'Community').actualCents, 0);
});

test('missing source headers or edited IDs never keep an old verification', () => {
  const grid = sampleGrid();
  grid.splice(9, 1); // Delete the transaction header row.
  assert.throws(() => analyzeWorkbookGrid(grid), /source headers/);
  const changedId = sampleGrid();
  changedId[15][1] = 'T-NEW';
  const claim = buildClaims(analyzeWorkbookGrid(changedId), null).find(item => item.id === 'category:outreach:actual');
  assert.deepEqual(claim.sourceRecords.map(tx => tx.id), ['T-NEW']);
});

test('workbook validation errors identify the actual sheet row', () => {
  const grid = sampleGrid();
  grid[11][1] = 'T-001';
  assert.throws(() => analyzeWorkbookGrid(grid), /Duplicate transaction ID T-001 at sheet row 12/);
  grid[11][1] = 'T-002';
  grid[11][4] = '12.345';
  assert.throws(() => analyzeWorkbookGrid(grid), /Invalid money value on sheet row 12/);
});

test('category removal retains the previous claim with a zero updated value', () => {
  const before = analyzeWorkbookGrid(sampleGrid());
  const grid = sampleGrid();
  grid[15][2] = 'Operations';
  const after = analyzeWorkbookGrid(grid);
  const outreach = buildClaims(after, before).find(claim => claim.id === 'category:outreach:actual');
  assert.equal(outreach.previousCents, 8000);
  assert.equal(outreach.valueCents, 0);
  assert.deepEqual(outreach.sourceRecords, []);
});

test('Univer structural row, range and reorder commands are restricted', () => {
  for (const id of ['sheet.command.insert-row', 'sheet.command.remove-row',
    'sheet.command.move-rows', 'sheet.command.reorder-range',
    'sheet.command.append-row', 'sheet.command.delete-range-move-up']) {
    assert.equal(isUnsupportedStructuralCommand(id), true, id);
  }
  assert.equal(isUnsupportedStructuralCommand('sheet.command.set-range-values'), false);
});

test('inserted blank rows and whole-record rearrangement retain ID mapping; pasted duplicate IDs fail', () => {
  const grid = sampleGrid();
  grid.splice(11, 0, ['', '', '', '', '']);
  let result = analyzeWorkbookGrid(grid);
  assert.equal(result.transactions.find(tx => tx.id === 'T-002').sourceRow, 13);
  const row = grid.splice(16, 1)[0];
  grid.splice(11, 0, row);
  result = analyzeWorkbookGrid(grid);
  assert.equal(result.transactions.find(tx => tx.id === 'T-006').sourceRow, 12);
  grid[13][1] = 'T-006';
  assert.throws(() => analyzeWorkbookGrid(grid), /Duplicate transaction ID/);
});
