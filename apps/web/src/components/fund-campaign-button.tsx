'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { ESCROW_V2_ABI } from '@web3cash/contracts';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS as `0x${string}`;
const ESCROW_V2_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS_V2 as `0x${string}`;

const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

interface FundCampaignButtonProps {
  campaignId: string;
  onSuccess?: () => void;
}

export function FundCampaignButton({ campaignId, onSuccess }: FundCampaignButtonProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approving' | 'funding' | 'success' | 'error'>('input');
  const [error, setError] = useState('');

  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: fund, data: fundHash } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isFunding } = useWaitForTransactionReceipt({
    hash: fundHash,
  });

  async function handleFund() {
    if (!address || !amount || !ESCROW_V2_ADDRESS || !USDC_ADDRESS) {
      setError('Missing required data');
      return;
    }

    const amountWei = parseUnits(amount, 6); // USDC has 6 decimals
    const campaignIdBytes32 = `0x${campaignId.replace(/-/g, '')}` as `0x${string}`;

    try {
      setError('');
      setStep('approving');

      // Step 1: Approve USDC
      approve({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ESCROW_V2_ADDRESS, amountWei],
      });

      // Wait for approval (handled by useWaitForTransactionReceipt)
      // Then fund campaign
      setTimeout(() => {
        setStep('funding');
        fund({
          address: ESCROW_V2_ADDRESS,
          abi: ESCROW_V2_ABI,
          functionName: 'fundCampaign',
          args: [campaignIdBytes32, amountWei],
        });
      }, 3000); // Wait 3s for approval to confirm

      setTimeout(() => {
        setStep('success');
        setAmount('');
        onSuccess?.();
      }, 6000); // Wait 6s total for both txs
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep('error');
    }
  }

  if (!ESCROW_V2_ADDRESS) {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
        <p className="text-sm text-yellow-600">
          EscrowV2 not configured. Set NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS_V2 in .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold">Fund Campaign</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Add USDC to your campaign&apos;s on-chain balance
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium">Amount (USDC)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            disabled={step !== 'input'}
            className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleFund}
          disabled={!amount || !address || step !== 'input'}
          className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition-all hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50"
        >
          {step === 'input' && 'Fund Campaign'}
          {step === 'approving' && 'Approving USDC...'}
          {step === 'funding' && 'Funding Campaign...'}
          {step === 'success' && '✓ Funded!'}
          {step === 'error' && 'Try Again'}
        </button>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {step === 'success' && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
            <p className="text-sm text-green-600">
              Campaign funded successfully! Funds are now available for payouts.
            </p>
          </div>
        )}

        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> This requires 2 transactions:
            <br />
            1. Approve USDC spending
            <br />
            2. Fund campaign on-chain
          </p>
        </div>
      </div>
    </div>
  );
}
