import { prisma } from '@web3cash/db';
import { normalizeAddress } from '@web3cash/shared';
import type { ChainAnalyticsAdapter, SybilScoreResult } from './types.js';

/**
 * Phase 1 Sybil scorer — 2 signals only:
 *   - Wallet age (max 10 pts):   10 pts at >=180 days, linear below
 *   - Tx count   (max 15 pts):   15 pts at >=50 txs,   linear below
 *
 * The score is intentionally additive and bounded so adding signals later
 * (DeFi, gas, Passport, etc. in Phase 5) preserves the same scale.
 */
export async function computeSybilScore(
  walletAddress: string,
  chainId: number,
  adapter: ChainAnalyticsAdapter,
): Promise<SybilScoreResult> {
  const wallet = normalizeAddress(walletAddress);

  const [ageResult, txCount] = await Promise.all([
    adapter.getWalletAge(wallet, chainId),
    adapter.getTransactionCount(wallet, chainId),
  ]);

  const walletAgeDays = ageResult?.ageDays ?? 0;

  const agePoints = Math.min(10, Math.floor((walletAgeDays / 180) * 10));
  const txPoints = Math.min(15, Math.floor((txCount / 50) * 15));
  const score = agePoints + txPoints;

  const computedAt = new Date();

  // Persist on the user record (only if user exists — Sybil can be computed before signup too).
  await prisma.user.updateMany({
    where: { walletAddress: wallet },
    data: { sybilScore: score, sybilComputedAt: computedAt },
  });

  return {
    score,
    signals: { walletAgeDays, txCount },
    computedAt,
  };
}
