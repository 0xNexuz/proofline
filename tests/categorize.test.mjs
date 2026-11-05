import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { analyze, categoryGaps, parseBudgets, parseTransactions, workbookMatrix } from '../lib/finance.ts';
import { buildCategoryMessages, matchDecisions, parseCategorizeBody, parseDecisions, parseSuggestions, suggestCategories } from '../lib/server/categorize.ts';
import { inspectSnapshot } from '../lib/server/snapshot.ts';
import { ProoflineStore } from '../lib/server/store.ts';

const BUDGET = 'category,budget\nOperations,1500.00\nLogistics,700.00\nCommunity,800.00';
const UNCATEGORISED = `id,date,category,description,amount
T-001,2026-10-01,Operations,Laptop supplies,250.00
T-002,2026-10-02,,Electricity and internet for October,640.00
T-003,2026-10-03,Logistics,Transport to field site,500.00
T-004,2026-10-05,,Fuel for the second field trip,390.00
T-005,2026-10-08,,Printed flyers for the town hall,275.00
T-006,2026-10-09,Outreach,Radio jingle for the launch,80.00`;
const INPUT = {
  categories: ['Operations', 'Logistics', 'Community'],
  transactions: [
    { id: 'T-002', description: 'Electricity and internet for October', category: '' },
    { id: 'T-004', description: 'Fuel for the second field trip', category: '' },
    { id: 'T-005', description: 'Printed flyers for the town hall', category: '' },
    { id: 'T-006', description: 'Radio jingle for the launch', category: 'Outreach' },
  ],
};
const reply = suggestions => JSON.stringify({ suggestions });

test('blank categories are allowed only for the import review step', () => {
  assert.throws(() => parseTransactions(UNCATEGORISED), /Category is blank on CSV row 3/);
  const transactions = parseTransactions(UNCATEGORISED, { allowBlankCategory: true });
  const gaps = categoryGaps(parseBudgets(BUDGET), transactions);
  assert.deepEqual(gaps.blank.map(tx => tx.id), ['T-002', 'T-004', 'T-005']);
  assert.deepEqual(gaps.unmatched.map(tx => tx.id), ['T-006']);
  // Formula-looking text is still refused when the category is present.
  assert.throws(() => parseTransactions(UNCATEGORISED.replace(',,Fuel', ',=HYPERLINK(1),Fuel'), { allowBlankCategory: true }), /unsafe/);
});

test('request bodies are validated and only IDs, descriptions and labels are sent', () => {
  assert.deepEqual(parseCategorizeBody(INPUT), INPUT);
  assert.throws(() => parseCategorizeBody({ ...INPUT, categories: [] }), /between 1/);
  assert.throws(() => parseCategorizeBody({ ...INPUT, categories: ['A', 'a'] }), /unique/);
  assert.throws(() => parseCategorizeBody({ ...INPUT, transactions: [INPUT.transactions[0], INPUT.transactions[0]] }), /twice/);
  assert.throws(() => parseCategorizeBody({ ...INPUT, transactions: Array.from({ length: 41 }, (_, i) => ({ id: `T-${i}`, description: 'x' })) }), /between 1 and 40/);
  const sent = buildCategoryMessages(INPUT).map(message => message.content).join('\n');
  assert.doesNotMatch(sent, /640\.00|390\.00|275\.00/, 'amounts are never sent');
  assert.match(sent, /Electricity and internet/);
});

test('suggestions are limited to real budget names, known IDs and short reasons', () => {
  const parsed = parseSuggestions(`Here you go:\n${reply([
    { id: 'T-002', category: 'operations', confidence: 'high', reason: 'Utilities are running costs.' },
    { id: 'T-004', category: 'Travel', confidence: 'high', reason: 'Fuel is travel.' },
    { id: 'T-005', category: 'Community', confidence: 'maybe', reason: 'x'.repeat(400) },
    { id: 'T-999', category: 'Logistics', confidence: 'high', reason: 'Not asked about.' },
    { id: 'T-002', category: 'Logistics', confidence: 'high', reason: 'Duplicate, ignored.' },
  ])}`, INPUT);
  assert.equal(parsed.ok, true);
  const byId = Object.fromEntries(parsed.suggestions.map(item => [item.id, item]));
  assert.deepEqual(byId['T-002'], { id: 'T-002', category: 'Operations', confidence: 'high', reason: 'Utilities are running costs.' });
  assert.equal(byId['T-004'].category, null, 'a name outside the budget is not a suggestion');
  assert.equal(byId['T-004'].confidence, 'low');
  assert.equal(byId['T-005'].confidence, 'low', 'unknown confidence values are treated as low');
  assert.equal(byId['T-005'].reason.length, 140);
  assert.equal(byId['T-999'], undefined);
  assert.equal(parsed.suggestions.length, 3);
});

test('changing a label the file already states always needs confirmation', () => {
  const parsed = parseSuggestions(reply([{ id: 'T-006', category: 'Community', confidence: 'high', reason: 'Promotion is community work.' }]), INPUT);
  assert.equal(parsed.suggestions[0].category, 'Community');
  assert.equal(parsed.suggestions[0].confidence, 'low');
  const none = parseSuggestions(reply([{ id: 'T-006', category: 'none', confidence: 'high', reason: 'No budget line fits.' }]), INPUT);
  assert.equal(none.suggestions[0].category, null);
});

test('a malformed reply is retried once, then refused', async () => {
  const replies = ['Sure! Operations for the first one.', reply([{ id: 'T-002', category: 'Operations', confidence: 'high', reason: 'Utilities.' }])];
  const seen = [];
  const result = await suggestCategories({ ...INPUT, complete: async messages => {
    seen.push(messages.length);
    return { content: replies.shift(), model: 'Ling-test', requestId: 'r-1', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } };
  } });
  assert.equal(result.attempts, 2);
  assert.deepEqual(seen, [2, 4], 'the retry carries the rejected reply and the reason');
  assert.equal(result.suggestions[0].category, 'Operations');
  await assert.rejects(suggestCategories({ ...INPUT, complete: async () => ({ content: 'no json', model: 'm', requestId: null, usage: {} }) }), /could not be read/);
});

test('confirmed decisions are recorded only where the saved revision agrees', () => {
  const transactions = parseTransactions(UNCATEGORISED, { allowBlankCategory: true })
    .map(tx => ({ ...tx, category: { 'T-002': 'Operations', 'T-004': 'Logistics', 'T-005': 'Community' }[tx.id] ?? tx.category }));
  const analysis = analyze(parseBudgets(BUDGET), transactions);
  assert.equal(analysis.actualTotalCents, 213500, 'the reviewed sample reaches the same verified totals as the main sample');
  const body = parseDecisions({ revision: 1, model: 'Ling-3.1-flash', decisions: [
    { id: 'T-002', from: '', to: 'Operations', suggested: 'Operations', confidence: 'high', outcome: 'accepted' },
    { id: 'T-005', from: '', to: 'Community', suggested: null, confidence: 'low', outcome: 'manual' },
    { id: 'T-004', from: '', to: 'Community', suggested: 'Logistics', confidence: 'high', outcome: 'changed' },
  ] });
  const { matched, skipped } = matchDecisions(body.decisions, analysis.transactions);
  assert.deepEqual(matched.map(item => item.id), ['T-002', 'T-005']);
  assert.equal(skipped, 1);
  assert.throws(() => parseDecisions({ revision: 0, decisions: body.decisions }), /revision/);
  assert.throws(() => parseDecisions({ revision: 1, decisions: [{ ...body.decisions[0], outcome: 'auto' }] }), /outcome/);

  const store = new ProoflineStore(':memory:');
  const user = store.createUser('reviewer', 'salt', 'hash');
  const cellData = {};
  workbookMatrix(analysis).forEach((row, index) => { cellData[index] = {}; row.forEach((value, column) => {
    if (value !== '') cellData[index][column] = typeof value === 'string' && value.startsWith('=') ? { f: value } : { v: value };
  }); });
  const snapshot = { id: 'unit-categories', sheetOrder: ['s1'], sheets: { s1: { cellData } } };
  assert.equal(inspectSnapshot(snapshot).status, 'verified');
  const saved = store.save({ ownerId: user.id, actorId: user.id, title: 'Categories', snapshot, expectedRevision: 0, idempotencyKey: randomUUID() });
  const recorded = store.recordCategoryDecisions(user.id, saved.id, 1, { decisions: matched, model: body.model, skipped });
  assert.equal(recorded.recorded, 2);
  const entry = store.getAudit(user.id, saved.id).at(-1);
  assert.equal(entry.action, 'categories_confirmed');
  assert.equal(entry.verificationImpact, 'categories_reviewed');
  assert.deepEqual(entry.recordIds, ['T-002', 'T-005']);
  assert.equal(entry.after.decisions[0].suggested, 'Operations');
  const other = store.createUser('outsider', 'salt', 'hash');
  assert.throws(() => store.recordCategoryDecisions(other.id, saved.id, 1, { decisions: matched, model: null, skipped: 0 }), /not found/);
});
