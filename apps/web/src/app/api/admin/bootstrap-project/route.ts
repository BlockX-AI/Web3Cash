/**
 * Admin endpoint to create a Project for the current user
 */
import { NextResponse } from 'next/server';
import { prisma } from '@web3cash/db';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // Check if project already exists
    const existing = await prisma.project.findUnique({
      where: { walletAddress: wallet },
    });

    if (existing) {
      return NextResponse.json({
        ok: true,
        project: existing,
        message: 'Project already exists',
      });
    }

    // Create new project
    const project = await prisma.project.create({
      data: {
        walletAddress: wallet,
        name: 'My Project',
        status: 'APPROVED',
      },
    });

    return NextResponse.json({
      ok: true,
      project,
      message: 'Project created and approved',
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
