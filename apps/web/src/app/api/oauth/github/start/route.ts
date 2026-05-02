import { NextRequest, NextResponse } from 'next/server';
import { github } from '@web3cash/oauth';
import { getSessionWallet } from '@/lib/session';
import { enforceRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const limited = enforceRateLimit(`oauth:github:${getClientIp(req)}`, RATE_LIMITS.OAUTH_START);
  if (limited) return limited;

  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/dashboard';
  try {
    const { url } = await github.startAuth({ userWallet: wallet, returnTo });
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'oauth_start_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
