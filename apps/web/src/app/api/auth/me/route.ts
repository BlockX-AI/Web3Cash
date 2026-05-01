import { verifySession } from '@web3cash/auth';
import { prisma } from '@web3cash/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const token = cookies().get('w3c_session')?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const claims = await verifySession(token);
  if (!claims) return NextResponse.json({ user: null }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { walletAddress: claims.sub },
    select: {
      walletAddress: true,
      chainId: true,
      sybilScore: true,
      kycStatus: true,
      tier: true,
      referralCode: true,
      pendingBalanceUsdc: true,
      totalEarnedUsdc: true,
    },
  });

  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({
    user: {
      ...user,
      pendingBalanceUsdc: user.pendingBalanceUsdc.toString(),
      totalEarnedUsdc: user.totalEarnedUsdc.toString(),
    },
  });
}
