import type { NextRequest } from 'next/server';
import { body, failure, json, requireUser, writeGuard } from '@/lib/server/http';
import { getStore, StoreError } from '@/lib/server/store';
import { inspectSnapshot } from '@/lib/server/snapshot';
import { antLingConfig, AntLingError } from '@/lib/server/ant-ling';
import { draftReport, DraftRejectedError } from '@/lib/server/report-draft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };

// Best-effort per-instance throttle. Ant Ling's own API allows about 2 requests per second per key.
const recent = new Map<string, number[]>();
function throttled(userId: string, now = Date.now()) {
  const windowStart = now - 60 * 60 * 1000;
  const times = (recent.get(userId) ?? []).filter(time => time > windowStart);
  if ((times.length && now - times[times.length - 1] < 8_000) || times.length >= 30) return true;
  times.push(now);
  recent.set(userId, times);
  return false;
}

export async function POST(request: NextRequest, context: Context) {
  const denied = writeGuard(request);
  if (denied) return denied;
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  try {
    const config = antLingConfig();
    if (!config) return json({ error: 'Ant Ling is not configured on this server yet.', code: 'not_configured' }, 503);
    const { id } = await context.params;
    const data = await body(request);
    const revision = data.revision === undefined ? undefined : Number(data.revision);
    if (revision !== undefined && (!Number.isSafeInteger(revision) || revision < 1)) throw new StoreError('invalid', 'Invalid revision number');
    // Owner-scoped load, then independent re-verification of the stored snapshot on the server.
    const workbook = await getStore().getWorkbook(auth.user.id, id, revision);
    const inspected = inspectSnapshot(workbook.snapshot);
    if (workbook.status !== 'verified' || inspected.status !== 'verified' || !inspected.analysis) {
      return json({ error: 'Only a verified saved revision can be drafted. Repair the workbook, save it, then try again.', code: 'unverified' }, 409);
    }
    if (throttled(auth.user.id)) return json({ error: 'Please wait a few seconds before drafting again.', code: 'rate_limited' }, 429);
    const draft = await draftReport({ title: workbook.title, analysis: inspected.analysis, config });
    return json({ workbookId: workbook.id, revision: workbook.revision, provider: 'Ant Ling', ...draft });
  } catch (error) {
    if (error instanceof AntLingError) {
      const status = error.code === 'rate_limited' ? 429 : error.code === 'timeout' ? 504 : 502;
      return json({ error: error.message, code: error.code }, status);
    }
    if (error instanceof DraftRejectedError) return json({ error: error.message, code: 'rejected', attempts: error.attempts }, 422);
    return failure(error);
  }
}
