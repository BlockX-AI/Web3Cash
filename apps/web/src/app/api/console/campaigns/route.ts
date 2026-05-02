import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@web3cash/auth/project-auth';
import { prisma } from '@web3cash/db';
import { Decimal } from 'decimal.js';

export async function POST(request: Request) {
  try {
    const session = await requireProjectAuth();
    const body = await request.json();

    const { name, budgetUsdc, chainId, startsAt, endsAt } = body;

    if (!name || !budgetUsdc) {
      return NextResponse.json(
        { error: 'Name and budget are required' },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        projectId: session.projectId,
        name,
        budgetUsdc: new Decimal(budgetUsdc),
        chainId: parseInt(chainId) || 1,
        status: 'DRAFT',
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await requireProjectAuth();

    const campaigns = await prisma.campaign.findMany({
      where: { projectId: session.projectId },
      include: {
        quests: {
          select: {
            id: true,
            title: true,
            type: true,
            completionsCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
