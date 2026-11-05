/**
 * Checks an edited report against the cent engine.
 *
 * `refs` are the figures ProofLine inserted when the report was drafted (token + text at that time).
 * A figure that still appears in the text is compared with the engine's current value for the same
 * token ("changed" when it differs). Any other number left in the text that is not a current engine
 * figure, a category name or the workbook title is reported as unverified. A report passes only when
 * it cites at least one figure and has no changed, missing or unverified numbers.
 */
import type { Analysis } from '../finance.ts';
import { factSheet } from './report-draft.ts';

export type FigureRef = { token: string; text: string };
export type ReportCheck = {
  ok: boolean;
  verifiedFigures: number;
  changed: { token: string; label: string; was: string; now: string }[];
  missing: { token: string; was: string }[];
  unverified: { number: string; context: string }[];
};

export const MAX_REPORT_CHARS = 20_000;
export const MAX_REPORT_REFS = 400;

function escape(text: string) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
/** Matches a figure as a whole token: not glued to other digits, letters or a decimal point. */
function figurePattern(text: string, flags = 'g') {
  return new RegExp(`(?<![\\p{L}\\p{N}.])${escape(text)}(?![\\p{L}\\p{N}]|\\.\\p{N})`, `${flags}u`);
}

/** About six words either side of a match, cut at word boundaries, from the original report text. */
function contextAround(text: string, index: number, length: number) {
  let start = Math.max(0, index - 36);
  if (start > 0) { const cut = text.indexOf(' ', start); if (cut >= 0 && cut < index) start = cut + 1; }
  let end = Math.min(text.length, index + length + 36);
  if (end < text.length) { const cut = text.lastIndexOf(' ', end); if (cut > index + length) end = cut; }
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`;
}

export function checkReport(text: string, refs: FigureRef[], analysis: Analysis, allowedPhrases: string[] = []): ReportCheck {
  const facts = factSheet(analysis);
  const changed: ReportCheck['changed'] = [];
  const missing: ReportCheck['missing'] = [];
  let verifiedFigures = 0;
  const seen = new Set<string>();
  for (const ref of refs) {
    const key = `${ref.token}\u0000${ref.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!figurePattern(ref.text, '').test(text)) continue; // removed from the report by the editor
    const fact = facts.get(ref.token);
    if (!fact) missing.push({ token: ref.token, was: ref.text });
    else if (fact.text !== ref.text) changed.push({ token: ref.token, label: fact.label, was: ref.text, now: fact.text });
    else verifiedFigures++;
  }

  const allowed = [
    ...[...facts.values()].map(fact => fact.text),
    ...changed.map(item => item.was),
    ...missing.map(item => item.was),
  ];
  // Blank out everything allowed to contain digits (same length, so positions still match `text`),
  // longest first, then look for leftover numbers.
  const blank = (match: string) => ' '.repeat(match.length);
  let rest = text
    // Calendar references are allowed: transaction dates from the data, "October 2026", "Q4 2026".
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/gi, blank)
    .replace(/\bQ[1-4]\s+\d{4}\b/g, blank);
  for (const date of new Set(analysis.transactions.map(tx => tx.date))) rest = rest.replace(figurePattern(date), blank);
  for (const phrase of allowedPhrases.filter(Boolean).sort((a, b) => b.length - a.length)) {
    rest = rest.replace(new RegExp(escape(phrase), 'gi'), blank);
  }
  for (const figure of [...new Set(allowed)].sort((a, b) => b.length - a.length)) {
    rest = rest.replace(figurePattern(figure), blank);
  }
  const unverified: ReportCheck['unverified'] = [];
  for (const match of rest.matchAll(/-?\d[\d,]*(?:\.\d+)?%?/g)) {
    if (!unverified.some(item => item.number === match[0])) unverified.push({ number: match[0], context: contextAround(text, match.index!, match[0].length) });
    if (unverified.length >= 20) break;
  }
  return {
    ok: verifiedFigures > 0 && !changed.length && !missing.length && !unverified.length,
    verifiedFigures, changed, missing, unverified,
  };
}

/** Validates the JSON body shared by the check and approve routes. */
export function parseReportBody(data: Record<string, unknown>): { text: string; refs: FigureRef[]; revision?: number } {
  if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('Report text is required');
  if (data.text.length > MAX_REPORT_CHARS) throw new Error(`Report text is longer than ${MAX_REPORT_CHARS} characters`);
  if (!Array.isArray(data.refs) || data.refs.length > MAX_REPORT_REFS) throw new Error('Report figures are missing or too many');
  const refs = data.refs.map(item => {
    const ref = item as Record<string, unknown>;
    if (typeof ref?.token !== 'string' || typeof ref.text !== 'string' || ref.token.length > 200 || !ref.text || ref.text.length > 64) {
      throw new Error('Malformed report figure');
    }
    return { token: ref.token, text: ref.text };
  });
  const revision = data.revision === undefined ? undefined : Number(data.revision);
  if (revision !== undefined && (!Number.isSafeInteger(revision) || revision < 1)) throw new Error('Invalid revision number');
  return { text: data.text, refs, revision };
}
