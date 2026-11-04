/**
 * Grounded report drafting.
 *
 * The model writes wording only. Every figure, count and transaction ID in a draft must be written as a
 * fact token such as {{total:actual}}; Proofline replaces each token with the value from its own
 * integer-cent engine. A draft that contains any other digit, a percentage, a spelled-out number or an
 * unknown token is rejected. The model never certifies a number.
 */
import { money, type Analysis } from '../finance.ts';
import { buildClaims } from '../verification.ts';
import { chatCompletion, type AntLingConfig, type ChatMessage, type ChatResult } from './ant-ling.ts';

export type Fact = { token: string; label: string; text: string; claimId: string | null };
export type DraftSegment = { type: 'text'; text: string } | { type: 'fact'; token: string; text: string; claimId: string | null };
export type ReportDraft = {
  paragraphs: DraftSegment[][];
  factsUsed: string[];
  model: string;
  requestId: string | null;
  attempts: number;
  usage: ChatResult['usage'];
};

const TOKEN = /\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g;
const NUMBER_WORDS = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|half|double|twice|triple|percent|percentage)\b/i;
const MAX_CHARS = 1600;
const MAX_PARAGRAPHS = 4;

function slug(category: string) { return category.toLowerCase(); }

/** Every fact the model may cite, keyed by token text (without braces). Values come only from the engine. */
export function factSheet(analysis: Analysis): Map<string, Fact> {
  const facts = new Map<string, Fact>();
  const add = (token: string, label: string, text: string, claimId: string | null) => facts.set(token, { token, label, text, claimId });
  const claimIds = new Set(buildClaims(analysis, null).map(claim => claim.id));
  const claim = (id: string) => claimIds.has(id) ? id : null;

  add('total:budget', 'Total budget', money(analysis.budgetTotalCents), claim('total:budget'));
  add('total:actual', 'Total actual spend', money(analysis.actualTotalCents), claim('total:actual'));
  add('total:variance', 'Total actual minus total budget', money(analysis.actualTotalCents - analysis.budgetTotalCents), claim('total:actual'));
  add('count:transactions', 'Number of transactions', String(analysis.transactions.length), claim('total:actual'));
  add('count:categories', 'Number of categories', String(analysis.summaries.length), claim('total:actual'));
  add('count:exceptions', 'Number of categories over budget or unbudgeted', String(analysis.exceptionCount), claim('total:actual'));
  for (const summary of analysis.summaries) {
    const key = slug(summary.category);
    add(`category:${key}:budget`, `${summary.category} budget`, money(summary.budgetCents), claim(`category:${key}:variance`));
    add(`category:${key}:actual`, `${summary.category} actual`, money(summary.actualCents), claim(`category:${key}:actual`));
    add(`category:${key}:variance`, `${summary.category} variance (actual minus budget)`, money(summary.varianceCents), claim(`category:${key}:variance`));
  }
  for (const tx of analysis.transactions) {
    add(`tx:${tx.id}`, `Transaction ${tx.id} (${tx.category})`, tx.id, claim(`category:${slug(tx.category)}:actual`));
  }
  return facts;
}

export function buildMessages(title: string, analysis: Analysis, facts: Map<string, Fact>): ChatMessage[] {
  const lines = [...facts.values()].filter(fact => !fact.token.startsWith('tx:'))
    .map(fact => `{{${fact.token}}} = ${fact.text}  (${fact.label})`);
  const statusLines = analysis.summaries.map(summary => `${summary.category}: ${summary.status}; transactions ${summary.transactionIds.map(id => `{{tx:${id}}}`).join(', ') || 'none'}`);
  return [
    {
      role: 'system',
      content: [
        'You draft short, plain-English budget summaries for a finance team.',
        'You receive verified facts. Each fact has a token in double braces.',
        'Rules:',
        '1. Never write a number in any form: no digits, no amounts, no percentages, no spelled-out numbers.',
        '2. Whenever you mention a figure, a count or a transaction ID, write its token exactly, for example {{total:actual}}.',
        '3. Use only tokens from the list. Do not invent tokens.',
        '4. Do not guess causes or add facts that are not in the list.',
        '5. Write two or three short paragraphs, under 170 words in total. No headings, lists, bold or markdown.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Workbook: ${title.replace(/[{}]/g, '').slice(0, 120)}`,
        'Verified facts (values are shown for your understanding only; write the token, never the value):',
        ...lines,
        'Category status and source transactions:',
        ...statusLines,
        'Draft the summary now.',
      ].join('\n'),
    },
  ];
}

export type ValidationResult = { ok: true; paragraphs: DraftSegment[][]; factsUsed: string[] } | { ok: false; reason: string };

/**
 * Validates a model draft and renders it into segments. `allowedNames` are category names from the
 * engine; they may be written in prose and are removed before the number checks, so a category such as
 * "Phase 2" does not trip the digit rule.
 */
export function validateAndRender(raw: string, facts: Map<string, Fact>, allowedNames: string[] = []): ValidationResult {
  const text = raw.replace(/\r\n?/g, '\n').trim();
  if (!text) return { ok: false, reason: 'The draft was empty.' };
  if (text.length > MAX_CHARS) return { ok: false, reason: `The draft was longer than ${MAX_CHARS} characters.` };
  if (/[*#`|]|^\s*[-•]\s/m.test(text)) return { ok: false, reason: 'The draft used markdown, headings or lists.' };

  const unknown = new Set<string>();
  for (const match of text.matchAll(TOKEN)) if (!facts.has(match[1])) unknown.add(match[1]);
  if (unknown.size) return { ok: false, reason: `The draft used tokens that are not in the fact list: ${[...unknown].slice(0, 5).join(', ')}.` };

  let outside = text.replace(TOKEN, ' ');
  for (const name of [...allowedNames].sort((a, b) => b.length - a.length)) {
    if (name) outside = outside.split(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join(' ');
  }
  if (/[{}]/.test(outside)) return { ok: false, reason: 'The draft contained a malformed token.' };
  if (/\d/.test(outside)) return { ok: false, reason: 'The draft wrote a number directly instead of using a token.' };
  if (/[%$€£₦¥]/.test(outside)) return { ok: false, reason: 'The draft wrote a currency or percentage symbol instead of using a token.' };
  const word = outside.match(NUMBER_WORDS);
  if (word) return { ok: false, reason: `The draft spelled out a number ("${word[0]}") instead of using a token.` };

  const blocks = text.split(/\n\s*\n+/).map(block => block.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  if (blocks.length > MAX_PARAGRAPHS) return { ok: false, reason: `The draft had more than ${MAX_PARAGRAPHS} paragraphs.` };
  const used = new Set<string>();
  const paragraphs = blocks.map(block => {
    const segments: DraftSegment[] = [];
    let cursor = 0;
    for (const match of block.matchAll(TOKEN)) {
      if (match.index! > cursor) segments.push({ type: 'text', text: block.slice(cursor, match.index) });
      const fact = facts.get(match[1])!;
      used.add(fact.token);
      segments.push({ type: 'fact', token: fact.token, text: fact.text, claimId: fact.claimId });
      cursor = match.index! + match[0].length;
    }
    if (cursor < block.length) segments.push({ type: 'text', text: block.slice(cursor) });
    return segments;
  });
  if (!used.size) return { ok: false, reason: 'The draft did not cite any verified fact.' };
  return { ok: true, paragraphs, factsUsed: [...used] };
}

export class DraftRejectedError extends Error {
  attempts: number;
  constructor(message: string, attempts: number) { super(message); this.name = 'DraftRejectedError'; this.attempts = attempts; }
}

type Complete = (messages: ChatMessage[]) => Promise<ChatResult>;

/** Asks the model for a draft, validates it, and retries once with the specific rule it broke. */
export async function draftReport(input: { title: string; analysis: Analysis; config?: AntLingConfig; complete?: Complete }): Promise<ReportDraft> {
  const complete: Complete = input.complete ?? (messages => {
    if (!input.config) throw new Error('Ant Ling configuration is required');
    return chatCompletion(input.config, messages);
  });
  const facts = factSheet(input.analysis);
  const messages = buildMessages(input.title, input.analysis, facts);
  let lastReason = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await complete(messages);
    const checked = validateAndRender(result.content, facts, input.analysis.summaries.map(summary => summary.category));
    if (checked.ok) {
      return { paragraphs: checked.paragraphs, factsUsed: checked.factsUsed, model: result.model,
        requestId: result.requestId, attempts: attempt, usage: result.usage };
    }
    lastReason = checked.reason;
    messages.push({ role: 'assistant', content: result.content });
    messages.push({ role: 'user', content: `That draft broke the rules: ${checked.reason} Rewrite it. Use tokens for every figure and transaction ID, and write no numbers yourself.` });
  }
  throw new DraftRejectedError(`Ant Ling's draft did not pass Proofline's number check: ${lastReason}`, 2);
}
