import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/project-auth';
import { prisma } from '@web3cash/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireProjectAuth();
    const body = await request.json();

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: params.id,
        projectId: session.projectId,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const {
      type,
      title,
      description,
      rewardUsdc,
      maxCompletions,
      minSybilScore,
      requirements,
    } = body;

    if (!type || !title || !rewardUsdc || !maxCompletions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const quest = await prisma.quest.create({
      data: {
        campaignId: campaign.id,
        type,
        title,
        description,
        rewardUsdc: String(rewardUsdc),
        maxCompletions,
        minSybilScore: minSybilScore || 40,
        requirements: requirements || {},
        active: true,
      },
    });

    return NextResponse.json(quest);
  } catch (error) {
    console.error('Error creating quest:', error);
    return NextResponse.json(
      { error: 'Failed to create quest' },
      { status: 500 }
    );
  }
}
