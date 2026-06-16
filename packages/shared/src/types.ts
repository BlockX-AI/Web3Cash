/**
 * Shared TS types. These mirror the Prisma enums so consumers
 * (frontend, worker) don't need to import @prisma/client directly.
 */

export type SocialPlatform = 'TWITTER' | 'DISCORD' | 'GITHUB' | 'TELEGRAM';

export type KycStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export type UserTier = 'FREE' | 'SPARK' | 'PRO' | 'ELITE';

export type ProjectStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type CampaignStatus = 'DRAFT' | 'FUNDED' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'REFUNDED';

export type QuestType =
  | 'TWITTER_FOLLOW'
  | 'DISCORD_JOIN'
  | 'GITHUB_STAR'
  | 'ON_CHAIN_DEPOSIT'
  | 'WALLET_CONNECT'
  | 'TELEGRAM_JOIN'
  | 'INSTALL'
  | 'VISIT'
  | 'VIDEO';

export type CompletionStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'HOLDING'
  | 'FAILED'
  | 'CANCELLED'
  | 'PAID';

export type PayoutProvider = 'GNOSIS_SAFE' | 'CIRCLE_API' | 'ESCROW_CONTRACT';

export type PayoutStatus = 'QUEUED' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

export interface SessionUser {
  walletAddress: string;
  chainId: number;
  sybilScore: number;
  kycStatus: KycStatus;
}
