import type { NextRequest } from 'next/server';
import { failure, json } from '@/lib/server/http';
import { loadAndCheck } from '@/lib/server/report-routes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

/** Re-checks the report on the server and, if every figure matches, records the approval in the audit trail. */
export async function POST(request: NextRequest, context: Context) {
  try {
    const loaded = await loadAndCheck(request, context, 'approve');
    if ('response' in loaded) return loaded.response;
    const { auth, workbook, parsed, result, store, textSha256 } = loaded;
    if (!result.ok) return json({ error: 'Some figures do not match the verified workbook. Fix them, then approve again.', code: 'mismatch', revision: workbook.revision, ...result }, 422);
    const recordIds = [...new Set(parsed.refs.filter(ref => ref.token.startsWith('tx:')).map(ref => ref.text))];
    const approval = await store.recordReportApproval(auth.user.id, workbook.id, workbook.revision,
      { verifiedFigures: result.verifiedFigures, textSha256, text: parsed.text, recordIds });
    return json({ ...approval, verifiedFigures: result.verifiedFigures, textSha256 });
  } catch (error) { return failure(error); }
}
