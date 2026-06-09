import { prisma } from '@web3cash/db';
import { crypto as oauthCrypto, twitter as twitterOauth } from '@web3cash/oauth';
import type { QuestVerifier, VerifyInput, VerifyResult } from './types.js';

/**
 * Twitter quest verifier.
 *
 * Supports:
 *   - TWITTER_FOLLOW: requirements { targetHandle: string, targetId?: string }
 *
 * Verification strategy:
 *   GET https://api.twitter.com/2/users/:id/following?max_results=1000
 *   Scan paginated results for targetId. If not found after N pages → FAIL.
 *
 * We use the user's own OAuth token (scope: follows.read) — this is required
 * because Twitter's /following endpoint can only be called for the authenticated
 * user since early 2024.
 */

const MAX_PAGES = 10; // ~10k follows; beyond this treat as invalid (Sybil signal).

async function getDecryptedAccessToken(
  userWallet: string,
): Promise<{ token: string; platformId: string; handle: string | null } | null> {
  const identity = await prisma.socialIdentity.findUnique({
    where: {
      one_account_per_platform_per_wallet: {
        userWallet: userWallet.toLowerCase(),
        platform: 'TWITTER',
      },
    },
  });
  if (!identity?.accessToken) return null;

  // Refresh if expired.
  let token = oauthCrypto.decrypt(identity.accessToken);
  if (
    identity.tokenExpiresAt &&
    identity.tokenExpiresAt.getTime() <= Date.now() + 30_000 &&
    identity.refreshToken
  ) {
    try {
      const refresh = oauthCrypto.decrypt(identity.refreshToken);
      const refreshed = await twitterOauth.refreshToken(refresh);
      token = refreshed.access_token;
      await prisma.socialIdentity.update({
        where: {
          one_account_per_platform_per_wallet: {
            userWallet: userWallet.toLowerCase(),
            platform: 'TWITTER',
          },
        },
        data: {
          accessToken: oauthCrypto.encrypt(refreshed.access_token),
          refreshToken: refreshed.refresh_token
            ? oauthCrypto.encrypt(refreshed.refresh_token)
            : identity.refreshToken,
          tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      });
    } catch {
      return null;
    }
  }

  return {
    token,
    platformId: identity.platformId,
    handle: identity.platformHandle,
  };
}

async function resolveTargetId(
  targetHandle: string,
  accessToken: string,
): Promise<string | null> {
  const url = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(
    targetHandle.replace(/^@/, ''),
  )}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { id: string } };
  return json.data?.id ?? null;
}

async function isFollowing(
  userPlatformId: string,
  targetId: string,
  accessToken: string,
): Promise<{ following: boolean; pagesScanned: number }> {
  let paginationToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(
      `https://api.twitter.com/2/users/${userPlatformId}/following`,
    );
    url.searchParams.set('max_results', '1000');
    url.searchParams.set('user.fields', 'id');
    if (paginationToken) url.searchParams.set('pagination_token', paginationToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) throw new Error(`twitter_following_${res.status}`);
    const json = (await res.json()) as {
      data?: Array<{ id: string }>;
      meta?: { next_token?: string };
    };
    if (json.data?.some((u) => u.id === targetId)) {
      return { following: true, pagesScanned: page + 1 };
    }
    paginationToken = json.meta?.next_token;
    if (!paginationToken) break;
  }
  return { following: false, pagesScanned: MAX_PAGES };
}

class TwitterVerifier implements QuestVerifier {
  readonly supports = ['TWITTER_FOLLOW'] as const satisfies readonly ['TWITTER_FOLLOW'];

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const start = Date.now();
    const targetHandle = input.requirements.targetHandle;
    const targetIdHint = input.requirements.targetId;

    if (typeof targetHandle !== 'string') {
      return {
        outcome: 'INVALID',
        latencyMs: Date.now() - start,
        payload: { reason: 'missing_target_handle' },
      };
    }

    const creds = await getDecryptedAccessToken(input.userWallet);
    if (!creds) {
      return {
        outcome: 'FAIL',
        latencyMs: Date.now() - start,
        payload: { reason: 'no_twitter_link' },
      };
    }

    try {
      const targetId =
        typeof targetIdHint === 'string'
          ? targetIdHint
          : await resolveTargetId(targetHandle, creds.token);
      if (!targetId) {
        return {
          outcome: 'INVALID',
          latencyMs: Date.now() - start,
          payload: { reason: 'target_not_found', targetHandle },
        };
      }
      const result = await isFollowing(creds.platformId, targetId, creds.token);
      return {
        outcome: result.following ? 'PASS' : 'FAIL',
        latencyMs: Date.now() - start,
        payload: {
          targetHandle,
          targetId,
          following: result.following,
          pagesScanned: result.pagesScanned,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = msg === 'RATE_LIMIT' || msg.endsWith('_5');
      return {
        outcome: retryable ? 'RETRY' : 'FAIL',
        latencyMs: Date.now() - start,
        payload: { targetHandle, error: msg },
        errorMessage: msg,
      };
    }
  }
}

export const twitterVerifier = new TwitterVerifier();
