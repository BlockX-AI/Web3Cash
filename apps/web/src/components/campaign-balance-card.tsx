'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { ESCROW_V2_ABI } from '@web3cash/contracts';

const ESCROW_V2_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS_V2 as `0x${string}`;

interface CampaignBalanceCardProps {
  campaignId: string;
}

export function CampaignBalanceCard({ campaignId }: CampaignBalanceCardProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [spent, setSpent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBalance() {
      if (!ESCROW_V2_ADDRESS) {
        setError('EscrowV2 not configured');
        setLoading(false);
        return;
      }

      try {
        const client = createPublicClient({
          chain: sepolia,
          transport: http(),
        });

        // Convert UUID to bytes32
        const campaignIdBytes32 = `0x${campaignId.replace(/-/g, '')}` as `0x${string}`;

        const [creator, balanceWei, spentWei, active] = await client.readContract({
          address: ESCROW_V2_ADDRESS,
          abi: ESCROW_V2_ABI,
          functionName: 'getCampaign',
          args: [campaignIdBytes32],
        });

        setBalance(formatUnits(balanceWei, 6));
        setSpent(formatUnits(spentWei, 6));
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch campaign balance:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balance');
        setLoading(false);
      }
    }

    fetchBalance();
    const interval = setInterval(fetchBalance, 15000); // Refresh every 15s

    return () => clearInterval(interval);
  }, [campaignId]);

  if (!ESCROW_V2_ADDRESS) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          On-Chain Balance
        </h3>
        <p className="mt-2 text-2xl font-bold">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
        <h3 className="text-sm font-medium uppercase tracking-widest text-red-600">
          On-Chain Balance
        </h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        On-Chain Balance
      </h3>
      <div className="mt-2 space-y-2">
        <div>
          <p className="text-2xl font-bold">${balance} USDC</p>
          <p className="text-xs text-muted-foreground">Available for payouts</p>
        </div>
        <div className="border-t border-border pt-2">
          <p className="text-sm text-muted-foreground">
            Spent: <span className="font-semibold">${spent} USDC</span>
          </p>
        </div>
      </div>
      <a
        href={`https://sepolia.etherscan.io/address/${ESCROW_V2_ADDRESS}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-xs text-accent hover:underline"
      >
        View on Etherscan ↗
      </a>
    </div>
  );
}
