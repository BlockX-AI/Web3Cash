import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client. In dev, hot-reload re-imports this file many times,
 * so we cache on globalThis to avoid exhausting Postgres connections.
 */
declare global {
  // eslint-disable-next-line no-var
  var __web3cash_prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__web3cash_prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__web3cash_prisma = prisma;
}

export * from '@prisma/client';
