import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifySession } from '@web3cash/auth';
import { prisma } from '@web3cash/db';

export async function requireAuth(c: Context, next: Next) {
  const token = getCookie(c, 'w3c_session');
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
