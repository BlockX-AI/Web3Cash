import { prisma, Prisma } from '@web3cash/db';
import { REFERRAL_L1_RATE_BPS, REFERRAL_L2_RATE_BPS } from '@web3cash/shared';
import { getVerifier } from './registry.js';

/**
 * Re-verify a HOLDING completion after the hold window elapses.
 * Called by the worker's `recheck-quest` job.
 *
 * - Still PASS       → status=VERIFIED, credit pendingBalanceUsdc, AND if the
 *                       user has a referrer, credit the referrer's L1 share
 *                       (REFERRAL_L1_RATE_BPS basis points) atomically.
 * - FAIL / INVALID   → status=FAILED, release the reserved completion slot.
 * - RETRY            → leave HOLDING; the job will be re-scheduled.
 */
export type RecheckOutcome = 'PROMOTED' | 'FAILED' | 'RETRY' | 'NOOP';

export async function recheckCompletion(
  completionId: string,
): Promise<RecheckOutcome> {
  const completion = await prisma.questCompletion.findUnique({
    where: { id: completionId },
    include: { quest: true },
  });
  if (!completion || completion.status !== 'HOLDING') return 'NOOP';

  const verifier = getVerifier(completion.quest.type);
  if (!verifier) return 'NOOP';

  const result = await verifier.verify({
    userWallet: completion.userWallet,
    questType: completion.quest.type,
    requirements: completion.quest.requirements as Record<string, unknown>,
  });

  await prisma.verificationEvent.create({
    data: {
      completionId,
      userWallet: completion.userWallet,
      workerName: `recheck.${completion.quest.type.toLowerCase()}`,
      outcome: result.outcome,
      latencyMs: result.latencyMs,
      payload: result.payload as object,
      errorMessage: result.errorMessage ?? null,
    },
  });

  if (result.outcome === 'RETRY') return 'RETRY';

  if (result.outcome === 'PASS') {
    // Credit referee's pending balance and (if applicable) the referrer's L1
    // and L2 shares — all in one transaction so the ledger never desyncs.
    const referee = await prisma.user.findUnique({
      where: { walletAddress: completion.userWallet },
      select: { referredByWallet: true },
    });

    const l1Wallet = referee?.referredByWallet ?? null;

    // Fetch L1 referrer's own referrer for L2
    let l2Wallet: string | null = null;
    if (l1Wallet) {
      const l1User = await prisma.user.findUnique({
        where: { walletAddress: l1Wallet },
        select: { referredByWallet: true },
      });
      l2Wallet = l1User?.referredByWallet ?? null;
    }

    const l1Amount = l1Wallet
      ? completion.rewardUsdc
          .mul(REFERRAL_L1_RATE_BPS)
          .div(10_000)
          .toDecimalPlaces(6, Prisma.Decimal.ROUND_DOWN)
      : null;

    const l2Amount = l2Wallet && l1Amount
      ? completion.rewardUsdc
          .mul(REFERRAL_L2_RATE_BPS)
          .div(10_000)
          .toDecimalPlaces(6, Prisma.Decimal.ROUND_DOWN)
      : null;

    const writes: Prisma.PrismaPromise<unknown>[] = [
      prisma.questCompletion.update({
        where: { id: completionId },
        data: { status: 'VERIFIED' },
      }),
      prisma.user.update({
        where: { walletAddress: completion.userWallet },
        data: {
          pendingBalanceUsdc: { increment: completion.rewardUsdc },
          totalEarnedUsdc: { increment: completion.rewardUsdc },
        },
      }),
    ];

    if (l1Wallet && l1Amount && l1Amount.gt(0)) {
      writes.push(
        prisma.referralEarning.create({
          data: {
            referrerWallet: l1Wallet,
            refereeWallet: completion.userWallet,
            completionId,
            level: 1,
            rateBps: REFERRAL_L1_RATE_BPS,
            amountUsdc: l1Amount,
          },
        }),
        prisma.user.update({
          where: { walletAddress: l1Wallet },
          data: {
            pendingBalanceUsdc: { increment: l1Amount },
            totalEarnedUsdc: { increment: l1Amount },
          },
        }),
      );
    }

    if (l2Wallet && l2Amount && l2Amount.gt(0)) {
      writes.push(
        prisma.referralEarning.create({
          data: {
            referrerWallet: l2Wallet,
            refereeWallet: completion.userWallet,
            completionId,
            level: 2,
            rateBps: REFERRAL_L2_RATE_BPS,
            amountUsdc: l2Amount,
          },
        }),
        prisma.user.update({
          where: { walletAddress: l2Wallet },
          data: {
            pendingBalanceUsdc: { increment: l2Amount },
            totalEarnedUsdc: { increment: l2Amount },
          },
        }),
      );
    }

    await prisma.$transaction(writes);
    return 'PROMOTED';
  }

  // FAIL or INVALID → free the reserved slot AND refund the campaign budget
  // so another user can claim. Mirrors attemptCompletion's reservation.
  await prisma.$transaction([
    prisma.questCompletion.update({
      where: { id: completionId },
      data: {
        status: 'FAILED',
        failureReason: result.errorMessage ?? `recheck_${result.outcome.toLowerCase()}`,
      },
    }),
    prisma.quest.update({
      where: { id: completion.questId },
      data: { completionsCount: { decrement: 1 } },
    }),
    prisma.$executeRaw(Prisma.sql`
      UPDATE campaigns SET spent_usdc = spent_usdc - ${completion.rewardUsdc}
      WHERE id = ${completion.quest.campaignId}::uuid
    `),
  ]);
  return 'FAILED';
}
