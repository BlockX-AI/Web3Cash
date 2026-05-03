/**
 * Admin endpoint to manually set Sybil score for testing.
 * In production, this would be protected by admin auth.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@web3cash/db';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const score = Number(body.score ?? 100);

  if (score < 0 || score > 100) {
    return NextResponse.json({ error: 'score must be 0-100' }, { status: 400 });
  }

  await prisma.user.update({
    where: { walletAddress: wallet },
    data: { sybilScore: score },
  });

  return NextResponse.json({
    ok: true,
    wallet,
    newScore: score,
    message: `Sybil score set to ${score}/100`,
  });
}
