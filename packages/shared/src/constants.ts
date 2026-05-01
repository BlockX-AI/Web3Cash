/**
 * Platform-wide constants. Change here, never inline.
 */

/** Platform margin (15%). User receives (1 - PLATFORM_MARGIN) of project spend. */
export const PLATFORM_MARGIN = 0.15;

/** Level-1 referral bonus, paid additively from project budget. */
export const REFERRAL_L1_RATE = 0.10;

/** Reserved for Phase 7 — currently unused. */
export const REFERRAL_L2_RATE = 0.03;

/** Hold window before social-quest payouts release (anti-unfollow). */
export const SOCIAL_QUEST_HOLD_MS = 72 * 60 * 60 * 1000;

/** Hold window before on-chain quest payouts release. */
export const ONCHAIN_QUEST_HOLD_MS = 30 * 60 * 1000;

/** Cumulative USDC withdrawal threshold above which KYC is required. */
export const KYC_THRESHOLD_USDC = 500;

/** Default minimum Sybil score required to attempt a quest. */
export const DEFAULT_MIN_SYBIL_SCORE = 40;

/** Sybil score recompute TTL (cache). */
export const SYBIL_SCORE_CACHE_DAYS = 7;

/** SIWE nonce TTL in seconds. */
export const SIWE_NONCE_TTL_SECONDS = 5 * 60;

/** JWT session TTL in seconds. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Max quest completions per wallet per hour (velocity limit). */
export const MAX_COMPLETIONS_PER_HOUR = 5;

/** OAuth state TTL in seconds (PKCE redirect dance must finish in this window). */
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

/** Queue names (single source of truth). */
export const QUEUE_NAMES = {
  COMPUTE_SYBIL_SCORE: 'compute-sybil-score',
  RECHECK_QUEST: 'recheck-quest',
  RELEASE_COMPLETION: 'release-completion',
} as const;
