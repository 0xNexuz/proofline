import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PostgresStore } from '../lib/server/postgres-store.ts';
import { analyze, parseBudgets, parseTransactions, workbookMatrix } from '../lib/finance.ts';

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  throw new Error('Set DATABASE_URL or POSTGRES_URL for the PostgreSQL integration check');
}

function fixture(amount = '250.00') {
  const analysis = analyze(parseBudgets('category,budget\nOperations,500.00'),
    parseTransactions(`id,date,category,description,amount\nIT-001,2026-10-01,Operations,Synthetic test,${amount}`));
  const cellData = {};
  workbookMatrix(analysis).forEach((row, index) => {
    cellData[index] = {};
    row.forEach((value, column) => {
      if (value !== '') cellData[index][column] = typeof value === 'string' && value.startsWith('=') ? { f: value } : { v: value };
    });
  });
  return { id: 'integration-' + randomUUID(), sheetOrder: ['sheet-1'], sheets: { 'sheet-1': { cellData } } };
}

const store = new PostgresStore(process.env.DATABASE_URL || process.env.POSTGRES_URL);
try {
  const accountName = `it${randomUUID().replaceAll('-', '').slice(0,14)}`;
  const owner = await store.createUser(accountName, 'synthetic-salt', 'synthetic-hash');
  const other = await store.createUser(`${accountName}b`, 'synthetic-salt', 'synthetic-hash');
  const original = fixture();
  const key = randomUUID();
  const first = await store.save({ ownerId: owner.id, actorId: owner.id, title: 'Integration fixture',
    snapshot: original, expectedRevision: 0, idempotencyKey: key });
  assert.equal(first.status, 'verified');
  assert.equal((await store.getWorkbook(owner.id, first.id)).actualTotalCents, 25000);
  assert.deepEqual(await store.save({ ownerId: owner.id, actorId: owner.id, title: 'Integration fixture',
    snapshot: original, expectedRevision: 0, idempotencyKey: key }), first);
  assert.equal((await store.listWorkbooks(other.id)).length, 0);
  await assert.rejects(store.getWorkbook(other.id, first.id), /not found/);
  const changed = structuredClone(original);
  const transactionRow = Object.values(changed.sheets['sheet-1'].cellData)
    .find(row => row[1]?.v === 'IT-001');
  assert.ok(transactionRow);
  transactionRow[4].v = 305;
  const second = await store.save({ ownerId: owner.id, actorId: owner.id, workbookId: first.id,
    title: 'Integration fixture', snapshot: changed, expectedRevision: 1, idempotencyKey: randomUUID() });
  assert.equal(second.revision, 2);
  assert.equal((await store.getWorkbook(owner.id, first.id)).actualTotalCents, 30500);
  assert.equal((await store.getWorkbook(owner.id, first.id, 1)).actualTotalCents, 25000);
  await assert.rejects(store.save({ ownerId: owner.id, actorId: owner.id, workbookId: first.id,
    title: 'Integration fixture', snapshot: original, expectedRevision: 1, idempotencyKey: randomUUID() }), /Revision conflict/);
  const audit = await store.getAudit(owner.id, first.id);
  assert.deepEqual(audit.map(item => item.revision), [1, 2]);
  assert.equal(audit[1].before.actualTotalCents, 25000);
  assert.equal(audit[1].after.actualTotalCents, 30500);
  await assert.rejects(store.pool.query('DELETE FROM audit WHERE workbook_id=$1', [first.id]), /append-only/);
  console.log('PostgreSQL integration passed: owner isolation, revisions, conflict, idempotency, audit.');
} finally { await store.close(); }
