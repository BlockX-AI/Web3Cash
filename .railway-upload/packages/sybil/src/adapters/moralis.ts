import type { ChainAnalyticsAdapter } from '../types.js';

/**
 * Moralis Web3 Data API adapter.
 * Acts as a fallback when the primary Alchemy adapter fails.
 *
 * Required env:
 *   MORALIS_API_KEY — from https://admin.moralis.io
 *
 * Chain support:
 *   1 (Ethereum), 137 (Polygon), 42161 (Arbitrum), 8453 (Base), 11155111 (Sepolia)
 */

const CHAIN_HEX: Record<number, string> = {
  1: '0x1',
  11155111: '0xaa36a7',
  8453: '0x2105',
  137: '0x89',
  42161: '0xa4b1',
};

const BASE = 'https://deep-index.moralis.io/api/v2.2';

export class MoralisAdapter implements ChainAnalyticsAdapter {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.MORALIS_API_KEY;
    if (!key) throw new Error('MORALIS_API_KEY env var not set');
    this.apiKey = key;
  }

  private chain(chainId: number): string {
    const hex = CHAIN_HEX[chainId];
    if (!hex) throw new Error(`Unsupported chainId for MoralisAdapter: ${chainId}`);
    return hex;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'X-API-Key': this.apiKey, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Moralis ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  }

  async getTransactionCount(walletAddress: string, chainId: number): Promise<number> {
    const chain = this.chain(chainId);
    const data = await this.get<{ nonce?: string }>(
      `/${walletAddress}?chain=${chain}&limit=1`,
    );
    // Moralis returns nonce in address metadata endpoint
    return data.nonce ? parseInt(data.nonce, 16) : 0;
  }

  async getWalletAge(walletAddress: string, chainId: number): Promise<{ ageDays: number } | null> {
    const chain = this.chain(chainId);
    const data = await this.get<{
      result?: Array<{ block_timestamp?: string }>;
    }>(`/${walletAddress}/transactions?chain=${chain}&order=ASC&limit=1`);

    const earliest = data.result?.[0];
    if (!earliest?.block_timestamp) return null;
    const firstTxMs = new Date(earliest.block_timestamp).getTime();
    const ageDays = Math.floor((Date.now() - firstTxMs) / (1000 * 60 * 60 * 24));
    return { ageDays: Math.max(0, ageDays) };
  }

  async getNativeBalanceWei(walletAddress: string, chainId: number): Promise<string> {
    const chain = this.chain(chainId);
    const data = await this.get<{ balance?: string }>(
      `/${walletAddress}/balance?chain=${chain}`,
    );
    return data.balance ?? '0';
  }

  async getTokenDiversity(walletAddress: string, chainId: number): Promise<number> {
    const chain = this.chain(chainId);
    const data = await this.get<{ result?: unknown[] }>(
      `/${walletAddress}/erc20?chain=${chain}&limit=100`,
    );
    return data.result?.length ?? 0;
  }

  async getNftCount(walletAddress: string, chainId: number): Promise<number> {
    const chain = this.chain(chainId);
    const data = await this.get<{ total?: number }>(
      `/nft/${walletAddress}/collections?chain=${chain}&limit=1`,
    );
    return data.total ?? 0;
  }

  async getContractsInteracted(walletAddress: string, chainId: number): Promise<number> {
    const chain = this.chain(chainId);
    const data = await this.get<{
      result?: Array<{ to_address?: string }>;
    }>(`/${walletAddress}/transactions?chain=${chain}&limit=500`);
    const unique = new Set<string>();
    for (const tx of data.result ?? []) {
      if (tx.to_address) unique.add(tx.to_address.toLowerCase());
    }
    return unique.size;
  }
}
