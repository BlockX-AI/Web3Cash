import type { QuestVerifier, VerifyInput, VerifyResult } from './types.js';

/**
 * On-chain deposit verifier.
 *
 * Supports:
 *   - ON_CHAIN_DEPOSIT: requirements {
 *       contractAddress: string,   // target contract to check tx to
 *       minAmountWei?: string,     // minimum transfer value in wei (default "0")
 *       lookbackSeconds?: number,  // how far back to look (default 86400 = 24h)
 *       chainId?: number,          // defaults to DEFAULT_CHAIN_ID env
 *     }
 *
 * Strategy:
 *   Use Alchemy alchemy_getAssetTransfers to find external txs FROM the user wallet
 *   TO the target contract within the lookback window. If any tx meets the minimum
 *   amount threshold → PASS.
 */

const CHAIN_ID_TO_ALCHEMY: Record<number, string> = {
  1: 'eth-mainnet',
  11155111: 'eth-sepolia',
  8453: 'base-mainnet',
  137: 'polygon-mainnet',
  42161: 'arb-mainnet',
};

interface AssetTransfer {
  value: number | null;
  blockNum: string;
  metadata?: { blockTimestamp?: string };
  to: string | null;
}

interface GetAssetTransfersResult {
  result?: { transfers: AssetTransfer[] };
}

async function getRecentTxsToContract(
  fromAddress: string,
  toAddress: string,
  chainId: number,
  lookbackSeconds: number,
  apiKey: string,
): Promise<AssetTransfer[]> {
  const network = CHAIN_ID_TO_ALCHEMY[chainId];
  if (!network) throw new Error(`Unsupported chainId: ${chainId}`);

  const endpoint = `https://${network}.g.alchemy.com/v2/${apiKey}`;
  const cutoffTs = new Date(Date.now() - lookbackSeconds * 1000).toISOString();

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getAssetTransfers',
      params: [
        {
          fromBlock: '0x0',
          toBlock: 'latest',
          fromAddress,
          toAddress,
          category: ['external', 'erc20'],
          maxCount: '0x64', // 100
          withMetadata: true,
          order: 'desc',
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Alchemy request failed: ${res.status}`);
  const json = (await res.json()) as GetAssetTransfersResult;
  const transfers = json.result?.transfers ?? [];

  // Filter to only those within the lookback window
  return transfers.filter((t) => {
    const ts = t.metadata?.blockTimestamp;
    if (!ts) return true; // include if no timestamp
    return ts >= cutoffTs;
  });
}

class OnChainDepositVerifier implements QuestVerifier {
  readonly supports = ['ON_CHAIN_DEPOSIT'] as const satisfies readonly ['ON_CHAIN_DEPOSIT'];

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const start = Date.now();
    const {
      contractAddress,
      minAmountWei = '0',
      lookbackSeconds = 86400,
      chainId: reqChainId,
    } = input.requirements as {
      contractAddress?: string;
      minAmountWei?: string;
      lookbackSeconds?: number;
      chainId?: number;
    };

    if (!contractAddress || typeof contractAddress !== 'string') {
      return {
        outcome: 'INVALID',
        latencyMs: Date.now() - start,
        payload: { reason: 'missing_contract_address' },
      };
    }

    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      return {
        outcome: 'RETRY',
        latencyMs: Date.now() - start,
        payload: { reason: 'missing_alchemy_key' },
        errorMessage: 'ALCHEMY_API_KEY not configured',
      };
    }

    const chainId = reqChainId ?? Number(process.env.DEFAULT_CHAIN_ID ?? '1');
    const minWei = BigInt(minAmountWei);

    try {
      const txs = await getRecentTxsToContract(
        input.userWallet,
        contractAddress.toLowerCase(),
        chainId,
        Number(lookbackSeconds),
        apiKey,
      );

      const qualifying = txs.filter((t) => {
        if (minWei === 0n) return true;
        // value is in ETH (float). Convert to wei approximation for comparison.
        const valueWei = BigInt(Math.floor((t.value ?? 0) * 1e18));
        return valueWei >= minWei;
      });

      if (qualifying.length > 0) {
        return {
          outcome: 'PASS',
          latencyMs: Date.now() - start,
          payload: {
            contractAddress,
            chainId,
            txCount: qualifying.length,
            latestTx: qualifying[0],
          },
        };
      }

      return {
        outcome: 'FAIL',
        latencyMs: Date.now() - start,
        payload: {
          contractAddress,
          chainId,
          txCount: 0,
          reason: 'no_qualifying_deposit_found',
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /failed: 5/.test(msg) || /rate/i.test(msg);
      return {
        outcome: retryable ? 'RETRY' : 'FAIL',
        latencyMs: Date.now() - start,
        payload: { contractAddress, error: msg },
        errorMessage: msg,
      };
    }
  }
}

export const onChainDepositVerifier = new OnChainDepositVerifier();
