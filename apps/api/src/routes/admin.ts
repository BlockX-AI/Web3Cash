import { Hono } from 'hono';
import { prisma } from '@web3cash/db';
import { requireAdmin } from '../middleware.js';

const admin = new Hono();

admin.use('*', requireAdmin);

/* ── Stats dashboard ────────────────────────────────────────────────────── */

admin.get('/stats', async (c) => {
  const [users, quests, pendingPayouts, waitlist, totalPaid] = await Promise.all([
    prisma.user.count(),
    prisma.quest.count({ where: { active: true } }),
    prisma.payout.count({ where: { status: 'QUEUED' } }),
    prisma.waitlistEntry.count(),
    prisma.payout.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { amountUsdc: true },
    }),
  ]);

  return c.json({
    totalUsers: users,
    activeQuests: quests,
    pendingPayouts,
    waitlistCount: waitlist,
    totalPaidUsdc: totalPaid._sum.amountUsdc?.toString() ?? '0',
  });
});

/* ── Users ──────────────────────────────────────────────────────────────── */

admin.get('/users', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const limit = parseInt(c.req.query('limit') ?? '20', 10);
  const search = c.req.query('search') ?? '';
  const skip = (page - 1) * limit;

  const where = search
    ? { walletAddress: { contains: search.toLowerCase() } }
    : {};

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        walletAddress: true,
        chainId: true,
        sybilScore: true,
        kycStatus: true,
        tier: true,
        pendingBalanceUsdc: true,
        totalEarnedUsdc: true,
        referralCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return c.json({
    users: rows.map((u: any) => ({
      ...u,
      pendingBalanceUsdc: u.pendingBalanceUsdc.toString(),
      totalEarnedUsdc: u.totalEarnedUsdc.toString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

admin.post('/set-sybil', async (c) => {
  const { walletAddress, score } = await c.req.json<{ walletAddress: string; score: number }>();
  if (!walletAddress || score == null) {
    return c.json({ error: 'walletAddress and score required' }, 400);
  }
  await prisma.user.update({
    where: { walletAddress: walletAddress.toLowerCase() },
    data: { sybilScore: score, sybilComputedAt: new Date() },
  });
  return c.json({ success: true });
});

/* ── Quests CRUD ────────────────────────────────────────────────────────── */

admin.get('/quests', async (c) => {
  const rows = await prisma.quest.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      rewardUsdc: true,
      maxCompletions: true,
      completionsCount: true,
      minSybilScore: true,
      active: true,
      createdAt: true,
      campaign: { select: { name: true, project: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json({
    quests: rows.map((q: any) => ({ ...q, rewardUsdc: q.rewardUsdc.toString() })),
  });
});

admin.post('/quests', async (c) => {
  const body = await c.req.json<{
    campaignId: string;
    title: string;
    description?: string;
    type: string;
    rewardUsdc: string;
    maxCompletions: number;
    minSybilScore?: number;
    requirements?: object;
  }>();
  const quest = await prisma.quest.create({
    data: {
      campaignId: body.campaignId,
      title: body.title,
      description: body.description ?? null,
      type: body.type as any,
      rewardUsdc: parseFloat(body.rewardUsdc),
      maxCompletions: body.maxCompletions,
      minSybilScore: body.minSybilScore ?? 40,
      requirements: body.requirements ?? {},
    },
  });
  return c.json({ id: quest.id, success: true });
});

admin.patch('/quests/:id', async (c) => {
  const id = c.req.param('id') ?? '';
  const body = await c.req.json<Partial<{
    title: string;
    description: string;
    rewardUsdc: string;
    maxCompletions: number;
    active: boolean;
    minSybilScore: number;
    requirements?: object;
  }>>();

  const quest = await prisma.quest.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.rewardUsdc !== undefined && { rewardUsdc: parseFloat(body.rewardUsdc) }),
      ...(body.maxCompletions !== undefined && { maxCompletions: body.maxCompletions }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.minSybilScore !== undefined && { minSybilScore: body.minSybilScore }),
      ...(body.requirements !== undefined && { requirements: body.requirements }),
    },
  });
  return c.json({ success: true, id: quest.id });
});

admin.delete('/quests/:id', async (c) => {
  const id = c.req.param('id') ?? '';
  await prisma.quest.update({ where: { id }, data: { active: false } });
  return c.json({ success: true });
});

/* ── Payouts ────────────────────────────────────────────────────────────── */

admin.get('/payouts', async (c) => {
  const status = c.req.query('status');
  const where = status ? { status: status as any } : {};

  const rows = await prisma.payout.findMany({
    where,
    select: {
      id: true,
      userWallet: true,
      amountUsdc: true,
      status: true,
      provider: true,
      txHash: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return c.json({
    payouts: rows.map((p: any) => ({ ...p, amountUsdc: p.amountUsdc.toString() })),
  });
});

admin.get('/check-payouts', async (c) => {
  const queued = await prisma.payout.count({ where: { status: 'QUEUED' } });
  const submitted = await prisma.payout.count({ where: { status: 'SUBMITTED' } });
  const confirmed = await prisma.payout.count({ where: { status: 'CONFIRMED' } });
  const failed = await prisma.payout.count({ where: { status: 'FAILED' } });
  return c.json({ queued, submitted, confirmed, failed });
});

/* ── Projects bootstrap ─────────────────────────────────────────────────── */

admin.post('/bootstrap-project', async (c) => {
  const body = await c.req.json<{ name: string; walletAddress: string; website?: string }>();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      walletAddress: body.walletAddress.toLowerCase(),
      website: body.website ?? null,
      status: 'APPROVED',
    },
  });
  return c.json({ projectId: project.id, success: true });
});

/* ── Campaigns CRUD ─────────────────────────────────────────────────────── */

admin.get('/campaigns', async (c) => {
  const rows = await prisma.campaign.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      budgetUsdc: true,
      spentUsdc: true,
      startsAt: true,
      endsAt: true,
      projectId: true,
      project: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json({
    campaigns: rows.map((c: any) => ({ ...c, budgetUsdc: c.budgetUsdc.toString(), spentUsdc: c.spentUsdc.toString() })),
  });
});

admin.post('/campaigns', async (c) => {
  const body = await c.req.json<{
    projectId: string;
    name: string;
    budgetUsdc: string;
    startsAt?: string;
    endsAt?: string;
  }>();
  const campaign = await prisma.campaign.create({
    data: {
      projectId: body.projectId,
      name: body.name,
      budgetUsdc: parseFloat(body.budgetUsdc),
      startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      status: 'ACTIVE',
    },
  });
  return c.json({ id: campaign.id, success: true });
});

admin.patch('/campaigns/:id', async (c) => {
  const id = c.req.param('id') ?? '';
  const body = await c.req.json<Partial<{
    name: string;
    budgetUsdc: string;
    status: string;
    startsAt: string;
    endsAt: string;
  }>>();

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.budgetUsdc !== undefined && { budgetUsdc: parseFloat(body.budgetUsdc) }),
      ...(body.status !== undefined && { status: body.status as any }),
      ...(body.startsAt !== undefined && { startsAt: new Date(body.startsAt) }),
      ...(body.endsAt !== undefined && { endsAt: body.endsAt ? new Date(body.endsAt) : null }),
    },
  });
  return c.json({ success: true, id: campaign.id });
});

admin.delete('/campaigns/:id', async (c) => {
  const id = c.req.param('id') ?? '';
  await prisma.campaign.update({ where: { id }, data: { status: 'ENDED' } });
  return c.json({ success: true });
});

/* ── Waitlist ────────────────────────────────────────────────────────────── */

admin.get('/waitlist', async (c) => {
  const rows = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ entries: rows, total: rows.length });
});

/* ── Fraud: flagged wallets ──────────────────────────────────────────────── */

admin.get('/fraud/flagged-wallets', async (c) => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Users with sybil score < 20 OR who completed 5+ quests in last 24h
  const [lowSybil, highVelocity] = await Promise.all([
    prisma.user.findMany({
      where: { sybilScore: { lt: 20 } },
      select: {
        walletAddress: true, sybilScore: true,
        totalEarnedUsdc: true, createdAt: true,
        _count: { select: { questCompletions: { where: { createdAt: { gte: since24h } } } } },
      },
      orderBy: { sybilScore: 'asc' },
      take: 50,
    }),
    prisma.user.findMany({
      where: {
        questCompletions: { some: { createdAt: { gte: since24h } } },
      },
      select: {
        walletAddress: true, sybilScore: true,
        totalEarnedUsdc: true, createdAt: true,
        _count: { select: { questCompletions: { where: { createdAt: { gte: since24h } } } } },
      },
      orderBy: { sybilScore: 'asc' },
      take: 50,
    }),
  ]);

  // Merge and deduplicate
  const seen = new Set<string>();
  const wallets = [...lowSybil, ...highVelocity]
    .filter((u) => {
      if (seen.has(u.walletAddress)) return false;
      seen.add(u.walletAddress);
      return true;
    })
    .filter((u) => u.sybilScore < 20 || u._count.questCompletions >= 5)
    .map((u) => ({
      walletAddress: u.walletAddress,
      sybilScore: u.sybilScore,
      completionsLast24h: u._count.questCompletions,
      totalEarnedUsdc: u.totalEarnedUsdc.toString(),
      flagReason: u.sybilScore < 20
        ? `Sybil score critically low (${u.sybilScore})`
        : `High velocity: ${u._count.questCompletions} completions in 24h`,
      createdAt: u.createdAt.toISOString(),
    }));

  return c.json({ wallets });
});

/* ── Fraud: sybil score distribution ────────────────────────────────────── */

admin.get('/fraud/sybil-distribution', async (c) => {
  const total = await prisma.user.count();

  const bucketRanges = [
    { label: '0–19',  min: 0,  max: 19  },
    { label: '20–39', min: 20, max: 39  },
    { label: '40–59', min: 40, max: 59  },
    { label: '60–79', min: 60, max: 79  },
    { label: '80–100',min: 80, max: 100 },
  ];

  const buckets = await Promise.all(
    bucketRanges.map(async (b) => ({
      range: b.label,
      count: await prisma.user.count({ where: { sybilScore: { gte: b.min, lte: b.max } } }),
      pct: total > 0
        ? Math.round((await prisma.user.count({ where: { sybilScore: { gte: b.min, lte: b.max } } })) / total * 100)
        : 0,
    })),
  );

  return c.json({ buckets });
});

/* ── Fraud: velocity alerts ──────────────────────────────────────────────── */

admin.get('/fraud/velocity-alerts', async (c) => {
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000);

  const results = await prisma.questCompletion.groupBy({
    by: ['userWallet'],
    where: { createdAt: { gte: sinceHour } },
    _count: { userWallet: true },
    having: { userWallet: { _count: { gte: 3 } } },
    orderBy: { _count: { userWallet: 'desc' } },
    take: 50,
  });

  const alerts = results.map((r: any) => ({
    walletAddress: r.userWallet,
    completionsLastHour: r._count.userWallet,
    threshold: 5,
    triggeredAt: new Date().toISOString(),
  }));

  return c.json({ alerts });
});

/* ── Fraud: manual review queue ──────────────────────────────────────────── */

admin.get('/fraud/review-queue', async (c) => {
  const reviews = await prisma.adminReview.findMany({
    where: { decision: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return c.json({
    reviews: reviews.map((r: any) => ({
      id: r.id,
      walletAddress: r.targetId,
      reason: r.rationale,
      status: r.decision,
      note: null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

admin.post('/fraud/review-queue/:id/resolve', async (c) => {
  const id = c.req.param('id') ?? '';
  const { action, note } = await c.req.json<{ action: 'APPROVE' | 'REJECT'; note?: string }>();

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return c.json({ error: 'action must be APPROVE or REJECT' }, 400);
  }

  const review = await prisma.adminReview.update({
    where: { id },
    data: { decision: action === 'APPROVE' ? 'APPROVED' : 'REJECTED', rationale: note ?? `Admin ${action.toLowerCase()}d` },
  });

  return c.json({ id: review.id, status: review.decision });
});

export default admin;
