import { NextRequest, NextResponse } from 'next/server';
import { consumeState, github } from '@web3cash/oauth';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get('code');
  const state = sp.get('state');
  const errorParam = sp.get('error');

  if (errorParam) return redirectHome(req, `github_${errorParam}`);
  if (!code || !state) return redirectHome(req, 'missing_params');

  const row = await consumeState(state);
  if (!row || row.platform !== 'GITHUB') return redirectHome(req, 'invalid_state');

  const sessionWallet = await getSessionWallet();
  if (!sessionWallet || sessionWallet !== row.userWallet) {
    return redirectHome(req, 'session_mismatch');
  }

  try {
    const tokens = await github.exchangeCode(code);
    const me = await github.fetchMe(tokens.access_token);
    await github.linkIdentity({ userWallet: sessionWallet, me, tokens });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'oauth_exchange_failed';
    return redirectHome(req, encodeURIComponent(msg).slice(0, 80));
  }

  const dest = row.returnTo ?? '/dashboard';
  const url = new URL(dest, req.nextUrl.origin);
  url.searchParams.set('github', 'linked');
  return NextResponse.redirect(url);
}

function redirectHome(req: NextRequest, reason: string) {
  const url = new URL('/dashboard', req.nextUrl.origin);
  url.searchParams.set('github', 'error');
  url.searchParams.set('reason', reason);
  return NextResponse.redirect(url);
}
