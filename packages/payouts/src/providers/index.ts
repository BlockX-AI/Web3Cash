import type { PayoutProvider as DbPayoutProvider } from '@web3cash/db';
import type { PayoutProviderAdapter } from '../types.js';
import { GnosisSafeProvider } from './gnosis-safe.js';

/**
 * Lazily instantiate a provider — Phase 6 will add `EscrowContractProvider`
 * here. The factory keeps env-loading constructors out of the hot path.
 */
let cached: Partial<Record<DbPayoutProvider, PayoutProviderAdapter>> = {};

export function getProvider(id: DbPayoutProvider): PayoutProviderAdapter {
  if (cached[id]) return cached[id]!;
  switch (id) {
    case 'GNOSIS_SAFE':
      cached[id] = new GnosisSafeProvider();
      return cached[id]!;
    case 'CIRCLE_API':
      throw new Error('CIRCLE_API provider is reserved for future use');
    case 'ESCROW_CONTRACT':
      throw new Error('ESCROW_CONTRACT provider lands in Phase 6');
    default: {
      const _exhaustive: never = id;
      throw new Error(`unknown payout provider: ${String(_exhaustive)}`);
    }
  }
}

/** For tests. */
export function __resetProviderCache() {
  cached = {};
}

export { GnosisSafeProvider };
