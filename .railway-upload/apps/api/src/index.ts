import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prisma } from '@web3cash/db';
import authRoutes from './routes/auth.js';
import questRoutes from './routes/quests.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import oauthRoutes from './routes/oauth.js';
import kycRoutes from './routes/kyc.js';
import eventRoutes from './routes/events.js';

const app = new Hono();
const requestTimeoutMs = Number(process.env.API_REQUEST_TIMEOUT_MS ?? 2500);

const FRONTEND_ORIGINS = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')
  .concat(['http://localhost:5174', 'http://localhost:5175']);

app.use('*', cors({ origin: FRONTEND_ORIGINS, credentials: true }));
app.use('*', logger());
app.use('*', async (c, next) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const nextPromise = next().then(() => c.res);
  nextPromise.catch(() => undefined);
  const timeoutPromise = new Promise<Response>((resolve) => {
    timeout = setTimeout(() => {
      resolve(c.json({
        error: 'Request timeout',
        code: 'REQUEST_TIMEOUT',
        timeoutMs: requestTimeoutMs,
      }, 504));
    }, requestTimeoutMs);
  });
  const response = await Promise.race([nextPromise, timeoutPromise]);
  if (timeout) clearTimeout(timeout);
  return response;
});

app.onError((err, c) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  const databaseUnavailable =
    message.includes("Can't reach database server") ||
    message.includes('database server') ||
    message.includes('P1001');
  if (databaseUnavailable) {
    return c.json({
      error: 'Database unavailable',
      code: 'DATABASE_UNAVAILABLE',
      detail: message,
    }, 503);
  }
  return c.json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    detail: process.env.NODE_ENV === 'production' ? undefined : message,
  }, 500);
});

app.notFound((c) => c.json({ error: 'Not found', path: c.req.path }, 404));

/* ── Health ─────────────────────────────────────────────────────────────── */

app.get('/api/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() }),
);

app.get('/api/ready', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ status: 'ready', database: 'ok', ts: new Date().toISOString() });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown database error';
    return c.json({
      status: 'not_ready',
      database: 'unavailable',
      detail,
      ts: new Date().toISOString(),
    }, 503);
  }
});

/* ── Waitlist (public) ──────────────────────────────────────────────────── */

app.post('/api/waitlist', async (c) => {
  try {
    const body = await c.req.json<{ email?: string; walletAddress?: string }>();
    const email = body.email?.trim().toLowerCase() || null;
    const wallet = body.walletAddress?.trim().toLowerCase() || null;
    if (!email && !wallet) {
      return c.json({ error: 'Provide an email or wallet address.' }, 400);
    }
    if (email) {
      await prisma.waitlistEntry.upsert({
        where: { email },
        create: { email, walletAddress: wallet },
        update: {},
      });
    } else {
      await prisma.waitlistEntry.upsert({
        where: { walletAddress: wallet! },
        create: { walletAddress: wallet },
        update: {},
      });
    }
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Error' }, 500);
  }
});

/* ── Route groups ───────────────────────────────────────────────────────── */

app.route('/api/auth', authRoutes);
app.route('/api/quests', questRoutes);
app.route('/api/user', userRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/oauth', oauthRoutes);
app.route('/api/kyc', kycRoutes);
app.route('/api/events', eventRoutes);

/* ── Start ──────────────────────────────────────────────────────────────── */

const port = parseInt(process.env.API_PORT ?? '3001', 10);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀  Web3Cash API  →  http://localhost:${info.port}`);
});
