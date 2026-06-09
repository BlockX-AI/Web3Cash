import type { PayoutProvider as DbPayoutProvider } from '@web3cash/db';
import type { PayoutProviderAdapter } from '../types.js';
import { GnosisSafeProvider } from './gnosis-safe.js';
import { EscrowContractProvider } from './escrow.js';
import { EscrowContractV2Provider } from './escrow-v2.js';

/**
 * Lazily instantiate a provider. The factory keeps env-loading constructors
 * out of the hot path so a missing Escrow env doesn't break Gnosis Safe code.
 */
let cached: Partial<Record<DbPayoutProvider, PayoutProviderAdapter>> = {};

export function getProvider(id: DbPayoutProvider): PayoutProviderAdapter {
  if (cached[id]) return cached[id]!;
  switch (id) {
    case 'GNOSIS_SAFE':
      cached[id] = new GnosisSafeProvider();
      return cached[id]!;
    case 'ESCROW_CONTRACT':
      cached[id] = new EscrowContractProvider();
      return cached[id]!;
    case 'ESCROW_CONTRACT_V2':
      cached[id] = new EscrowContractV2Provider();
      return cached[id]!;
    case 'CIRCLE_API':
      throw new Error('CIRCLE_API provider is reserved for future use');
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

export { GnosisSafeProvider, EscrowContractProvider, EscrowContractV2Provider };
