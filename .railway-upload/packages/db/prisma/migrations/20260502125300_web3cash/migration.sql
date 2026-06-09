-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('CPA', 'CPI', 'CPC', 'CPL', 'CPM');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "clicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "impressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "installs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pricing_model" "PricingModel" NOT NULL DEFAULT 'CPA';
