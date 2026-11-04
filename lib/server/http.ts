import { NextResponse, type NextRequest } from 'next/server';
import { StoreError } from './store.ts';
import { sameOriginWrite, sessionUser } from './auth.ts';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function failure(error: unknown) {
  if (error instanceof StoreError) return json({ error: error.message },
    error.code === 'not_found' ? 404 : error.code === 'conflict' ? 409 : error.code === 'rate_limited' ? 429 : 400);
  if (error instanceof SyntaxError) return json({ error: 'Malformed JSON request' }, 400);
  return json({ error: 'The server could not complete this request' }, 500);
}

export async function body(request: NextRequest): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new StoreError('invalid', 'JSON request required');
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > 2_100_000) throw new StoreError('invalid', 'Request exceeds the local size limit');
  const data = JSON.parse(raw) as unknown;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new StoreError('invalid', 'JSON object required');
  return data as Record<string, unknown>;
}

export function writeGuard(request: NextRequest) {
  if (!sameOriginWrite(request)) return json({ error: 'Same-origin request header required' }, 403);
  return null;
}

export function requireUser(request: NextRequest) {
  const user = sessionUser(request);
  return user ? { user } : { response: json({ error: 'Authentication required' }, 401) };
}
