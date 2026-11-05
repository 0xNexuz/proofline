import type { NextRequest } from 'next/server';
import { failure, json } from '@/lib/server/http';
import { loadAndCheck } from '@/lib/server/report-routes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

/** Compares an edited report with the cent engine's figures for the latest saved revision. No side effects. */
export async function POST(request: NextRequest, context: Context) {
  try {
    const loaded = await loadAndCheck(request, context, 'check');
    if ('response' in loaded) return loaded.response;
    return json({ revision: loaded.workbook.revision, ...loaded.result });
  } catch (error) { return failure(error); }
}
