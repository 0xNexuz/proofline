import type { NextRequest } from 'next/server';
import { body, failure, json, requireUser, writeGuard } from '@/lib/server/http';
import { getStore, StoreError } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await context.params;
    const requested = request.nextUrl.searchParams.get('revision');
    const revision = requested === null ? undefined : Number(requested);
    if (requested !== null && (!Number.isSafeInteger(revision) || revision! < 1)) {
      throw new StoreError('invalid', 'Invalid revision number');
    }
    return json(await getStore().getWorkbook(auth.user.id, id, revision));
  } catch (error) { return failure(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  const denied = writeGuard(request);
  if (denied) return denied;
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await context.params;
    const data = await body(request);
    if (typeof data.title !== 'string' || typeof data.idempotencyKey !== 'string' ||
        typeof data.expectedRevision !== 'number' || !Number.isSafeInteger(data.expectedRevision)) {
      throw new StoreError('invalid', 'Save requires title, expected revision and idempotency key');
    }
    return json(await getStore().save({ ownerId: auth.user.id, actorId: auth.user.id,
      workbookId: id, title: data.title, snapshot: data.snapshot,
      expectedRevision: data.expectedRevision, idempotencyKey: data.idempotencyKey,
      unsupportedOperation: data.unsupportedOperation === true }));
  } catch (error) { return failure(error); }
}
