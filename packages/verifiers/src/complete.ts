import { Prisma, prisma, type QuestType, type CompletionStatus } from '@web3cash/db';
import {
  SOCIAL_QUEST_HOLD_MS,
  ONCHAIN_QUEST_HOLD_MS,
} from '@web3cash/shared';
import { getVerifier } from './registry.js';

export interface AttemptCompletionInput {
  userWallet: string;
  questId: string;
}

export type AttemptResult =
  | { ok: true; completionId: string; status: CompletionStatus; releaseAt: Date }
  | {
      ok: false;
      code:
        | 'QUEST_NOT_FOUND'
        | 'QUEST_INACTIVE'
        | 'ALREADY_CLAIMED'
        | 'SYBIL_TOO_LOW'
        | 'BUDGET_EXHAUSTED'
        | 'CAMPAIGN_NOT_ACTIVE'
        | 'VERIFY_FAIL'
        | 'VERIFY_INVALID'
        | 'VERIFY_RETRY'
        | 'VERIFIER_MISSING';
      message?: string;
    };

function holdMs(type: QuestType): number {
  switch (type) {
    case 'ON_CHAIN_DEPOSIT':
      return ONCHAIN_QUEST_HOLD_MS;
    default:
      return SOCIAL_QUEST_HOLD_MS;
  }
}

/**
 * Attempt to complete a quest.
 *
 * Flow:
 *   1. Load quest + user. Fast-reject on inactive / already claimed / sybil.
 *   2. Atomically decrement budget: `UPDATE quests SET completions_count = completions_count + 1
 *      WHERE id = $1 AND completions_count < max_completions` — returns affected rows.
 *      This is the Phase 2 "atomic budget exhaustion" primitive.
 *   3. Run the verifier. On FAIL/INVALID → rollback the counter.
 *   4. On PASS → create QuestCompletion with status=HOLDING, release_at=now+holdMs.
 *      A background job re-checks at release_at; if still PASS, promote to VERIFIED and
 *      credit pending balance.
 */
export async function attemptCompletion(
  input: AttemptCompletionInput,
): Promise<AttemptResult> {
  const userWallet = input.userWallet.toLowerCase();
  const quest = await prisma.quest.findUnique({
    where: { id: input.questId },
    include: { campaign: true },
  });
  if (!quest) return { ok: false, code: 'QUEST_NOT_FOUND' };
  if (!quest.active) return { ok: false, code: 'QUEST_INACTIVE' };
  if (quest.campaign.status !== 'ACTIVE')
    return { ok: false, code: 'CAMPAIGN_NOT_ACTIVE' };

  const existing = await prisma.questCompletion.findUnique({
    where: { no_duplicate_claim: { questId: quest.id, userWallet } },
  });
  if (existing) return { ok: false, code: 'ALREADY_CLAIMED' };

  const user = await prisma.user.findUnique({
    where: { walletAddress: userWallet },
  });
  if (!user) return { ok: false, code: 'SYBIL_TOO_LOW' };
  if (user.sybilScore < quest.minSybilScore)
    return { ok: false, code: 'SYBIL_TOO_LOW' };

  // Atomic budget reservation — TWO guards, both must hold:
  //   (a) per-quest slot:  completions_count < max_completions
  //   (b) per-campaign $:  spent_usdc + reward_usdc <= budget_usdc
  // We do (b) first via raw SQL because Prisma can't express
  // "WHERE col1 + $param <= col2". If (b) fails we never touch (a),
  // so there's nothing to roll back.
  const reward = quest.rewardUsdc;
  const campaignReserved = await prisma.$executeRaw(Prisma.sql`
    UPDATE campaigns
    SET spent_usdc = spent_usdc + ${reward}
    WHERE id = ${quest.campaignId}::uuid
      AND spent_usdc + ${reward} <= budget_usdc
  `);
  if (campaignReserved === 0) return { ok: false, code: 'BUDGET_EXHAUSTED' };

  const slotReserved = await prisma.quest.updateMany({
    where: { id: quest.id, completionsCount: { lt: quest.maxCompletions } },
    data: { completionsCount: { increment: 1 } },
  });
  if (slotReserved.count === 0) {
    // Refund the campaign-level reservation if the per-quest slot is full.
    await refundCampaign(quest.campaignId, reward);
    return { ok: false, code: 'BUDGET_EXHAUSTED' };
  }

  const verifier = getVerifier(quest.type);
  if (!verifier) {
    await rollbackReservation(quest.id, quest.campaignId, reward);
    return { ok: false, code: 'VERIFIER_MISSING' };
  }

  const result = await verifier.verify({
    userWallet,
    questType: quest.type,
    requirements: quest.requirements as Record<string, unknown>,
  });

  // Always write an audit row.
  await prisma.verificationEvent.create({
    data: {
      userWallet,
      workerName: `verifier.${quest.type.toLowerCase()}`,
      outcome: result.outcome,
      latencyMs: result.latencyMs,
      payload: result.payload as object,
      errorMessage: result.errorMessage ?? null,
    },
  });

  if (result.outcome !== 'PASS') {
    await rollbackReservation(quest.id, quest.campaignId, reward);
    const codeMap = {
      FAIL: 'VERIFY_FAIL',
      INVALID: 'VERIFY_INVALID',
      RETRY: 'VERIFY_RETRY',
    } as const;
    return {
      ok: false,
      code: codeMap[result.outcome],
      message: result.errorMessage,
    };
  }

  const now = new Date();
  const releaseAt = new Date(now.getTime() + holdMs(quest.type));
  const completion = await prisma.questCompletion.create({
    data: {
      questId: quest.id,
      userWallet,
      status: 'HOLDING',
      rewardUsdc: quest.rewardUsdc,
      verifiedAt: now,
      releaseAt,
      evidencePayload: result.payload as object,
    },
  });

  return { ok: true, completionId: completion.id, status: 'HOLDING', releaseAt };
}

async function rollbackReservation(
  questId: string,
  campaignId: string,
  reward: Prisma.Decimal,
) {
  await prisma.$transaction([
    prisma.quest.update({
      where: { id: questId },
      data: { completionsCount: { decrement: 1 } },
    }),
    prisma.$executeRaw(Prisma.sql`
      UPDATE campaigns SET spent_usdc = spent_usdc - ${reward}
      WHERE id = ${campaignId}::uuid
    `),
  ]);
}

async function refundCampaign(campaignId: string, reward: Prisma.Decimal) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE campaigns SET spent_usdc = spent_usdc - ${reward}
    WHERE id = ${campaignId}::uuid
  `);
}
