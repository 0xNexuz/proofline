import type { NextRequest } from 'next/server';
import { body, failure, json, requireUser, writeGuard } from '@/lib/server/http';
import { StoreError } from '@/lib/server/store';
import { antLingConfig, AntLingError } from '@/lib/server/ant-ling';
import { CategorizeRejectedError, parseCategorizeBody, suggestCategories } from '@/lib/server/categorize';
import { createThrottle } from '@/lib/server/throttle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const throttled = createThrottle({ minGapMs: 5_000, maxPerHour: 30 });

/**
 * Suggests budget categories for transactions under review during import. Signed-in users only.
 * Returns suggestions; nothing is written to a workbook here.
 */
export async function POST(request: NextRequest) {
  const denied = writeGuard(request);
  if (denied) return denied;
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  try {
    const config = antLingConfig();
    if (!config) return json({ error: 'Ant Ling is not configured on this server yet. Choose the categories yourself.', code: 'not_configured' }, 503);
    let input: ReturnType<typeof parseCategorizeBody>;
    try { input = parseCategorizeBody(await body(request)); }
    catch (error) { throw new StoreError('invalid', error instanceof Error ? error.message : 'Invalid request'); }
    if (throttled(auth.user.id)) return json({ error: 'Please wait a few seconds before asking again.', code: 'rate_limited' }, 429);
    const result = await suggestCategories({ ...input, config });
    return json({ provider: 'Ant Ling', ...result });
  } catch (error) {
    if (error instanceof AntLingError) {
      const status = error.code === 'rate_limited' ? 429 : error.code === 'timeout' ? 504 : 502;
      return json({ error: error.message, code: error.code }, status);
    }
    if (error instanceof CategorizeRejectedError) return json({ error: `${error.message} Choose the categories yourself.`, code: 'rejected' }, 422);
    return failure(error);
  }
}
