import { NextRequest, NextResponse } from 'next/server';
import { consumeState, twitter } from '@web3cash/oauth';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * OAuth 2.0 callback.
 *
 * Security invariants:
 *   - State is single-use (consumed atomically) and bound to the user's wallet.
 *   - We re-check the active session wallet matches the state row; prevents a
 *     victim being linked to an attacker's Twitter account via CSRF.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get('code');
  const state = sp.get('state');
  const errorParam = sp.get('error');

  if (errorParam) {
    return redirectHome(req, `twitter_${errorParam}`);
  }
  if (!code || !state) {
    return redirectHome(req, 'missing_params');
  }

  const row = await consumeState(state);
  if (!row || row.platform !== 'TWITTER') {
    return redirectHome(req, 'invalid_state');
  }

  const sessionWallet = await getSessionWallet();
  if (!sessionWallet || sessionWallet !== row.userWallet) {
    return redirectHome(req, 'session_mismatch');
  }

  try {
    const tokens = await twitter.exchangeCode({
      code,
      codeVerifier: row.codeVerifier,
    });
    const me = await twitter.fetchMe(tokens.access_token);
    await twitter.linkIdentity({
      userWallet: sessionWallet,
      me,
      tokens,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'oauth_exchange_failed';
    return redirectHome(req, encodeURIComponent(msg).slice(0, 80));
  }

  const dest = row.returnTo ?? '/dashboard';
  const url = new URL(dest, req.nextUrl.origin);
  url.searchParams.set('twitter', 'linked');
  return NextResponse.redirect(url);
}

function redirectHome(req: NextRequest, reason: string) {
  const url = new URL('/dashboard', req.nextUrl.origin);
  url.searchParams.set('twitter', 'error');
  url.searchParams.set('reason', reason);
  return NextResponse.redirect(url);
}
