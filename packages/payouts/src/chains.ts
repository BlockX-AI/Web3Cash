import { createPublicClient, http, type Chain, type PublicClient } from 'viem';
import { mainnet, sepolia, base, baseSepolia, polygon } from 'viem/chains';

/**
 * USDC token addresses by chainId. Native (Circle-issued) USDC only.
 * Bridged USDC.e variants are intentionally excluded.
 */
export const USDC_ADDRESS: Record<number, `0x${string}`> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia (Circle test)
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
};

/** USDC has 6 decimals on every supported chain. */
export const USDC_DECIMALS = 6;

const CHAINS: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  8453: base,
  84532: baseSepolia,
  137: polygon,
};

export function getChain(chainId: number): Chain {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chainId for payouts: ${chainId}`);
  return chain;
}

export function getUsdcAddress(chainId: number): `0x${string}` {
  const addr = USDC_ADDRESS[chainId];
  if (!addr) throw new Error(`No USDC address registered for chainId ${chainId}`);
  return addr;
}

/**
 * Public RPC client. We prefer the Alchemy URL when the key is set, otherwise
 * fall back to the chain's default public RPC (rate-limited but unblocking).
 */
export function getPublicClient(chainId: number): PublicClient {
  const chain = getChain(chainId);
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  const url =
    alchemyKey && alchemyHostFor(chainId)
      ? `https://${alchemyHostFor(chainId)}.g.alchemy.com/v2/${alchemyKey}`
      : undefined;
  return createPublicClient({ chain, transport: http(url) });
}

function alchemyHostFor(chainId: number): string | null {
  switch (chainId) {
    case 1:
      return 'eth-mainnet';
    case 11155111:
      return 'eth-sepolia';
    case 8453:
      return 'base-mainnet';
    case 84532:
      return 'base-sepolia';
    case 137:
      return 'polygon-mainnet';
    default:
      return null;
  }
}
