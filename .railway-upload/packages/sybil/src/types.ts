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

  /** Native token balance in wei (as string for safety). */
  getNativeBalanceWei(walletAddress: string, chainId: number): Promise<string>;

  /** Number of unique ERC-20 token contracts ever held. */
  getTokenDiversity(walletAddress: string, chainId: number): Promise<number>;

  /** Number of unique ERC-721 / ERC-1155 contracts owned. */
  getNftCount(walletAddress: string, chainId: number): Promise<number>;

  /** Number of unique smart-contract addresses interacted with (≈ DeFi breadth). */
  getContractsInteracted(walletAddress: string, chainId: number): Promise<number>;
}

export interface SybilSignals {
  /** Age of earliest external tx, in days. */
  walletAgeDays: number;
  /** Total tx nonce. */
  txCount: number;
  /** Native token balance, in ETH (or chain-native units). */
  nativeBalanceEth: number;
  /** Unique ERC-20 contracts ever held. */
  tokenDiversity: number;
  /** Unique NFT contracts owned. */
  nftCount: number;
  /** Unique smart contracts interacted with. */
  contractsInteracted: number;
  /** Linked verified social platforms (max 3: twitter, discord, github). */
  socialLinks: number;
  /** Whether the user has KYC verified (boolean as 0/1 for math). */
  kycVerified: number;
}

export interface SybilScoreResult {
  /** 0–100 normalized score. */
  score: number;
  signals: SybilSignals;
  /** Per-signal contribution to the final score (debug/UI). */
  breakdown: Record<keyof SybilSignals, number>;
  computedAt: Date;
}
