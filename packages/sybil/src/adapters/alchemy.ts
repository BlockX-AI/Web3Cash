import type { ChainAnalyticsAdapter } from '../types.js';

const CHAIN_ID_TO_ALCHEMY_NETWORK: Record<number, string> = {
  1: 'eth-mainnet',
  11155111: 'eth-sepolia',
  8453: 'base-mainnet',
  137: 'polygon-mainnet',
  42161: 'arb-mainnet',
};

interface AssetTransfer {
  blockNum: string; // hex
  metadata?: { blockTimestamp?: string };
}

interface GetAssetTransfersResult {
  result?: { transfers: AssetTransfer[]; pageKey?: string };
}

export class AlchemyAdapter implements ChainAnalyticsAdapter {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.ALCHEMY_API_KEY;
    if (!key) throw new Error('ALCHEMY_API_KEY env var not set');
    this.apiKey = key;
  }

  private endpoint(chainId: number): string {
    const network = CHAIN_ID_TO_ALCHEMY_NETWORK[chainId];
    if (!network) throw new Error(`Unsupported chainId for AlchemyAdapter: ${chainId}`);
    return `https://${network}.g.alchemy.com/v2/${this.apiKey}`;
  }

  private async rpc<T>(chainId: number, method: string, params: unknown[]): Promise<T> {
    const res = await fetch(this.endpoint(chainId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!res.ok) {
      throw new Error(`Alchemy RPC ${method} failed: ${res.status}`);
    }
    return (await res.json()) as T;
  }

  async getTransactionCount(walletAddress: string, chainId: number): Promise<number> {
    const json = await this.rpc<{ result?: string }>(chainId, 'eth_getTransactionCount', [
      walletAddress,
      'latest',
    ]);
    return json.result ? parseInt(json.result, 16) : 0;
  }

  async getWalletAge(
    walletAddress: string,
    chainId: number,
  ): Promise<{ ageDays: number } | null> {
    // Earliest external tx FROM this wallet (ordered ascending, page size 1).
    const json = await this.rpc<GetAssetTransfersResult>(chainId, 'alchemy_getAssetTransfers', [
      {
        fromBlock: '0x0',
        toBlock: 'latest',
        fromAddress: walletAddress,
        category: ['external'],
        order: 'asc',
        maxCount: '0x1',
        withMetadata: true,
      },
    ]);

    const earliest = json.result?.transfers?.[0];
    const ts = earliest?.metadata?.blockTimestamp;
    if (!ts) return null;

    const firstTxMs = new Date(ts).getTime();
    const ageDays = Math.floor((Date.now() - firstTxMs) / (1000 * 60 * 60 * 24));
    return { ageDays: Math.max(0, ageDays) };
  }
}
