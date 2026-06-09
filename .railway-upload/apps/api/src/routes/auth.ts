import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { issueNonce, verifySiwe, signSession, verifySession, upsertUserOnLogin } from '@web3cash/auth';
import { prisma } from '@web3cash/db';
import { firePostback } from '@web3cash/offer18';
import { scheduleComputeSybilScore } from '../lib/queues.js';

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

export default auth;
