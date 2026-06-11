/*
  Warnings:

  - The values [TELEGRAM] on the enum `SocialPlatform` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `telegram_chat_id` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SocialPlatform_new" AS ENUM ('TWITTER', 'DISCORD', 'GITHUB');
ALTER TABLE "social_identities" ALTER COLUMN "platform" TYPE "SocialPlatform_new" USING ("platform"::text::"SocialPlatform_new");
ALTER TABLE "oauth_states" ALTER COLUMN "platform" TYPE "SocialPlatform_new" USING ("platform"::text::"SocialPlatform_new");
ALTER TYPE "SocialPlatform" RENAME TO "SocialPlatform_old";
ALTER TYPE "SocialPlatform_new" RENAME TO "SocialPlatform";
DROP TYPE "SocialPlatform_old";
COMMIT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "telegram_chat_id",
ADD COLUMN     "offer18_aff_id" VARCHAR(64),
ADD COLUMN     "offer18_click_id" VARCHAR(128),
ADD COLUMN     "offer18_offer_id" VARCHAR(64);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "wallet_address" VARCHAR(42),
    "email" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_wallet_address_key" ON "waitlist_entries"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");
