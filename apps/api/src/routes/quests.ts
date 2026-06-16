import { Hono } from 'hono';
import { prisma } from '@web3cash/db';
import { attemptCompletion } from '@web3cash/verifiers';
import { scheduleQuestRecheck } from '../lib/queues.js';
import { MAX_COMPLETIONS_PER_HOUR } from '@web3cash/shared';
import { requireAuth, getSessionUser } from '../middleware.js';
import { checkVelocity } from '../lib/redis.js';

const quests = new Hono();

quests.get('/', async (c) => {
  const rows = await prisma.quest.findMany({
    where: { active: true },
    select: {
      id: true,
      title: true,
      description: true,
      rewardUsdc: true,
      type: true,
      maxCompletions: true,
      completionsCount: true,
      minSybilScore: true,
      requirements: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return c.json({
    quests: rows.map((q: any) => ({ ...q, rewardUsdc: q.rewardUsdc.toString() })),
  });
});

quests.get('/campaigns', async (c) => {
  const rows = await prisma.campaign.findMany({
    where: { status: { in: ['ACTIVE', 'FUNDED'] } },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          verifiedBadge: true,
        },
      },
      quests: {
        where: { active: true },
        select: {
          id: true,
          title: true,
          type: true,
          rewardUsdc: true,
          maxCompletions: true,
          completionsCount: true,
          minSybilScore: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return c.json({
    campaigns: rows.map((c: any) => ({
      ...c,
      budgetUsdc: c.budgetUsdc.toString(),
      spentUsdc: c.spentUsdc.toString(),
      quests: c.quests.map((q: any) => ({
        ...q,
        rewardUsdc: q.rewardUsdc.toString(),
      })),
    })),
  });
});

quests.get('/my-completions', requireAuth, async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const completions = await prisma.questCompletion.findMany({
    where: { userWallet: user.walletAddress },
    select: {
      id: true,
      questId: true,
      status: true,
      rewardUsdc: true,
      verifiedAt: true,
      releaseAt: true,
      paidAt: true,
      quest: { select: { title: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return c.json({
    completions: completions.map((c) => ({
      ...c,
      rewardUsdc: c.rewardUsdc.toString(),
    })),
  });
});

quests.post('/:id/complete', requireAuth, async (c) => {
  const questId = c.req.param('id') ?? '';
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'User not found' }, 404);

  // Velocity gate: max N completions per hour across ALL quests
  const underLimit = await checkVelocity(user.walletAddress, MAX_COMPLETIONS_PER_HOUR);
  if (!underLimit) {
    return c.json({ error: 'Rate limit exceeded. Try again later.' }, 429);
  }

  const result = await attemptCompletion({ userWallet: user.walletAddress, questId });

  if (!result.ok) {
    const status = result.code === 'ALREADY_CLAIMED' ? 409
      : result.code === 'SYBIL_TOO_LOW' ? 403
      : result.code === 'BUDGET_EXHAUSTED' ? 410
      : result.code === 'VERIFY_FAIL' ? 422
      : result.code === 'QUEST_NOT_FOUND' || result.code === 'QUEST_INACTIVE' ? 404
      : 400;
    return c.json({ error: result.code, message: result.message }, status);
  }

  // Schedule the background recheck job at releaseAt
  await scheduleQuestRecheck(result.completionId, result.releaseAt);

  return c.json({
    completionId: result.completionId,
    status: result.status,
    releaseAt: result.releaseAt,
  });
});

export default quests;
