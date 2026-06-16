import type { QuestType } from '@web3cash/db';
import type { QuestVerifier } from './types.js';
import { twitterVerifier } from './twitter.js';
import { discordVerifier } from './discord.js';
import { githubVerifier } from './github.js';
import { onChainDepositVerifier } from './onchain.js';
import { walletConnectVerifier } from './wallet-connect.js';
import { telegramVerifier } from './telegram.js';
import { installVerifier, visitVerifier, videoVerifier } from './webhooks.js';

/**
 * Central registry mapping QuestType → verifier.
 */
const registry = new Map<QuestType, QuestVerifier>();

function register(v: QuestVerifier) {
  for (const t of v.supports) {
    if (registry.has(t)) {
      throw new Error(`duplicate verifier for quest type ${t}`);
    }
    registry.set(t, v);
  }
}

register(twitterVerifier);
register(discordVerifier);
register(githubVerifier);
register(onChainDepositVerifier);
register(walletConnectVerifier);
register(telegramVerifier);
register(installVerifier);
register(visitVerifier);
register(videoVerifier);

export function getVerifier(type: QuestType): QuestVerifier | undefined {
  return registry.get(type);
}

export function listSupportedTypes(): QuestType[] {
  return Array.from(registry.keys());
}
