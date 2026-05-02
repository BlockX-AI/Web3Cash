-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TWITTER', 'DISCORD', 'GITHUB', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('FREE', 'SPARK', 'PRO', 'ELITE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'FUNDED', 'ACTIVE', 'PAUSED', 'ENDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('TWITTER_FOLLOW', 'DISCORD_JOIN', 'GITHUB_STAR', 'ON_CHAIN_DEPOSIT', 'INSTALL', 'VISIT', 'VIDEO');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('PENDING', 'VERIFIED', 'HOLDING', 'FAILED', 'CANCELLED', 'PAID');

-- CreateEnum
CREATE TYPE "PayoutProvider" AS ENUM ('GNOSIS_SAFE', 'CIRCLE_API', 'ESCROW_CONTRACT');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('QUEUED', 'SUBMITTED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReferralEarningStatus" AS ENUM ('CREDITED', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "AdminTargetType" AS ENUM ('PROJECT', 'COMPLETION', 'PAYOUT', 'USER', 'CAMPAIGN');

-- CreateTable
CREATE TABLE "users" (
    "wallet_address" VARCHAR(42) NOT NULL,
    "chain_id" INTEGER NOT NULL DEFAULT 1,
    "sybil_score" INTEGER NOT NULL DEFAULT 0,
    "sybil_computed_at" TIMESTAMP(3),
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'NONE',
    "tier" "UserTier" NOT NULL DEFAULT 'FREE',
    "referral_code" VARCHAR(12) NOT NULL,
    "referred_by_wallet" VARCHAR(42),
    "pending_balance_usdc" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "total_earned_usdc" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "email" VARCHAR(255),
    "telegram_chat_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("wallet_address")
);

-- CreateTable
CREATE TABLE "social_identities" (
    "id" UUID NOT NULL,
    "user_wallet" VARCHAR(42) NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platform_id" VARCHAR(255) NOT NULL,
    "platform_handle" VARCHAR(255),
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "on_chain_bound" BOOLEAN NOT NULL DEFAULT false,
    "registry_tx_hash" VARCHAR(66),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "wallet_address" VARCHAR(42) NOT NULL,
    "website" TEXT,
    "twitter_handle" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING',
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'NONE',
    "verified_badge" BOOLEAN NOT NULL DEFAULT false,
    "total_spent_usdc" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "contact_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "budget_usdc" DECIMAL(18,6) NOT NULL,
    "spent_usdc" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "chain_id" INTEGER NOT NULL DEFAULT 1,
    "escrow_address" VARCHAR(42),
    "escrow_tx_hash" VARCHAR(66),
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "type" "QuestType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "reward_usdc" DECIMAL(18,6) NOT NULL,
    "max_completions" INTEGER NOT NULL,
    "completions_count" INTEGER NOT NULL DEFAULT 0,
    "min_sybil_score" INTEGER NOT NULL DEFAULT 40,
    "requirements" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_completions" (
    "id" UUID NOT NULL,
    "quest_id" UUID NOT NULL,
    "user_wallet" VARCHAR(42) NOT NULL,
    "status" "CompletionStatus" NOT NULL DEFAULT 'PENDING',
    "reward_usdc" DECIMAL(18,6) NOT NULL,
    "evidence_tx_hash" VARCHAR(66),
    "evidence_payload" JSONB,
    "fraud_flags" JSONB NOT NULL DEFAULT '[]',
    "failure_reason" TEXT,
    "verified_at" TIMESTAMP(3),
    "release_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quest_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "completion_id" UUID,
    "user_wallet" VARCHAR(42) NOT NULL,
    "amount_usdc" DECIMAL(18,6) NOT NULL,
    "provider" "PayoutProvider" NOT NULL DEFAULT 'GNOSIS_SAFE',
    "status" "PayoutStatus" NOT NULL DEFAULT 'QUEUED',
    "chain_id" INTEGER NOT NULL DEFAULT 1,
    "tx_hash" VARCHAR(66),
    "line_items" JSONB NOT NULL DEFAULT '[]',
    "provider_ref" VARCHAR(128),
    "nonce" BIGINT,
    "failure_reason" TEXT,
    "submitted_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_events" (
    "id" UUID NOT NULL,
    "payout_id" UUID NOT NULL,
    "from_status" VARCHAR(32),
    "to_status" VARCHAR(32) NOT NULL,
    "actor" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_wallet" VARCHAR(42) NOT NULL,
    "referee_wallet" VARCHAR(42) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_earnings" (
    "id" UUID NOT NULL,
    "referrer_wallet" VARCHAR(42) NOT NULL,
    "referee_wallet" VARCHAR(42) NOT NULL,
    "completion_id" UUID NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "rate_bps" INTEGER NOT NULL,
    "amount_usdc" DECIMAL(18,6) NOT NULL,
    "status" "ReferralEarningStatus" NOT NULL DEFAULT 'CREDITED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "referral_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_events" (
    "id" UUID NOT NULL,
    "completion_id" UUID,
    "user_wallet" VARCHAR(42),
    "worker_name" VARCHAR(64) NOT NULL,
    "outcome" VARCHAR(32) NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_reviews" (
    "id" UUID NOT NULL,
    "admin_wallet" VARCHAR(42) NOT NULL,
    "target_type" "AdminTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "decision" VARCHAR(32) NOT NULL,
    "rationale" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siwe_nonces" (
    "nonce" VARCHAR(64) NOT NULL,
    "wallet_address" VARCHAR(42),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "siwe_nonces_pkey" PRIMARY KEY ("nonce")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" VARCHAR(128) NOT NULL,
    "endpoint" VARCHAR(128) NOT NULL,
    "response_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "oauth_states" (
    "state" VARCHAR(64) NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "user_wallet" VARCHAR(42) NOT NULL,
    "code_verifier" VARCHAR(128) NOT NULL,
    "return_to" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("state")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_referred_by_wallet_idx" ON "users"("referred_by_wallet");

-- CreateIndex
CREATE INDEX "social_identities_user_wallet_idx" ON "social_identities"("user_wallet");

-- CreateIndex
CREATE UNIQUE INDEX "social_identities_platform_platform_id_key" ON "social_identities"("platform", "platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_identities_user_wallet_platform_key" ON "social_identities"("user_wallet", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "projects_wallet_address_key" ON "projects"("wallet_address");

-- CreateIndex
CREATE INDEX "campaigns_project_id_idx" ON "campaigns"("project_id");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "quests_campaign_id_idx" ON "quests"("campaign_id");

-- CreateIndex
CREATE INDEX "quests_type_active_idx" ON "quests"("type", "active");

-- CreateIndex
CREATE UNIQUE INDEX "quest_completions_evidence_tx_hash_key" ON "quest_completions"("evidence_tx_hash");

-- CreateIndex
CREATE INDEX "quest_completions_user_wallet_idx" ON "quest_completions"("user_wallet");

-- CreateIndex
CREATE INDEX "quest_completions_status_idx" ON "quest_completions"("status");

-- CreateIndex
CREATE INDEX "quest_completions_release_at_idx" ON "quest_completions"("release_at");

-- CreateIndex
CREATE UNIQUE INDEX "quest_completions_quest_id_user_wallet_key" ON "quest_completions"("quest_id", "user_wallet");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_completion_id_key" ON "payouts"("completion_id");

-- CreateIndex
CREATE INDEX "payouts_user_wallet_idx" ON "payouts"("user_wallet");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "payouts_provider_status_idx" ON "payouts"("provider", "status");

-- CreateIndex
CREATE INDEX "payout_events_payout_id_idx" ON "payout_events"("payout_id");

-- CreateIndex
CREATE INDEX "payout_events_created_at_idx" ON "payout_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referee_wallet_key" ON "referrals"("referee_wallet");

-- CreateIndex
CREATE INDEX "referrals_referrer_wallet_idx" ON "referrals"("referrer_wallet");

-- CreateIndex
CREATE UNIQUE INDEX "referral_earnings_completion_id_key" ON "referral_earnings"("completion_id");

-- CreateIndex
CREATE INDEX "referral_earnings_referrer_wallet_status_idx" ON "referral_earnings"("referrer_wallet", "status");

-- CreateIndex
CREATE INDEX "referral_earnings_referee_wallet_idx" ON "referral_earnings"("referee_wallet");

-- CreateIndex
CREATE INDEX "verification_events_completion_id_idx" ON "verification_events"("completion_id");

-- CreateIndex
CREATE INDEX "verification_events_user_wallet_idx" ON "verification_events"("user_wallet");

-- CreateIndex
CREATE INDEX "verification_events_created_at_idx" ON "verification_events"("created_at");

-- CreateIndex
CREATE INDEX "admin_reviews_target_type_target_id_idx" ON "admin_reviews"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "admin_reviews_admin_wallet_idx" ON "admin_reviews"("admin_wallet");

-- CreateIndex
CREATE INDEX "siwe_nonces_expires_at_idx" ON "siwe_nonces"("expires_at");

-- CreateIndex
CREATE INDEX "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");

-- CreateIndex
CREATE INDEX "oauth_states_expires_at_idx" ON "oauth_states"("expires_at");

-- AddForeignKey
ALTER TABLE "social_identities" ADD CONSTRAINT "social_identities_user_wallet_fkey" FOREIGN KEY ("user_wallet") REFERENCES "users"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_user_wallet_fkey" FOREIGN KEY ("user_wallet") REFERENCES "users"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_wallet_fkey" FOREIGN KEY ("user_wallet") REFERENCES "users"("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_completion_id_fkey" FOREIGN KEY ("completion_id") REFERENCES "quest_completions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_events" ADD CONSTRAINT "payout_events_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_wallet_fkey" FOREIGN KEY ("referrer_wallet") REFERENCES "users"("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_wallet_fkey" FOREIGN KEY ("referee_wallet") REFERENCES "users"("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_referrer_wallet_fkey" FOREIGN KEY ("referrer_wallet") REFERENCES "users"("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE;

