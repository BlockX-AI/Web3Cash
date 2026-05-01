import { prisma, type SocialPlatform } from '@web3cash/db';
import { OAUTH_STATE_TTL_SECONDS } from '@web3cash/shared';
import { randomUrlSafe } from './crypto.js';

export interface OAuthStateInput {
  platform: SocialPlatform;
  userWallet: string;
  codeVerifier: string;
  returnTo?: string;
}

/** Generates and persists a single-use OAuth state row. Returns the opaque token. */
export async function issueState(input: OAuthStateInput): Promise<string> {
  const state = randomUrlSafe(24);
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_SECONDS * 1000);
  await prisma.oauthState.create({
    data: {
      state,
      platform: input.platform,
      userWallet: input.userWallet.toLowerCase(),
      codeVerifier: input.codeVerifier,
      returnTo: input.returnTo ?? null,
      expiresAt,
    },
  });
  return state;
}

/**
 * Atomically consumes a state row. Returns null if missing or expired.
 * The row is deleted regardless of expiry so it cannot be replayed.
 */
export async function consumeState(state: string) {
  const row = await prisma.oauthState.findUnique({ where: { state } });
  if (!row) return null;
  await prisma.oauthState.delete({ where: { state } }).catch(() => undefined);
  if (row.expiresAt < new Date()) return null;
  return row;
}
