import { prisma } from '@web3cash/db';
import { crypto as oauthCrypto } from '@web3cash/oauth';
import type { QuestVerifier, VerifyInput, VerifyResult } from './types.js';

/**
 * Discord quest verifier.
 *
 * Supports:
 *   - DISCORD_JOIN: requirements { guildId: string }
 *
 * Strategy: GET /users/@me/guilds with the user's OAuth token (scope: guilds).
 * If the response includes the targetGuildId → PASS, otherwise FAIL.
 */

async function getAccessToken(userWallet: string): Promise<string | null> {
  const identity = await prisma.socialIdentity.findUnique({
    where: {
      one_account_per_platform_per_wallet: {
        userWallet: userWallet.toLowerCase(),
        platform: 'DISCORD',
      },
    },
  });
  if (!identity?.accessToken) return null;
  return oauthCrypto.decrypt(identity.accessToken);
}

class DiscordVerifier implements QuestVerifier {
  readonly supports = ['DISCORD_JOIN'] as const satisfies readonly ['DISCORD_JOIN'];

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const start = Date.now();
    const guildId = input.requirements.guildId;
    if (typeof guildId !== 'string') {
      return {
        outcome: 'INVALID',
        latencyMs: Date.now() - start,
        payload: { reason: 'missing_guild_id' },
      };
    }

    const token = await getAccessToken(input.userWallet);
    if (!token) {
      return {
        outcome: 'FAIL',
        latencyMs: Date.now() - start,
        payload: { reason: 'no_discord_link' },
      };
    }

    try {
      const res = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 429) throw new Error('RATE_LIMIT');
      if (!res.ok) throw new Error(`discord_guilds_${res.status}`);
      const guilds = (await res.json()) as Array<{ id: string }>;
      const inGuild = guilds.some((g) => g.id === guildId);
      return {
        outcome: inGuild ? 'PASS' : 'FAIL',
        latencyMs: Date.now() - start,
        payload: { guildId, totalGuilds: guilds.length, inGuild },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = msg === 'RATE_LIMIT' || /_5\d\d$/.test(msg);
      return {
        outcome: retryable ? 'RETRY' : 'FAIL',
        latencyMs: Date.now() - start,
        payload: { guildId, error: msg },
        errorMessage: msg,
      };
    }
  }
}

export const discordVerifier = new DiscordVerifier();
