import { NextResponse } from 'next/server';
import { persona } from '@web3cash/oauth';
import { prisma } from '@web3cash/db';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * Create a Persona inquiry for the authenticated user and persist the inquiry
 * id so the webhook can correlate updates back. Returns the one-time URL
 * (or session token) for the frontend to embed/redirect to.
 */
export async function POST() {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: wallet },
    select: { kycStatus: true, kycInquiryId: true, email: true },
  });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  if (user.kycStatus === 'VERIFIED') {
    return NextResponse.json({ error: 'already_verified' }, { status: 409 });
  }

  try {
    const inquiry = await persona.createInquiry({
      userWallet: wallet,
      email: user.email ?? undefined,
    });

    await prisma.user.update({
      where: { walletAddress: wallet },
      data: {
        kycInquiryId: inquiry.inquiryId,
        kycStatus: user.kycStatus === 'NONE' ? 'PENDING' : user.kycStatus,
      },
    });

    return NextResponse.json({
      inquiryId: inquiry.inquiryId,
      oneTimeLink: inquiry.oneTimeLink,
      sessionToken: inquiry.sessionToken,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'kyc_start_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
