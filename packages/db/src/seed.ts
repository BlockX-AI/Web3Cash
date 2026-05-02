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
        name: 'Launch — Social proof',
        budgetUsdc: '500.000000',
        pricingModel: 'CPA',
        impressions: 1250,
        clicks: 320,
        chainId: SEPOLIA,
        quests: [
          {
            id: '00000000-0000-0000-0000-000000000002',
            type: 'TWITTER_FOLLOW',
            title: 'Follow @web3cash on Twitter',
            description: 'Follow our official account. $1 USDC clears 72h after verification.',
            rewardUsdc: '1.000000',
            maxCompletions: 500,
            minSybilScore: 0,
            requirements: { targetHandle: 'web3cash' },
          },
        ],
      },
    ],
  },
  {
    walletAddress: '0x00000000000000000000000000000000000beef0',
    name: 'Acme DeFi',
    website: 'https://acme.fi',
    twitterHandle: 'acmedefi',
    verifiedBadge: false,
    campaigns: [
      {
        id: '00000000-0000-0000-0000-0000000000a1',
        name: 'Awareness Q3',
        budgetUsdc: '250.000000',
        pricingModel: 'CPC',
        impressions: 5400,
        clicks: 890,
        chainId: SEPOLIA,
        quests: [
          {
            id: '00000000-0000-0000-0000-0000000000a2',
            type: 'TWITTER_FOLLOW',
            title: 'Follow @acmedefi',
            description: 'Stay on top of liquidity launches. $0.50 USDC.',
            rewardUsdc: '0.500000',
            maxCompletions: 400,
            minSybilScore: 20,
            requirements: { targetHandle: 'acmedefi' },
          },
          {
            id: '00000000-0000-0000-0000-0000000000a3',
            type: 'VISIT',
            title: 'Visit acme.fi',
            description: 'Open the docs landing page. $0.25 USDC.',
            rewardUsdc: '0.250000',
            maxCompletions: 1000,
            minSybilScore: 0,
            requirements: { url: 'https://acme.fi' },
          },
        ],
      },
    ],
  },
  {
    walletAddress: '0x00000000000000000000000000000000000beef1',
    name: 'NodeRunners',
    website: 'https://noderunners.xyz',
    twitterHandle: 'noderunners',
    verifiedBadge: true,
    campaigns: [
      {
        id: '00000000-0000-0000-0000-0000000000b1',
        name: 'Validator onboarding',
        budgetUsdc: '1000.000000',
        pricingModel: 'CPL',
        impressions: 2100,
        clicks: 420,
        leads: 85,
        chainId: SEPOLIA,
        quests: [
          {
            id: '00000000-0000-0000-0000-0000000000b2',
            type: 'TWITTER_FOLLOW',
            title: 'Follow @noderunners',
            description: 'Join the validator community. $2 USDC.',
            rewardUsdc: '2.000000',
            maxCompletions: 250,
            minSybilScore: 30,
            requirements: { targetHandle: 'noderunners' },
          },
          {
            id: '00000000-0000-0000-0000-0000000000b3',
            type: 'GITHUB_STAR',
            title: 'Star noderunners/runner-cli on GitHub',
            description: 'Show GitHub support. $1 USDC. (Phase 5 verifier)',
            rewardUsdc: '1.000000',
            maxCompletions: 250,
            minSybilScore: 30,
            requirements: { repo: 'noderunners/runner-cli' },
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
            requirements: q.requirements,
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
            requirements: q.requirements,
            active: true,
          },
        });
      }

      console.log(
        `  ✓ ${p.name} / ${c.name} (${c.quests.length} quest${c.quests.length === 1 ? '' : 's'})`,
      );
    }
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
