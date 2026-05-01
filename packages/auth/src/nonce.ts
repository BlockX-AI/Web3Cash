import { randomBytes } from 'node:crypto';
import { prisma } from '@web3cash/db';
import { SIWE_NONCE_TTL_SECONDS } from '@web3cash/shared';

/**
 * Generate a fresh single-use nonce, persist it with a TTL, and return it.
 * The frontend embeds this in the SIWE message; verifyAndConsumeNonce()
 * marks it consumed so the same signature cannot replay.
 */
export async function issueNonce(): Promise<string> {
  const nonce = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + SIWE_NONCE_TTL_SECONDS * 1000);
  await prisma.siweNonce.create({
    data: { nonce, expiresAt },
  });
  return nonce;
}

/**
 * Atomically verify a nonce is unused + unexpired and consume it.
 * Throws if invalid. Caller MUST treat throw as auth failure.
 */
export async function verifyAndConsumeNonce(nonce: string): Promise<void> {
  const result = await prisma.siweNonce.updateMany({
    where: {
      nonce,
      consumed: false,
      expiresAt: { gt: new Date() },
    },
    data: { consumed: true },
  });
  if (result.count !== 1) {
    throw new Error('Invalid or expired nonce');
  }
}
