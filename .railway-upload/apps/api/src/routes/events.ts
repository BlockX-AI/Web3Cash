import { Hono } from 'hono';
import { prisma } from '@web3cash/db';
import { requireAuth, getSessionUser } from '../middleware.js';

const events = new Hono();

/**
 * Event ingest endpoint for INSTALL, VISIT, VIDEO quest types.
 * This endpoint allows external systems to record verification events
 * that can later be checked by webhook-based verifiers.
 */
events.post('/ingest', async (c) => {
  const { eventType, userWallet, payload } = await c.req.json<{
    eventType: 'INSTALL' | 'VISIT' | 'VIDEO';
    userWallet: string;
    payload?: Record<string, unknown>;
  }>();

  if (!eventType || !userWallet) {
    return c.json({ error: 'eventType and userWallet are required' }, 400);
  }

  if (!['INSTALL', 'VISIT', 'VIDEO'].includes(eventType)) {
    return c.json({ error: 'Invalid eventType. Must be INSTALL, VISIT, or VIDEO' }, 400);
  }

  const wallet = userWallet.toLowerCase();

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Create verification event
  await prisma.verificationEvent.create({
    data: {
      userWallet: wallet,
      workerName: `event-ingest-${eventType.toLowerCase()}`,
      outcome: 'PASS',
      payload: {
        eventType,
        ...(payload ?? {}),
      } as object,
      latencyMs: 0,
    },
  });

  return c.json({ success: true, eventType, userWallet: wallet });
});

/**
 * Get verification events for a user (authenticated).
 * This can be used by the frontend to see if events have been recorded.
 */
events.get('/my-events', requireAuth, async (c) => {
  const u = await getSessionUser(c);
  if (!u) return c.json({ error: 'User not found' }, 404);

  const eventType = c.req.query('type');
  const limit = parseInt(c.req.query('limit') ?? '50', 10);

  const where: any = { userWallet: u.walletAddress };
  if (eventType) {
    where.payload = {
      path: ['eventType'],
      equals: eventType,
    };
  }

  const events = await prisma.verificationEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return c.json({
    events: events.map((e) => ({
      id: e.id,
      workerName: e.workerName,
      outcome: e.outcome,
      payload: e.payload,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

export default events;
