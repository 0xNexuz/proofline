import assert from 'node:assert/strict';
import test from 'node:test';
import { analyze, parseBudgets, parseTransactions } from '../lib/finance.ts';
import { checkReport, parseReportBody } from '../lib/server/report-check.ts';
import { factSheet, evidenceFor } from '../lib/server/report-draft.ts';
import { ProoflineStore } from '../lib/server/store.ts';
import { inspectSnapshot } from '../lib/server/snapshot.ts';
import { workbookMatrix } from '../lib/finance.ts';
import { randomUUID } from 'node:crypto';

const BUDGET = 'category,budget\nOperations,1500.00\nLogistics,700.00\nCommunity,800.00';
const TX = (logistics = '390.00') => `id,date,category,description,amount\nT-001,2026-10-01,Operations,Laptop supplies,250.00\nT-002,2026-10-02,Operations,Workspace utilities,640.00\nT-003,2026-10-03,Logistics,Transport to field site,500.00\nT-004,2026-10-05,Logistics,Additional transport,${logistics}\nT-005,2026-10-08,Community,Community materials,275.00\nT-006,2026-10-09,Outreach,Unbudgeted activity,80.00`;
const sample = (logistics) => analyze(parseBudgets(BUDGET), parseTransactions(TX(logistics)));

const REFS = [
  { token: 'total:actual', text: '2135.00' }, { token: 'total:budget', text: '3000.00' },
  { token: 'category:logistics:actual', text: '890.00' }, { token: 'tx:T-003', text: 'T-003' },
  { token: 'tx:T-004', text: 'T-004' }, { token: 'count:transactions', text: '6' },
];
const REPORT = `Budget report: Q4 field budget

Spending reached 2135.00 against a budget of 3000.00 across 6 transactions in October 2026.
Logistics came to 890.00, driven by T-003 and T-004.`;

test('a report whose figures match the engine passes', () => {
  const result = checkReport(REPORT, REFS, sample(), ['Q4 field budget']);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.verifiedFigures, 6);
});

test('a hand-typed or edited number is flagged as unverified', () => {
  const edited = REPORT.replace('890.00', '980.00');
  const result = checkReport(edited, REFS, sample(), ['Q4 field budget']);
  assert.equal(result.ok, false);
  assert.deepEqual(result.unverified.map(item => item.number), ['980.00']);
  assert.match(result.unverified[0].context, /Logistics came to 980\.00/);
  const percent = checkReport(`${REPORT}\nThat is 71% of budget.`, REFS, sample(), ['Q4 field budget']);
  assert.deepEqual(percent.unverified.map(item => item.number), ['71%']);
});

test('figures changed by a later revision are flagged with old and new values', () => {
  const later = sample('440.00'); // T-004 edited: Logistics 890 -> 940, total 2135 -> 2185
  const result = checkReport(REPORT, REFS, later, ['Q4 field budget']);
  assert.equal(result.ok, false);
  const byToken = Object.fromEntries(result.changed.map(item => [item.token, `${item.was}->${item.now}`]));
  assert.equal(byToken['total:actual'], '2135.00->2185.00');
  assert.equal(byToken['category:logistics:actual'], '890.00->940.00');
  assert.equal(result.unverified.length, 0, 'changed figures are not double-reported as unverified');
});

test('removed figures are ignored, unknown tokens are reported, and an empty report fails', () => {
  const trimmed = 'Logistics came to 890.00, driven by T-003 and T-004.';
  assert.equal(checkReport(trimmed, REFS, sample()).ok, true);
  const ghost = checkReport('Spend was 12.00.', [{ token: 'total:ghost', text: '12.00' }], sample());
  assert.deepEqual(ghost.missing, [{ token: 'total:ghost', was: '12.00' }]);
  assert.equal(checkReport('No figures at all.', REFS, sample()).ok, false);
});

test('short figures do not hide digits inside other numbers or IDs', () => {
  // "6" is a verified count, but the 6 inside 2026 or 1600.00 must not be treated as verified.
  const result = checkReport('Across 6 transactions; Operations spent 1600.00 on 2026/11/01.', REFS, sample());
  assert.deepEqual(result.unverified.map(item => item.number), ['1600.00', '2026', '11', '01']);
  // Transaction dates from the data and month-year references are allowed.
  assert.equal(checkReport('T-003 on 2026-10-03, reviewed in Nov 2026, Q4 2026.', REFS, sample()).ok, true);
});

test('evidence lists each cited figure with the transactions behind its claim', () => {
  const analysis = sample();
  const evidence = evidenceFor(analysis, factSheet(analysis), ['total:actual', 'category:logistics:actual', 'tx:T-003', 'count:transactions']);
  assert.deepEqual(evidence.map(item => item.token), ['total:actual', 'category:logistics:actual']);
  assert.deepEqual(evidence[1].sources, ['T-003', 'T-004']);
  assert.equal(evidence[1].text, '890.00');
});

test('report request bodies are validated', () => {
  assert.throws(() => parseReportBody({ text: '', refs: [] }), /required/);
  assert.throws(() => parseReportBody({ text: 'x'.repeat(20_001), refs: [] }), /longer/);
  assert.throws(() => parseReportBody({ text: 'ok', refs: [{ token: 'a' }] }), /Malformed/);
  assert.deepEqual(parseReportBody({ text: 'ok', refs: [{ token: 'a', text: '1.00' }], revision: 2 }), { text: 'ok', refs: [{ token: 'a', text: '1.00' }], revision: 2 });
});

test('approvals are appended to the audit trail and only for the latest revision', () => {
  const store = new ProoflineStore(':memory:');
  const user = store.createUser('approver', 'salt', 'hash');
  const matrix = workbookMatrix(sample());
  const cellData = {};
  matrix.forEach((row, index) => { cellData[index] = {}; row.forEach((value, column) => {
    if (value !== '') cellData[index][column] = typeof value === 'string' && value.startsWith('=') ? { f: value } : { v: value };
  }); });
  const snapshot = { id: 'unit-approve', sheetOrder: ['s1'], sheets: { s1: { cellData } } };
  assert.equal(inspectSnapshot(snapshot).status, 'verified');
  const saved = store.save({ ownerId: user.id, actorId: user.id, title: 'Approval test', snapshot, expectedRevision: 0, idempotencyKey: randomUUID() });
  const approval = store.recordReportApproval(user.id, saved.id, 1, { verifiedFigures: 6, textSha256: 'abc', text: REPORT, recordIds: ['T-003'] });
  assert.equal(approval.revision, 1);
  const entry = store.getAudit(user.id, saved.id).at(-1);
  assert.equal(entry.action, 'report_approved');
  assert.equal(entry.verificationImpact, 'figures_verified');
  assert.equal(entry.after.verifiedFigures, 6);
  store.save({ ownerId: user.id, actorId: user.id, workbookId: saved.id, title: 'Approval test', snapshot, expectedRevision: 1, idempotencyKey: randomUUID() });
  assert.throws(() => store.recordReportApproval(user.id, saved.id, 1, { verifiedFigures: 6, textSha256: 'abc', text: REPORT, recordIds: [] }), /newer revision/);
  const other = store.createUser('intruder', 'salt', 'hash');
  assert.throws(() => store.recordReportApproval(other.id, saved.id, 2, { verifiedFigures: 1, textSha256: 'x', text: 'x', recordIds: [] }), /not found/);
});
