import { NextResponse } from 'next/server';
import { prisma } from '@web3cash/db';
import { createWithdrawal } from '@web3cash/payouts';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

const HTTP_STATUS_BY_CODE: Record<string, number> = {
  NO_PENDING_BALANCE: 400,
  BELOW_MIN_WITHDRAWAL: 400,
  KYC_REQUIRED: 402, // Payment Required — semantically closest
  USER_NOT_FOUND: 404,
  INTERNAL_LEDGER_MISMATCH: 500,
};

/** Initiate a withdrawal. Drains pendingBalanceUsdc → QUEUED Payout. */
export async function POST() {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await createWithdrawal(wallet, {
    chainId: Number(process.env.DEFAULT_CHAIN_ID ?? '1'),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, message: result.message ?? null },
      { status: HTTP_STATUS_BY_CODE[result.code] ?? 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    payoutId: result.payoutId,
    amountUsdc: result.amountUsdc,
    lineItemCount: result.lineItemCount,
  });
}

/** List the caller's payouts (paginated by created_at desc, capped at 50). */
export async function GET() {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payouts = await prisma.payout.findMany({
    where: { userWallet: wallet },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      amountUsdc: true,
      provider: true,
      status: true,
      chainId: true,
      txHash: true,
      providerRef: true,
      failureReason: true,
      submittedAt: true,
      confirmedAt: true,
      createdAt: true,
      lineItems: true,
    },
  });

  return NextResponse.json({
    payouts: payouts.map((p) => ({
      ...p,
      amountUsdc: p.amountUsdc.toString(),
      submittedAt: p.submittedAt?.toISOString() ?? null,
      confirmedAt: p.confirmedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}
