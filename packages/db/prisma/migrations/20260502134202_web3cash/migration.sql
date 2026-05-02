/*
  Warnings:

  - A unique constraint covering the columns `[kyc_inquiry_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "kyc_inquiry_id" VARCHAR(64),
ADD COLUMN     "sybil_signals" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "users_kyc_inquiry_id_key" ON "users"("kyc_inquiry_id");
