import { prisma } from '@web3cash/db';
import { normalizeAddress } from '@web3cash/shared';
import type { ChainAnalyticsAdapter, SybilScoreResult, SybilSignals } from './types.js';

/**
 * Phase 5 Sybil scorer — 8 signals normalized to a 0–100 scale:
 *
 *   On-chain (max 70 pts):
 *     - Wallet age          (max 15 pts):  15 at >=365 days
 *     - Tx count            (max 15 pts):  15 at >=100 txs
 *     - Native balance      (max 10 pts):  10 at >=0.05 ETH equivalent
 *     - Token diversity     (max 10 pts):  10 at >=10 unique ERC-20s
 *     - NFT count           (max 5  pts):  5  at >=3 NFTs
 *     - Contracts touched   (max 15 pts):  15 at >=20 unique contracts
 *
 *   Off-chain (max 30 pts):
 *     - Social links        (max 15 pts):  5 pts per linked platform (twitter/discord/github)
 *     - KYC verified        (max 15 pts):  15 if KycStatus == VERIFIED
 *
 * The breakdown is preserved so frontends can show "you'd gain +5 pts by
 * linking GitHub" hints.
 */
const WEIGHTS = {
  walletAgeDays: { cap: 15, target: 365 },
  txCount: { cap: 15, target: 100 },
  nativeBalanceEth: { cap: 10, target: 0.05 },
  tokenDiversity: { cap: 10, target: 10 },
  nftCount: { cap: 5, target: 3 },
  contractsInteracted: { cap: 15, target: 20 },
  socialLinks: { cap: 15, target: 3 },
  kycVerified: { cap: 15, target: 1 },
} as const;

function award(value: number, key: keyof typeof WEIGHTS): number {
  const { cap, target } = WEIGHTS[key];
  if (value <= 0) return 0;
  return Math.min(cap, Math.floor((value / target) * cap));
}

export async function computeSybilScore(
  walletAddress: string,
  chainId: number,
  adapter: ChainAnalyticsAdapter,
): Promise<SybilScoreResult> {
  const wallet = normalizeAddress(walletAddress);

  const [
    ageResult,
    txCount,
    nativeWei,
    tokenDiversity,
    nftCount,
    contractsInteracted,
    user,
  ] = await Promise.all([
    adapter.getWalletAge(wallet, chainId).catch(() => null),
    adapter.getTransactionCount(wallet, chainId).catch(() => 0),
    adapter.getNativeBalanceWei(wallet, chainId).catch(() => '0'),
    adapter.getTokenDiversity(wallet, chainId).catch(() => 0),
    adapter.getNftCount(wallet, chainId).catch(() => 0),
    adapter.getContractsInteracted(wallet, chainId).catch(() => 0),
    prisma.user.findUnique({
      where: { walletAddress: wallet },
      include: { socialIdentities: { select: { platform: true } } },
    }),
  ]);

  const walletAgeDays = ageResult?.ageDays ?? 0;
  // 1 ETH = 1e18 wei. We convert with a divisor that fits Number precision.
  const nativeBalanceEth = Number(BigInt(nativeWei || '0') / BigInt(1e12)) / 1e6;
  const socialLinks = user?.socialIdentities.length ?? 0;
  const kycVerified = user?.kycStatus === 'VERIFIED' ? 1 : 0;

  const signals: SybilSignals = {
    walletAgeDays,
    txCount,
    nativeBalanceEth,
    tokenDiversity,
    nftCount,
    contractsInteracted,
    socialLinks,
    kycVerified,
  };

  const breakdown: Record<keyof SybilSignals, number> = {
    walletAgeDays: award(walletAgeDays, 'walletAgeDays'),
    txCount: award(txCount, 'txCount'),
    nativeBalanceEth: award(nativeBalanceEth, 'nativeBalanceEth'),
    tokenDiversity: award(tokenDiversity, 'tokenDiversity'),
    nftCount: award(nftCount, 'nftCount'),
    contractsInteracted: award(contractsInteracted, 'contractsInteracted'),
    socialLinks: award(socialLinks, 'socialLinks'),
    kycVerified: award(kycVerified, 'kycVerified'),
  };

  const score = Math.min(
    100,
    Object.values(breakdown).reduce((sum, v) => sum + v, 0),
  );

  const computedAt = new Date();

  await prisma.user.updateMany({
    where: { walletAddress: wallet },
    data: {
      sybilScore: score,
      sybilComputedAt: computedAt,
      sybilSignals: { signals, breakdown } as object,
    },
  });

  return { score, signals, breakdown, computedAt };
}
