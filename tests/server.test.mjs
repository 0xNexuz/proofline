import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { ProoflineStore } from '../lib/server/store.ts';
import { inspectSnapshot } from '../lib/server/snapshot.ts';
import { hashPassword, verifyPassword } from '../lib/server/auth.ts';
import { analyze, parseBudgets, parseTransactions, workbookMatrix } from '../lib/finance.ts';

function fixture() {
  const budget = 'category,budget\nOperations,1500.00\nLogistics,700.00\nCommunity,800.00';
  const transactions = 'id,date,category,description,amount\nT-001,2026-10-01,Operations,Laptop supplies,250.00\nT-002,2026-10-02,Operations,Workspace utilities,640.00\nT-003,2026-10-03,Logistics,Transport to field site,500.00\nT-004,2026-10-05,Logistics,Additional transport,390.00\nT-005,2026-10-08,Community,Community materials,275.00\nT-006,2026-10-09,Outreach,Unbudgeted activity,80.00';
  const matrix = workbookMatrix(analyze(parseBudgets(budget), parseTransactions(transactions)));
  const cellData = {};
  matrix.forEach((row, index) => {
    cellData[index] = {};
    row.forEach((value, column) => {
      if (value !== '') cellData[index][column] = typeof value === 'string' && value.startsWith('=') ? { f: value } : { v: value };
    });
  });
  return { id: 'univer-unit-1', sheetOrder: ['sheet-1'], sheets: { 'sheet-1': { cellData } } };
}

function account(store, username) {
  return store.createUser(username, 'salt', 'hash');
}

test('snapshot certification ignores formula outputs but rejects malformed financial sources', () => {
  const snapshot = fixture();
  assert.equal(inspectSnapshot(snapshot).analysis.actualTotalCents, 213500);
  snapshot.sheets['sheet-1'].cellData[10][4].v = 300;
  assert.equal(inspectSnapshot(snapshot).analysis.actualTotalCents, 218500);
  snapshot.sheets['sheet-1'].cellData[11][1].v = 'T-001';
  const duplicate = inspectSnapshot(snapshot);
  assert.equal(duplicate.status, 'invalid');
  assert.match(duplicate.error, /Duplicate transaction ID.*sheet row 12/);
  snapshot.sheets['sheet-1'].cellData[11][1].v = 'T-002';
  snapshot.sheets['sheet-1'].cellData[10][4] = { f: '=300' };
  assert.match(inspectSnapshot(snapshot).error, /Source formula/);
  assert.equal(inspectSnapshot(fixture(), true).status, 'invalid');
  assert.throws(() => inspectSnapshot({ sheets: {} }), /Malformed/);
});

test('P1 Univer date serials migrate only with an ISO date format', () => {
  const snapshot = fixture();
  snapshot.dateSystem = 'date1900';
  snapshot.styles = { iso: { n: { pattern: 'yyyy-mm-dd' } } };
  snapshot.sheets['sheet-1'].cellData[10][0] = { v: 46296, s: 'iso', t: 2 };
  assert.equal(inspectSnapshot(snapshot).status, 'verified');
  snapshot.sheets['sheet-1'].cellData[10][0].s = 'missing';
  assert.match(inspectSnapshot(snapshot).error, /Date must be text/);
});

test('authenticated ownership, revision conflicts, idempotency and historical snapshots', () => {
  const store = new ProoflineStore(':memory:');
  try {
    const alice = account(store, 'alice');
    const bob = account(store, 'bob');
    const key = randomUUID();
    const original = fixture();
    const first = store.save({ ownerId: alice.id, actorId: alice.id, title: 'Evidence', snapshot: original,
      expectedRevision: 0, idempotencyKey: key });
    assert.equal(first.revision, 1);
    assert.equal(first.status, 'verified');
    assert.deepEqual(store.save({ ownerId: alice.id, actorId: alice.id, title: 'Evidence', snapshot: original,
      expectedRevision: 0, idempotencyKey: key }), first);
    assert.equal(store.getAudit(alice.id, first.id).length, 1);
    assert.equal(store.listWorkbooks(bob.id).length, 0);
    assert.throws(() => store.getWorkbook(bob.id, first.id), /not found/);
    assert.throws(() => store.getAudit(bob.id, first.id), /not found/);
    assert.throws(() => store.save({ ownerId: bob.id, actorId: bob.id, workbookId: first.id,
      expectedRevision: 1, title: 'Stolen', snapshot: fixture(), idempotencyKey: randomUUID() }), /not found/);
    const changed = fixture();
    changed.sheets['sheet-1'].cellData[10][4].v = 300;
    const second = store.save({ ownerId: alice.id, actorId: alice.id, workbookId: first.id,
      expectedRevision: 1, title: 'Evidence', snapshot: changed, idempotencyKey: randomUUID() });
    assert.equal(second.revision, 2);
    assert.equal(store.getWorkbook(alice.id, first.id).actualTotalCents, 218500);
    assert.equal(store.getWorkbook(alice.id, first.id, 1).actualTotalCents, 213500);
    assert.throws(() => store.save({ ownerId: alice.id, actorId: alice.id, workbookId: first.id,
      expectedRevision: 1, title: 'Stale tab', snapshot: original, idempotencyKey: randomUUID() }), /Revision conflict/);
    const audit = store.getAudit(alice.id, first.id);
    assert.deepEqual(audit.map(item => item.revision), [1, 2]);
    assert.equal(audit[1].before.actualTotalCents, 213500);
    assert.equal(audit[1].after.actualTotalCents, 218500);
    assert.deepEqual(audit[1].recordIds, ['T-001','T-002','T-003','T-004','T-005','T-006']);
    assert.throws(() => store.db.exec('DELETE FROM audit'), /append-only/);
  } finally { store.close(); }
});

test('migration keeps a new private revision and invalid saves never get verified claims', () => {
  const store = new ProoflineStore(':memory:');
  try {
    const user = account(store, 'migrator');
    const imported = store.save({ ownerId: user.id, actorId: user.id, title: 'P1 import',
      snapshot: fixture(), expectedRevision: 0, idempotencyKey: randomUUID(), migration: true });
    assert.equal(store.getAudit(user.id, imported.id)[0].action, 'local_import');
    const invalid = fixture();
    invalid.sheets['sheet-1'].cellData[15][4].v = '80.001';
    const result = store.save({ ownerId: user.id, actorId: user.id, workbookId: imported.id,
      expectedRevision: 1, title: 'P1 import', snapshot: invalid, idempotencyKey: randomUUID() });
    assert.equal(result.status, 'invalid');
    assert.equal(store.getWorkbook(user.id, imported.id).actualTotalCents, null);
    assert.equal(store.getAudit(user.id, imported.id)[1].verificationImpact, 'claims_withheld');
  } finally { store.close(); }
});

test('malformed snapshots are rejected and login attempts are throttled', () => {
  const store = new ProoflineStore(':memory:');
  try {
    const user = account(store, 'throttleuser');
    assert.throws(() => store.save({ ownerId: user.id, actorId: user.id, title: 'Bad',
      snapshot: { sheets: {} }, expectedRevision: 0, idempotencyKey: randomUUID() }), /Malformed Univer/);
    assert.equal(store.listWorkbooks(user.id).length, 0);
    for (let attempt = 0; attempt < 5; attempt++) store.recordLoginFailure('throttleuser');
    assert.throws(() => store.assertLoginAllowed('throttleuser'), /Too many attempts/);
    store.recordLoginSuccess('throttleuser');
    assert.doesNotThrow(() => store.assertLoginAllowed('throttleuser'));
  } finally { store.close(); }
});

test('password hashing and session lookup keep raw credentials out of the store', async () => {
  const { salt, hash } = await hashPassword('a sufficiently long synthetic password');
  assert.equal(await verifyPassword('a sufficiently long synthetic password', salt, hash), true);
  assert.equal(await verifyPassword('incorrect synthetic password', salt, hash), false);
  const store = new ProoflineStore(':memory:');
  try {
    const user = store.createUser('sessionuser', salt, hash);
    store.createSession(user.id, 'hash-of-token', new Date(Date.now() + 60_000).toISOString());
    assert.equal(store.sessionUser('hash-of-token').id, user.id);
    store.deleteSession('hash-of-token');
    assert.equal(store.sessionUser('hash-of-token'), null);
  } finally { store.close(); }
});
