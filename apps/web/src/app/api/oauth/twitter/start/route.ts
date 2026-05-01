import { NextRequest, NextResponse } from 'next/server';
import { twitter } from '@web3cash/oauth';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/dashboard';
  try {
    const { url } = await twitter.startAuth({ userWallet: wallet, returnTo });
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'oauth_start_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
