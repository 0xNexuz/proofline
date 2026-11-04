import assert from 'node:assert/strict';
import test from 'node:test';
import { analyze, parseBudgets, parseTransactions } from '../lib/finance.ts';
import { factSheet, buildMessages, validateAndRender, draftReport, DraftRejectedError } from '../lib/server/report-draft.ts';
import { antLingConfig, chatCompletion, AntLingError } from '../lib/server/ant-ling.ts';

function sample() {
  return analyze(
    parseBudgets('category,budget\nOperations,1500.00\nLogistics,700.00\nCommunity,800.00'),
    parseTransactions('id,date,category,description,amount\nT-001,2026-10-01,Operations,Laptop supplies,250.00\nT-002,2026-10-02,Operations,Workspace utilities,640.00\nT-003,2026-10-03,Logistics,Transport to field site,500.00\nT-004,2026-10-05,Logistics,Additional transport,390.00\nT-005,2026-10-08,Community,Community materials,275.00\nT-006,2026-10-09,Outreach,Unbudgeted activity,80.00'),
  );
}
const names = analysis => analysis.summaries.map(summary => summary.category);
const reply = content => ({ content, model: 'Ling-3.1-flash', requestId: 'req-test', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } });

test('fact sheet values come from the integer-cent engine and map to claims', () => {
  const facts = factSheet(sample());
  assert.equal(facts.get('total:actual').text, '2135.00');
  assert.equal(facts.get('total:budget').text, '3000.00');
  assert.equal(facts.get('category:logistics:actual').text, '890.00');
  assert.equal(facts.get('category:logistics:variance').text, '190.00');
  assert.equal(facts.get('category:logistics:actual').claimId, 'category:logistics:actual');
  assert.equal(facts.get('tx:T-004').claimId, 'category:logistics:actual');
  assert.equal(facts.get('count:transactions').text, '6');
});

test('prompt never asks the model to state values and lists tokens', () => {
  const analysis = sample();
  const [system, user] = buildMessages('Q4 {{evil}} budget', analysis, factSheet(analysis));
  assert.match(system.content, /Never write a number/);
  assert.match(user.content, /\{\{total:actual\}\} = 2135\.00/);
  assert.match(user.content, /Workbook: Q4 evil budget/); // braces stripped from user-supplied title
  assert.match(user.content, /\{\{tx:T-003\}\}/);
});

test('valid draft renders engine values, never model text, and links claims', () => {
  const analysis = sample();
  const raw = 'Spending reached {{total:actual}} against a budget of {{total:budget}}.\n\nLogistics came to {{category:logistics:actual}}, over its budget, driven by {{tx:T-003}} and {{tx:T-004}}.';
  const result = validateAndRender(raw, factSheet(analysis), names(analysis));
  assert.equal(result.ok, true);
  assert.equal(result.paragraphs.length, 2);
  const facts = result.paragraphs.flat().filter(segment => segment.type === 'fact');
  assert.deepEqual(facts.map(f => f.text), ['2135.00', '3000.00', '890.00', 'T-003', 'T-004']);
  assert.equal(facts[2].claimId, 'category:logistics:actual');
  assert.equal(result.paragraphs[0].map(s => s.text).join(''), 'Spending reached 2135.00 against a budget of 3000.00.');
  assert.equal(result.paragraphs[1].map(s => s.text).join(''), 'Logistics came to 890.00, over its budget, driven by T-003 and T-004.');
});

test('drafts with numbers the model wrote itself are rejected', () => {
  const analysis = sample();
  const facts = factSheet(analysis);
  const check = raw => validateAndRender(raw, facts, names(analysis));
  assert.match(check('Total spend was 2135.00 overall.').reason, /number directly/);
  assert.match(check('Spend was {{total:actual}}, roughly 71% of budget.').reason, /number directly/);
  assert.match(check('Spend was {{total:actual}}, about seventy percent of {{total:budget}}.').reason, /spelled out/);
  assert.match(check('Spend was {{total:actual}}, under budget by $ amounts.').reason, /currency or percentage/);
  assert.match(check('Spend was {{total:invented}}.').reason, /not in the fact list/);
  assert.match(check('Spending looked healthy this month.').reason, /did not cite/);
  assert.match(check('- {{total:actual}} spent').reason, /markdown|lists/);
  assert.match(check('Spend was {{total:actual}} and {{broken').reason, /malformed/);
});

test('category names with digits are allowed in prose but other digits are not', () => {
  const analysis = analyze(parseBudgets('category,budget\nPhase 2,100.00'),
    parseTransactions('id,date,category,description,amount\nA-1,2026-10-01,Phase 2,Kickoff,40.00'));
  const facts = factSheet(analysis);
  assert.equal(validateAndRender('Phase 2 spent {{category:phase 2:actual}} via {{tx:A-1}}.', facts, names(analysis)).ok, true);
  assert.equal(validateAndRender('Phase 2 spent 40 dollars.', facts, names(analysis)).ok, false);
});

test('draftReport retries once with the broken rule, then succeeds', async () => {
  const calls = [];
  const draft = await draftReport({
    title: 'Demo', analysis: sample(),
    complete: async messages => {
      calls.push(messages.map(m => m.content));
      return calls.length === 1 ? reply('Spending was 2135.00.') : reply('Spending reached {{total:actual}} across {{count:transactions}} transactions.');
    },
  });
  assert.equal(draft.attempts, 2);
  assert.match(calls[1].at(-1), /number directly/);
  assert.deepEqual(draft.factsUsed, ['total:actual', 'count:transactions']);
  assert.equal(draft.paragraphs[0].find(s => s.type === 'fact').text, '2135.00');
});

test('draftReport gives up after two rejected drafts', async () => {
  await assert.rejects(
    draftReport({ title: 'Demo', analysis: sample(), complete: async () => reply('It cost 99 dollars.') }),
    error => error instanceof DraftRejectedError && /number check/.test(error.message),
  );
});

test('Ant Ling config is server-env only and defaults to the documented endpoint', () => {
  assert.equal(antLingConfig({}), null);
  const config = antLingConfig({ ANT_LING_API_KEY: ' key-123 ' });
  assert.deepEqual(config, { apiKey: 'key-123', baseUrl: 'https://api.ant-ling.com/v1', model: 'Ling-3.1-flash' });
  assert.equal(antLingConfig({ ANT_LING_API_KEY: 'k', ANT_LING_BASE_URL: 'https://openrouter.ai/api/v1/', ANT_LING_MODEL: 'inclusionai/x' }).baseUrl, 'https://openrouter.ai/api/v1');
  assert.throws(() => antLingConfig({ ANT_LING_API_KEY: 'k', ANT_LING_BASE_URL: 'http://insecure.example' }), /https/);
  assert.equal(antLingConfig({ ANT_LING_API_KEY: 'k', ANT_LING_BASE_URL: 'http://127.0.0.1:4010/v1' }).baseUrl, 'http://127.0.0.1:4010/v1');
  assert.throws(() => antLingConfig({ ANT_LING_API_KEY: 'k', ANT_LING_BASE_URL: 'http://localhost.evil.example/v1' }), /https/);
});

test('chatCompletion sends an OpenAI-compatible request and parses the reply', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, init, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ id: 'cmpl-1', model: 'Ling-3.1-flash', choices: [{ message: { content: 'Hello {{total:actual}}' } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }),
      { status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'req-42' } });
  };
  const result = await chatCompletion({ apiKey: 'secret-key', baseUrl: 'https://api.ant-ling.com/v1', model: 'Ling-3.1-flash' }, [{ role: 'user', content: 'hi' }], { fetchImpl });
  assert.equal(seen.url, 'https://api.ant-ling.com/v1/chat/completions');
  assert.equal(seen.init.headers.Authorization, 'Bearer secret-key');
  assert.equal(seen.body.model, 'Ling-3.1-flash');
  assert.equal(seen.body.stream, false);
  assert.deepEqual(seen.body.thinking, { type: 'disabled' });
  assert.equal(result.requestId, 'req-42');
  assert.equal(result.usage.totalTokens, 15);
  const other = await chatCompletion({ apiKey: 'k', baseUrl: 'https://openrouter.ai/api/v1', model: 'm' }, [], { fetchImpl });
  assert.equal(other.content, 'Hello {{total:actual}}');
  assert.equal(seen.body.thinking, undefined); // Ant Ling-only parameter is not sent to other hosts
});

test('chatCompletion maps errors without leaking the key', async () => {
  const config = { apiKey: 'secret-key', baseUrl: 'https://api.ant-ling.com/v1', model: 'Ling-3.1-flash' };
  const failing = status => async () => new Response(JSON.stringify({ error: { message: 'bad token secret-key' } }), { status });
  await assert.rejects(chatCompletion(config, [], { fetchImpl: failing(401) }), e => e instanceof AntLingError && e.code === 'auth' && !e.message.includes('secret-key') && e.message.includes('[redacted]'));
  await assert.rejects(chatCompletion(config, [], { fetchImpl: failing(402) }), e => e.code === 'quota');
  await assert.rejects(chatCompletion(config, [], { fetchImpl: failing(429) }), e => e.code === 'rate_limited');
  await assert.rejects(chatCompletion(config, [], { fetchImpl: failing(500) }), e => e.code === 'upstream');
  const hanging = (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  await assert.rejects(chatCompletion(config, [], { fetchImpl: hanging, timeoutMs: 20 }), e => e.code === 'timeout');
  const empty = async () => new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 });
  await assert.rejects(chatCompletion(config, [], { fetchImpl: empty }), e => e.code === 'bad_response');
});
