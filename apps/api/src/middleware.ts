import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifySession } from '@web3cash/auth';
import { prisma } from '@web3cash/db';

/**
 * Extract the session JWT from either the Authorization: Bearer header
 * (primary — survives the cross-domain Vercel↔Railway split where cookies
 * are dropped) or the legacy w3c_session cookie, or a ?token= query param
 * (used by OAuth redirect flows that can't send headers).
 */
export function getSessionToken(c: Context): string | null {
  const authHeader = c.req.header('authorization') ?? c.req.header('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const queryToken = c.req.query('token');
  if (queryToken) return queryToken;
  return getCookie(c, 'w3c_session') ?? null;
}

export async function requireAuth(c: Context, next: Next) {
  const token = getSessionToken(c);
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const claims = await verifySession(token);
  if (!claims) return c.json({ error: 'Unauthorized' }, 401);
  c.set('walletAddress', claims.sub);
  c.set('chainId', claims.chainId);
  await next();
}

export async function requireAdmin(c: Context, next: Next) {
  const secret = c.req.header('x-admin-secret');
  const expected = process.env.ADMIN_SECRET;
  if (!expected || secret !== expected) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
}

export async function getSessionUser(c: Context) {
  const wallet: string = c.get('walletAddress');
  const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  return user;
}
