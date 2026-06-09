import type { ChainAnalyticsAdapter } from '../types.js';
import { AlchemyAdapter } from './alchemy.js';
import { MoralisAdapter } from './moralis.js';

/**
 * DualAdapter — tries the primary adapter first, falls back to the secondary
 * on any error. This gives us resilience against Alchemy API downtime.
 *
 * Usage (in worker):
 *   const adapter = DualAdapter.fromEnv();
 *
 * Both ALCHEMY_API_KEY and MORALIS_API_KEY must be set for full failover.
 * If only ALCHEMY_API_KEY is set, Moralis fallback is skipped.
 */
export class DualAdapter implements ChainAnalyticsAdapter {
  constructor(
    private readonly primary: ChainAnalyticsAdapter,
    private readonly secondary: ChainAnalyticsAdapter | null,
  ) {}

  static fromEnv(): DualAdapter {
    const primary = new AlchemyAdapter();
    let secondary: MoralisAdapter | null = null;
    if (process.env.MORALIS_API_KEY) {
      secondary = new MoralisAdapter();
    }
    return new DualAdapter(primary, secondary);
  }

  private async withFallback<T>(fn: (a: ChainAnalyticsAdapter) => Promise<T>): Promise<T> {
    try {
      return await fn(this.primary);
    } catch (primaryErr) {
      if (!this.secondary) throw primaryErr;
      return await fn(this.secondary);
    }
  }

  getTransactionCount(w: string, chainId: number) {
    return this.withFallback((a) => a.getTransactionCount(w, chainId));
  }

  getWalletAge(w: string, chainId: number) {
    return this.withFallback((a) => a.getWalletAge(w, chainId));
  }

  getNativeBalanceWei(w: string, chainId: number) {
    return this.withFallback((a) => a.getNativeBalanceWei(w, chainId));
  }

  getTokenDiversity(w: string, chainId: number) {
    return this.withFallback((a) => a.getTokenDiversity(w, chainId));
  }

  getNftCount(w: string, chainId: number) {
    return this.withFallback((a) => a.getNftCount(w, chainId));
  }

  getContractsInteracted(w: string, chainId: number) {
    return this.withFallback((a) => a.getContractsInteracted(w, chainId));
  }
}
