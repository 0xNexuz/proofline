import type { NextRequest } from 'next/server';
import { body, failure, json, requireUser, writeGuard } from '@/lib/server/http';
import { getStore, StoreError } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  return json({ workbooks: await getStore().listWorkbooks(auth.user.id) });
}

export async function POST(request: NextRequest) {
  const denied = writeGuard(request);
  if (denied) return denied;
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  try {
    const data = await body(request);
    if (typeof data.title !== 'string' || typeof data.idempotencyKey !== 'string' ||
        typeof data.expectedRevision !== 'number' || data.expectedRevision !== 0) {
      throw new StoreError('invalid', 'New workbook requires title, revision zero and idempotency key');
    }
    const saved = await getStore().save({ ownerId: auth.user.id, actorId: auth.user.id,
      title: data.title, snapshot: data.snapshot, expectedRevision: 0,
      idempotencyKey: data.idempotencyKey, unsupportedOperation: data.unsupportedOperation === true,
      migration: data.migration === true });
    return json(saved, 201);
  } catch (error) { return failure(error); }
}
