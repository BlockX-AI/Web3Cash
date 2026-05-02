import { NextResponse } from 'next/server';
import { prisma } from '@web3cash/db';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * Lists ACTIVE quests from ACTIVE campaigns that still have budget.
 * If the caller is authenticated, also returns their completion status per quest.
 */
export async function GET() {
  const wallet = await getSessionWallet();

  const quests = await prisma.quest.findMany({
    where: {
      active: true,
      campaign: { status: 'ACTIVE' },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          projectId: true,
          budgetUsdc: true,
          spentUsdc: true,
          project: { select: { name: true, verifiedBadge: true } },
        },
      },
    },
  });

  let completionsByQuest = new Map<string, { status: string; releaseAt: Date | null }>();
  if (wallet) {
    const completions = await prisma.questCompletion.findMany({
      where: { userWallet: wallet, questId: { in: quests.map((q) => q.id) } },
      select: { questId: true, status: true, releaseAt: true },
    });
    completionsByQuest = new Map(
      completions.map((c) => [c.questId, { status: c.status, releaseAt: c.releaseAt }]),
    );
  }

  return NextResponse.json({
    quests: quests.map((q) => {
      const remaining = q.campaign.budgetUsdc.minus(q.campaign.spentUsdc);
      return {
        id: q.id,
        type: q.type,
        title: q.title,
        description: q.description,
        rewardUsdc: q.rewardUsdc.toString(),
        minSybilScore: q.minSybilScore,
        slotsRemaining: Math.max(0, q.maxCompletions - q.completionsCount),
        maxCompletions: q.maxCompletions,
        requirements: q.requirements,
        campaign: {
          id: q.campaign.id,
          name: q.campaign.name,
          projectId: q.campaign.projectId,
          budgetUsdc: q.campaign.budgetUsdc.toString(),
          spentUsdc: q.campaign.spentUsdc.toString(),
          remainingUsdc: remaining.toString(),
          project: q.campaign.project,
        },
        userCompletion: completionsByQuest.get(q.id) ?? null,
      };
    }),
  });
}
