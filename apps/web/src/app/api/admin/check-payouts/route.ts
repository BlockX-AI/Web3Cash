/**
 * Admin endpoint to check payout status in database
 */
import { NextResponse } from 'next/server';
import { prisma } from '@web3cash/db';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payouts = await prisma.payout.findMany({
    where: { userWallet: wallet },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return NextResponse.json({ payouts });
}
