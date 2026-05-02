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

  const project = await prisma.project.findUnique({
    where: { walletAddress: claims.sub },
    select: {
      id: true,
      walletAddress: true,
      status: true,
    },
  });

  if (!project) return null;
  if (project.status === 'REJECTED' || project.status === 'SUSPENDED') return null;

  return {
    projectId: project.id,
    walletAddress: project.walletAddress,
  };
}

export async function requireProjectAuth(): Promise<ProjectSession> {
  const session = await getProjectSession();
  if (!session) {
    throw new Error('Unauthorized: Project authentication required');
  }
  return session;
}
