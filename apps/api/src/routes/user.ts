import { Hono } from 'hono';
import { prisma } from '@web3cash/db';
import { requireAuth, getSessionUser } from '../middleware.js';
import { createWithdrawal } from '@web3cash/payouts';

const user = new Hono();

user.get('/referrals', requireAuth, async (c) => {
  const u = await getSessionUser(c);
  if (!u) return c.json({ error: 'User not found' }, 404);

  const [earningsRows, totalAgg, l1Count, l2Count] = await Promise.all([
    prisma.referralEarning.findMany({
      where: { referrerWallet: u.walletAddress },
      select: {
        id: true,
        refereeWallet: true,
        level: true,
        amountUsdc: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.referralEarning.aggregate({
      where: { referrerWallet: u.walletAddress },
      _sum: { amountUsdc: true },
    }),
    prisma.referralEarning.count({
      where: { referrerWallet: u.walletAddress, level: 1 },
    }),
    prisma.referralEarning.count({
      where: { referrerWallet: u.walletAddress, level: 2 },
    }),
  ]);

  return c.json({
    totalReferralEarnings: totalAgg._sum.amountUsdc?.toString() ?? '0',
    l1Count,
    l2Count,
    earnings: earningsRows.map((e: any) => ({
      ...e,
      amountUsdc: e.amountUsdc.toString(),
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

user.get('/withdrawals', requireAuth, async (c) => {
  const u = await getSessionUser(c);
  if (!u) return c.json({ error: 'User not found' }, 404);

  const payouts = await prisma.payout.findMany({
    where: { userWallet: u.walletAddress },
    select: {
      id: true,
      amountUsdc: true,
      status: true,
      provider: true,
      txHash: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return c.json({
    payouts: payouts.map((p: any) => ({ ...p, amountUsdc: p.amountUsdc.toString() })),
  });
});

user.post('/withdrawals', requireAuth, async (c) => {
  const u = await getSessionUser(c);
  if (!u) return c.json({ error: 'User not found' }, 404);

  const result = await createWithdrawal(u.walletAddress, { chainId: u.chainId });

  if (!result.ok) {
    const errorMessages: Record<string, string> = {
      NO_PENDING_BALANCE: 'No pending balance available for withdrawal',
      BELOW_MIN_WITHDRAWAL: 'Minimum withdrawal is $1 USDC',
      KYC_REQUIRED: 'KYC verification required for withdrawals above $500 USDC',
      USER_NOT_FOUND: 'User not found',
      INTERNAL_LEDGER_MISMATCH: result.message ?? 'Internal ledger mismatch',
    };
    return c.json(
      { error: errorMessages[result.code] ?? 'Withdrawal failed' },
      400,
    );
  }

  return c.json({
    payoutId: result.payoutId,
    amountUsdc: result.amountUsdc,
    lineItemCount: result.lineItemCount,
  });
});

export default user;
