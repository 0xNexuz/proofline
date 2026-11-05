import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { body, json, requireUser, writeGuard } from './http.ts';
import { getStore, StoreError } from './store.ts';
import { inspectSnapshot } from './snapshot.ts';
import { checkReport, parseReportBody } from './report-check.ts';

type Context = { params: Promise<{ id: string }> };

/** Shared by the check and approve routes: auth, body validation, owner-scoped load, server-side re-verification. */
export async function loadAndCheck(request: NextRequest, context: Context, mode: 'check' | 'approve') {
  const denied = writeGuard(request);
  if (denied) return { response: denied };
  const auth = await requireUser(request);
  if ('response' in auth) return { response: auth.response };
  const { id } = await context.params;
  let parsed: ReturnType<typeof parseReportBody>;
  try { parsed = parseReportBody(await body(request)); }
  catch (error) { throw new StoreError('invalid', error instanceof Error ? error.message : 'Invalid report request'); }
  const store = getStore();
  const latest = await store.getWorkbook(auth.user.id, id);
  // Checks run against the latest saved revision, so figures changed by later saves are flagged.
  const target = mode === 'approve' && parsed.revision !== undefined && parsed.revision !== latest.revision
    ? null : latest;
  if (!target) {
    return { response: json({ error: 'A newer revision exists. Check the report against it before approving.', code: 'outdated', currentRevision: latest.revision }, 409) };
  }
  const inspected = inspectSnapshot(target.snapshot);
  if (target.status !== 'verified' || !inspected.analysis) {
    return { response: json({ error: 'The latest saved revision is not verified, so its figures cannot back a report.', code: 'unverified' }, 409) };
  }
  const result = checkReport(parsed.text, parsed.refs, inspected.analysis, [target.title]);
  return { auth, workbook: target, parsed, result, analysis: inspected.analysis, store,
    textSha256: createHash('sha256').update(parsed.text).digest('hex') };
}
