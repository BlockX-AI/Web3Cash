/**
 * Seed script — populates a local DB with sample APPROVED projects, ACTIVE
 * campaigns, and live quests so you can exercise the full flow end-to-end
 * without a real partner.
 *
 * Idempotent: safe to re-run. Uses fixed UUIDs so re-seeding updates rather
 * than duplicating. `spentUsdc` is intentionally NOT reset so live state is
 * preserved across re-seeds.
 *
 * Usage: pnpm db:seed
 */
import { prisma } from './index.js';

interface QuestSeed {
  id: string;
  type: 'TWITTER_FOLLOW' | 'DISCORD_JOIN' | 'GITHUB_STAR' | 'ON_CHAIN_DEPOSIT' | 'INSTALL' | 'VISIT' | 'VIDEO';
  title: string;
  description: string;
  rewardUsdc: string;
  maxCompletions: number;
  minSybilScore: number;
  requirements: Record<string, unknown>;
}

interface CampaignSeed {
  id: string;
  name: string;
  budgetUsdc: string;
  pricingModel?: 'CPA' | 'CPI' | 'CPC' | 'CPL' | 'CPM';
  impressions?: number;
  clicks?: number;
  installs?: number;
  leads?: number;
  chainId: number;
  quests: QuestSeed[];
}

interface ProjectSeed {
  walletAddress: string;
  name: string;
  website: string;
  twitterHandle: string;
  verifiedBadge: boolean;
  campaigns: CampaignSeed[];
}

const SEPOLIA = 11155111;

const SEEDS: ProjectSeed[] = [
  {
    walletAddress: '0x000000000000000000000000000000000000dead',
    name: 'Web3Cash',
    website: 'https://web3cash.app',
    twitterHandle: 'web3cash',
    verifiedBadge: true,
    campaigns: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Web3Cash MVP Launch',
        budgetUsdc: '20.000000',
        pricingModel: 'CPA',
        impressions: 0,
        clicks: 0,
        chainId: SEPOLIA,
        quests: [
          {
            id: '00000000-0000-0000-0000-000000000010',
            type: 'DISCORD_JOIN',
            title: 'Join Web3Cash Discord Server',
            description: 'Join our Discord community to earn $1 USDC. Click claim after joining https://discord.gg/nehCzjPh',
            rewardUsdc: '1.000000',
            maxCompletions: 10,
            minSybilScore: 0,
            requirements: { guildId: '1500455233187352707', inviteUrl: 'https://discord.gg/nehCzjPh' },
          },
          {
            id: '00000000-0000-0000-0000-000000000011',
            type: 'GITHUB_STAR',
            title: 'Star Web3Cash on GitHub',
            description: 'Star our GitHub repo BlockX-AI/Web3Cash to earn $1 USDC. Instant payout on-chain.',
            rewardUsdc: '1.000000',
            maxCompletions: 10,
            minSybilScore: 0,
            requirements: { owner: 'BlockX-AI', repo: 'Web3Cash' },
          },
        ],
      },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding Web3Cash dev database...');

  for (const p of SEEDS) {
    const project = await prisma.project.upsert({
      where: { walletAddress: p.walletAddress },
      update: {
        name: p.name,
        website: p.website,
        twitterHandle: p.twitterHandle,
        verifiedBadge: p.verifiedBadge,
        status: 'APPROVED',
      },
      create: {
        name: p.name,
        walletAddress: p.walletAddress,
        website: p.website,
        twitterHandle: p.twitterHandle,
        verifiedBadge: p.verifiedBadge,
        status: 'APPROVED',
      },
    });

    for (const c of p.campaigns) {
      const campaign = await prisma.campaign.upsert({
        where: { id: c.id },
        update: {
          // Don't clobber spentUsdc — it's live ledger state.
          name: c.name,
          budgetUsdc: c.budgetUsdc,
          status: 'ACTIVE',
          chainId: c.chainId,
        },
        create: {
          id: c.id,
          projectId: project.id,
          name: c.name,
          budgetUsdc: c.budgetUsdc,
          spentUsdc: '0',
          status: 'ACTIVE',
          chainId: c.chainId,
        },
      });

      for (const q of c.quests) {
        await prisma.quest.upsert({
          where: { id: q.id },
          update: {
            // Don't clobber completionsCount — it's live ledger state.
            type: q.type,
            title: q.title,
            description: q.description,
            rewardUsdc: q.rewardUsdc,
            maxCompletions: q.maxCompletions,
            minSybilScore: q.minSybilScore,
            requirements: q.requirements as any,
            active: true,
          },
          create: {
            id: q.id,
            campaignId: campaign.id,
            type: q.type,
            title: q.title,
            description: q.description,
            rewardUsdc: q.rewardUsdc,
            maxCompletions: q.maxCompletions,
            minSybilScore: q.minSybilScore,
            requirements: q.requirements as any,
            active: true,
          },
        });
      }

      console.log(
        `  ✓ ${p.name} / ${c.name} (${c.quests.length} quest${c.quests.length === 1 ? '' : 's'})`,
      );
    }
  }

  // Deactivate any previously seeded quests that are no longer in the seed.
  const seededQuestIds = SEEDS.flatMap((p) =>
    p.campaigns.flatMap((c) => c.quests.map((q) => q.id)),
  );
  const seededCampaignIds = SEEDS.flatMap((p) => p.campaigns.map((c) => c.id));

  const deactivatedQuests = await prisma.quest.updateMany({
    where: { id: { notIn: seededQuestIds }, active: true },
    data: { active: false },
  });
  const endedCampaigns = await prisma.campaign.updateMany({
    where: { id: { notIn: seededCampaignIds }, status: 'ACTIVE' },
    data: { status: 'ENDED' },
  });

  if (deactivatedQuests.count > 0 || endedCampaigns.count > 0) {
    console.log(
      `  ↳ deactivated ${deactivatedQuests.count} obsolete quest(s), ended ${endedCampaigns.count} obsolete campaign(s)`,
    );
  }

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
