import type { NextRequest } from 'next/server';
import { failure, json, requireUser } from '@/lib/server/http';
import { getStore } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const auth = requireUser(request);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await context.params;
    return json({ entries: getStore().getAudit(auth.user.id, id) });
  } catch (error) { return failure(error); }
}
