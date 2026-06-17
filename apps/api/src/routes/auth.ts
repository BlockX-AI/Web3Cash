import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { issueNonce, verifySiwe, signSession, verifySession, upsertUserOnLogin } from '@web3cash/auth';
import { prisma } from '@web3cash/db';
import { firePostback } from '@web3cash/offer18';
import { scheduleComputeSybilScore } from '../lib/queues.js';
import { google } from '@web3cash/oauth';
import { randomBytes } from 'crypto';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://web3cash-app.vercel.app';
const API_BASE = process.env.API_BASE_URL ?? 'https://webcash-production.up.railway.app';
const GOOGLE_REGISTER_REDIRECT_URI = `${API_BASE}/api/auth/google/callback`;

const auth = new Hono();

auth.post('/nonce', async (c) => {
  const nonce = await issueNonce();
  return c.json({ nonce });
});

auth.post('/verify', async (c) => {
  try {
    const { message, signature, offer18ClickId, offer18AffId, offer18OfferId, referredByCode } =
      await c.req.json<{
        message: string;
        signature: string;
        offer18ClickId?: string;
        offer18AffId?: string;
        offer18OfferId?: string;
        referredByCode?: string;
      }>();
    const verified = await verifySiwe(message, signature);
    const { user, isNew } = await upsertUserOnLogin({
      walletAddress: verified.walletAddress,
      chainId: verified.chainId,
      offer18ClickId: offer18ClickId ?? null,
      offer18AffId: offer18AffId ?? null,
      offer18OfferId: offer18OfferId ?? null,
      referredByCode: referredByCode ?? null,
    });
    if (isNew && offer18ClickId) {
      firePostback({ clickId: offer18ClickId, goal: 'signup' }).catch(() => {});
    }
    if (isNew) {
      scheduleComputeSybilScore(user.walletAddress, user.chainId).catch((err) => {
        console.error('Failed to schedule sybil score computation:', err);
      });
    }
    const token = await signSession({ sub: user.walletAddress, chainId: user.chainId });
    setCookie(c, 'w3c_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 3600,
      path: '/',
    });
    return c.json({ success: true, walletAddress: user.walletAddress });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Verification failed' }, 401);
  }
});

auth.get('/me', async (c) => {
  const token = getCookie(c, 'w3c_session');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const claims = await verifySession(token);
  if (!claims) return c.json({ error: 'Unauthorized' }, 401);
  const user = await prisma.user.findUnique({ where: { walletAddress: claims.sub } });
  if (!user) return c.json({ error: 'Not found' }, 404);
  return c.json({
    walletAddress: user.walletAddress,
    chainId: user.chainId,
    sybilScore: user.sybilScore,
    kycStatus: user.kycStatus,
    tier: user.tier,
    pendingBalanceUsdc: user.pendingBalanceUsdc.toString(),
    totalEarnedUsdc: user.totalEarnedUsdc.toString(),
    referralCode: user.referralCode,
  });
});

auth.post('/logout', (c) => {
  deleteCookie(c, 'w3c_session', { path: '/' });
  return c.json({ success: true });
});

auth.get('/google/check', async (c) => {
  const sessionId = getCookie(c, 'w3c_google_reg');
  if (!sessionId) return c.json({ authenticated: false }, 401);

  const googleSession = await prisma.oauthState.findUnique({ where: { state: sessionId } });
  if (!googleSession || new Date() > googleSession.expiresAt) {
    return c.json({ authenticated: false }, 401);
  }

  return c.json({ authenticated: true });
});

/* ────────────────────────────────────────────────────────────
   GOOGLE-FIRST REGISTRATION
   New user lands on homepage → clicks "Sign in with Google"
   → Google OAuth → prompt wallet connect → create account
   ──────────────────────────────────────────────────────────── */

auth.get('/google/start', async (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return c.json({ error: 'Google OAuth not configured' }, 500);

  const state = randomBytes(32).toString('hex');

  await prisma.oauthState.create({
    data: {
      state,
      platform: 'GOOGLE',
      userWallet: '0x0000000000000000000000000000000000000000',
      codeVerifier: '{}',
      returnTo: c.req.query('returnTo') ?? '/dashboard',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', GOOGLE_REGISTER_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');

  return c.redirect(url.toString());
});

auth.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const stateParam = c.req.query('state');
  const errorParam = c.req.query('error');

  if (errorParam) return c.redirect(`${FRONTEND_URL}/?error=google_denied`);
  if (!code || !stateParam) return c.redirect(`${FRONTEND_URL}/?error=google_invalid`);

  const stateRow = await prisma.oauthState.findUnique({ where: { state: stateParam } });
  if (!stateRow || new Date() > stateRow.expiresAt) {
    return c.redirect(`${FRONTEND_URL}/?error=google_state_expired`);
  }
  await prisma.oauthState.delete({ where: { state: stateParam } });

  try {
    const tokens = await google.exchangeCode(code, GOOGLE_REGISTER_REDIRECT_URI);
    const me = await google.fetchMe(tokens.access_token);

    const sessionId = randomBytes(32).toString('hex');
    await prisma.oauthState.create({
      data: {
        state: sessionId,
        platform: 'GOOGLE',
        userWallet: '0x0000000000000000000000000000000000000000',
        codeVerifier: JSON.stringify({ me, tokens }),
        returnTo: stateRow.returnTo ?? '/dashboard',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Return session ID in URL hash for localStorage (no cookies for cross-domain)
    return c.redirect(`${FRONTEND_URL}/#google_session=${sessionId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return c.redirect(`${FRONTEND_URL}/?error=google_failed&detail=${encodeURIComponent(msg)}`);
  }
});

auth.post('/google/link-wallet', async (c) => {
  try {
    const { message, signature, offer18ClickId, offer18AffId, offer18OfferId, referredByCode, googleSessionId } =
      await c.req.json<{
        message: string;
        signature: string;
        offer18ClickId?: string;
        offer18AffId?: string;
        offer18OfferId?: string;
        referredByCode?: string;
        googleSessionId?: string;
      }>();

    if (!googleSessionId) return c.json({ error: 'No Google session — please sign in with Google again' }, 400);

    const googleSession = await prisma.oauthState.findUnique({ where: { state: googleSessionId } });
    if (!googleSession || new Date() > googleSession.expiresAt) {
      return c.json({ error: 'Google session expired — please sign in with Google again' }, 400);
    }

    const { me, tokens } = JSON.parse(googleSession.codeVerifier) as {
      me: { sub: string; email: string; name: string | null; picture: string | null };
      tokens: { access_token: string; id_token: string; token_type: string; expires_in: number };
    };

    const verified = await verifySiwe(message, signature);
    const { user, isNew } = await upsertUserOnLogin({
      walletAddress: verified.walletAddress,
      chainId: verified.chainId,
      offer18ClickId: offer18ClickId ?? null,
      offer18AffId: offer18AffId ?? null,
      offer18OfferId: offer18OfferId ?? null,
      referredByCode: referredByCode ?? null,
    });

    await google.linkIdentity({ userWallet: user.walletAddress, me, tokens });

    if (isNew && offer18ClickId) {
      firePostback({ clickId: offer18ClickId, goal: 'signup' }).catch(() => {});
    }
    if (isNew) {
      scheduleComputeSybilScore(user.walletAddress, user.chainId).catch(() => {});
    }

    const token = await signSession({ sub: user.walletAddress, chainId: user.chainId });

    await prisma.oauthState.delete({ where: { state: googleSessionId } });

    setCookie(c, 'w3c_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 3600,
      path: '/',
    });

    return c.json({ success: true, walletAddress: user.walletAddress, token, isNew });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Failed to link wallet' }, 401);
  }
});

export default auth;
