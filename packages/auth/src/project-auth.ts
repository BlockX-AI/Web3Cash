import { cookies } from 'next/headers';
import { prisma } from '@web3cash/db';

export async function getProjectSession(): Promise<{ projectId: string; walletAddress: string } | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('w3c_session')?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: {
      user: {
        select: {
          walletAddress: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const project = await prisma.project.findUnique({
    where: { walletAddress: session.user.walletAddress },
    select: {
      id: true,
      walletAddress: true,
      status: true,
    },
  });

  if (!project || project.status === 'BANNED') {
    return null;
  }

  return {
    projectId: project.id,
    walletAddress: project.walletAddress,
  };
}

export async function requireProjectAuth() {
  const session = await getProjectSession();
  if (!session) {
    throw new Error('Unauthorized: Project authentication required');
  }
  return session;
}
