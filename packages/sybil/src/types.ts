/**
 * Sybil scoring port. The scorer pulls signals via this interface — never
 * directly from Alchemy/Moralis/etc. Phase 5 will add 6 more signals
 * (DeFi interactions, gas spend, token diversity, Gitcoin Passport,
 * social proof, funder clustering) — each just adds a method here.
 */
export interface ChainAnalyticsAdapter {
  /** Returns null if the wallet has no on-chain history. */
  getWalletAge(walletAddress: string, chainId: number): Promise<{ ageDays: number } | null>;

  /** Total external + internal tx count for this wallet. */
  getTransactionCount(walletAddress: string, chainId: number): Promise<number>;
}

export interface SybilSignals {
  walletAgeDays: number;
  txCount: number;
}

export interface SybilScoreResult {
  /** 0–100. Phase 1 max = 25 (10 + 15). Phase 5 will scale to 100. */
  score: number;
  signals: SybilSignals;
  computedAt: Date;
}
