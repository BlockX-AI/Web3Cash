import { NextResponse } from 'next/server';
import { prisma, Prisma } from '@web3cash/db';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * Returns the caller's referral stats:
 *   - referralCode  (used to build share link)
 *   - refereeCount  (how many users used my code)
 *   - earningsTotal (cumulative L1 USDC earned via referrals, all statuses)
 *   - earningsPending (CREDITED — counted in pendingBalance, not yet withdrawn)
 *   - earningsPaid    (PAID — already withdrawn)
 */
export async function GET() {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [user, refereeCount, sumsByStatus] = await Promise.all([
    prisma.user.findUnique({
      where: { walletAddress: wallet },
      select: { referralCode: true },
    }),
    prisma.referral.count({ where: { referrerWallet: wallet } }),
    prisma.referralEarning.groupBy({
      by: ['status'],
      where: { referrerWallet: wallet },
      _sum: { amountUsdc: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  const sumOf = (status: string) =>
    sumsByStatus
      .find((s) => s.status === status)
      ?._sum.amountUsdc?.toString() ?? '0';

  const total = sumsByStatus.reduce(
    (acc, s) => acc.plus(s._sum.amountUsdc ?? 0),
    new Prisma.Decimal(0),
  );

  return NextResponse.json({
    referralCode: user.referralCode,
    refereeCount,
    earnings: {
      total: total.toString(),
      pending: sumOf('CREDITED'),
      paid: sumOf('PAID'),
      reversed: sumOf('REVERSED'),
    },
  });
}
