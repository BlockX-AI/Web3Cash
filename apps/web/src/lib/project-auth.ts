import { cookies } from 'next/headers';
import { verifySession } from '@web3cash/auth';
import { prisma } from '@web3cash/db';

export interface ProjectSession {
  projectId: string;
  walletAddress: string;
}

/**
 * Returns the authenticated project session, or null if the caller is not a project.
 * A "project" is any user who has a corresponding Project row with status APPROVED
 * keyed by walletAddress.
 */
export async function getProjectSession(): Promise<ProjectSession | null> {
  const token = cookies().get('w3c_session')?.value;
  if (!token) return null;

  const claims = await verifySession(token);
  if (!claims) return null;

  // Auto-provision: any wallet-authenticated user can create campaigns.
  // Projects are upserted on first access (approved by default for MVP).
  const project = await prisma.project.upsert({
    where: { walletAddress: claims.sub },
    update: {},
    create: {
      walletAddress: claims.sub,
      name: `Project ${claims.sub.slice(0, 6)}…${claims.sub.slice(-4)}`,
      status: 'APPROVED',
    },
    select: {
      id: true,
      walletAddress: true,
      status: true,
    },
  });

  if (project.status === 'REJECTED' || project.status === 'SUSPENDED') return null;

  return {
    projectId: project.id,
    walletAddress: project.walletAddress,
  };
}

export async function requireProjectAuth(): Promise<ProjectSession> {
  const session = await getProjectSession();
  if (!session) {
    throw new Error('Unauthorized: wallet sign-in required');
  }
  return session;
}
