import type { QuestType } from '@web3cash/db';
import type { QuestVerifier } from './types.js';
import { twitterVerifier } from './twitter.js';

/**
 * Central registry mapping QuestType → verifier.
 * Phase 5 adds Discord, GitHub, on-chain deposit verifiers here.
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

export function getVerifier(type: QuestType): QuestVerifier | undefined {
  return registry.get(type);
}

export function listSupportedTypes(): QuestType[] {
  return Array.from(registry.keys());
}
