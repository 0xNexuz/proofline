import type { NextRequest } from 'next/server';
import { body, failure, json, requireUser, writeGuard } from '@/lib/server/http';
import { getStore, StoreError } from '@/lib/server/store';
import { inspectSnapshot } from '@/lib/server/snapshot';
import { matchDecisions, parseDecisions } from '@/lib/server/categorize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

/**
 * Records the category choices confirmed during import against a saved revision. Each decision is checked
 * against the revision's own transactions on the server; choices the saved data no longer contains are skipped.
 */
export async function POST(request: NextRequest, context: Context) {
  const denied = writeGuard(request);
  if (denied) return denied;
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await context.params;
    let parsed: ReturnType<typeof parseDecisions>;
    try { parsed = parseDecisions(await body(request)); }
    catch (error) { throw new StoreError('invalid', error instanceof Error ? error.message : 'Invalid request'); }
    const store = getStore();
    const workbook = await store.getWorkbook(auth.user.id, id, parsed.revision);
    const inspected = inspectSnapshot(workbook.snapshot);
    if (!inspected.analysis) return json({ error: 'This revision is not verified, so its categories cannot be recorded.', code: 'unverified' }, 409);
    const { matched, skipped } = matchDecisions(parsed.decisions, inspected.analysis.transactions);
    if (!matched.length) return json({ recorded: 0, skipped, revision: workbook.revision });
    const result = await store.recordCategoryDecisions(auth.user.id, workbook.id, workbook.revision, { decisions: matched, model: parsed.model, skipped });
    return json(result);
  } catch (error) { return failure(error); }
}
