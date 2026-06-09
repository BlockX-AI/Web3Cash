import { prisma } from '@web3cash/db';
import { crypto as oauthCrypto } from '@web3cash/oauth';
import type { QuestVerifier, VerifyInput, VerifyResult } from './types.js';

/**
 * GitHub quest verifier.
 *
 * Supports:
 *   - GITHUB_STAR: requirements { owner: string, repo: string }
 *
 * Strategy: GET /user/starred/:owner/:repo with the user's OAuth token.
 *   - 204 → PASS (user has starred the repo)
 *   - 404 → FAIL (not starred, or repo doesn't exist)
 *   - other → RETRY
 */

async function getAccessToken(userWallet: string): Promise<string | null> {
  const identity = await prisma.socialIdentity.findUnique({
    where: {
      one_account_per_platform_per_wallet: {
        userWallet: userWallet.toLowerCase(),
        platform: 'GITHUB',
      },
    },
  });
  if (!identity?.accessToken) return null;
  return oauthCrypto.decrypt(identity.accessToken);
}

class GithubVerifier implements QuestVerifier {
  readonly supports = ['GITHUB_STAR'] as const satisfies readonly ['GITHUB_STAR'];

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const start = Date.now();
    const owner = input.requirements.owner;
    const repo = input.requirements.repo;
    if (typeof owner !== 'string' || typeof repo !== 'string') {
      return {
        outcome: 'INVALID',
        latencyMs: Date.now() - start,
        payload: { reason: 'missing_owner_or_repo' },
      };
    }

    const token = await getAccessToken(input.userWallet);
    if (!token) {
      return {
        outcome: 'FAIL',
        latencyMs: Date.now() - start,
        payload: { reason: 'no_github_link' },
      };
    }

    try {
      const res = await fetch(
        `https://api.github.com/user/starred/${encodeURIComponent(
          owner,
        )}/${encodeURIComponent(repo)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'web3cash',
            Accept: 'application/vnd.github+json',
          },
        },
      );
      if (res.status === 204) {
        return {
          outcome: 'PASS',
          latencyMs: Date.now() - start,
          payload: { owner, repo, starred: true },
        };
      }
      if (res.status === 404) {
        return {
          outcome: 'FAIL',
          latencyMs: Date.now() - start,
          payload: { owner, repo, starred: false },
        };
      }
      throw new Error(`github_starred_${res.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /_5\d\d$/.test(msg);
      return {
        outcome: retryable ? 'RETRY' : 'FAIL',
        latencyMs: Date.now() - start,
        payload: { owner, repo, error: msg },
        errorMessage: msg,
      };
    }
  }
}

export const githubVerifier = new GithubVerifier();
