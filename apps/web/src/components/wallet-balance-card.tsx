'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';

const USDC_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const;

const USDC_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function WalletBalanceCard() {
  const { address } = useAccount();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setBalance('0');
      setLoading(false);
      return;
    }

    async function fetchBalance() {
      try {
        const client = createPublicClient({
          chain: sepolia,
          transport: http(),
        });

        const result = await client.readContract({
          address: USDC_SEPOLIA,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [address!],
        });

        setBalance(formatUnits(result, 6));
      } catch (err) {
        console.error('Failed to fetch wallet balance:', err);
        setBalance('0');
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
  }, [address]);

  return (
    <div className="rounded-2xl bg-muted p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Your Wallet Balance
      </div>
      <div className="mt-2 text-2xl font-semibold">
        {loading ? '...' : `$${balance}`}{' '}
        <span className="text-sm text-muted-foreground">USDC</span>
      </div>
      {address && (
        <a
          href={`https://sepolia.etherscan.io/token/${USDC_SEPOLIA}?a=${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block font-mono text-xs text-accent hover:underline"
        >
          View on Etherscan ↗
        </a>
      )}
    </div>
  );
}
