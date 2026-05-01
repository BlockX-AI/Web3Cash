/**
 * Seed script — populates a local DB with a sample project, campaign, and quest
 * so you can exercise the wallet-connect flow end-to-end without a real partner.
 *
 * Usage: pnpm db:seed
 */
import { prisma } from './index.js';

async function main() {
  console.log('🌱 Seeding Web3Cash dev database...');

  const project = await prisma.project.upsert({
    where: { walletAddress: '0x000000000000000000000000000000000000dead' },
    update: {},
    create: {
      name: 'Demo Project',
      walletAddress: '0x000000000000000000000000000000000000dead',
      website: 'https://example.com',
      twitterHandle: 'web3cash',
      status: 'APPROVED',
      verifiedBadge: true,
    },
  });

  const campaign = await prisma.campaign.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      projectId: project.id,
      name: 'Demo Campaign — Twitter follow',
      budgetUsdc: '500.000000',
      spentUsdc: '0',
      status: 'FUNDED',
      chainId: 1,
    },
  });

  await prisma.quest.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      campaignId: campaign.id,
      type: 'TWITTER_FOLLOW',
      title: 'Follow @web3cash on Twitter',
      description: 'Follow our official account and earn $1 USDC.',
      rewardUsdc: '1.000000',
      maxCompletions: 500,
      minSybilScore: 0, // permissive for local dev
      requirements: { twitterHandle: 'web3cash', targetUserId: '0' },
    },
  });

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
