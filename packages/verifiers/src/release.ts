import { prisma } from '@web3cash/db';
import { getVerifier } from './registry.js';

/**
 * Re-verify a HOLDING completion after the hold window elapses.
 * Called by the worker's `recheck-quest` job.
 *
 * - Still PASS       → status=VERIFIED, credit pendingBalanceUsdc.
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
    // Credit pending balance and mark VERIFIED. Actual payout is Phase 3.
    await prisma.$transaction([
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
    ]);
    return 'PROMOTED';
  }

  // FAIL or INVALID → free the reserved slot so another user can claim.
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
  ]);
  return 'FAILED';
}
