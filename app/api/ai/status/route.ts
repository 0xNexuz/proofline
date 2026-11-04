import { json } from '@/lib/server/http';
import { antLingConfig } from '@/lib/server/ant-ling';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tells the UI whether report drafting is available. Never returns the key or the base URL. */
export async function GET() {
  try {
    const config = antLingConfig();
    return json({ configured: Boolean(config), provider: 'Ant Ling', model: config?.model ?? null });
  } catch {
    return json({ configured: false, provider: 'Ant Ling', model: null });
  }
}
