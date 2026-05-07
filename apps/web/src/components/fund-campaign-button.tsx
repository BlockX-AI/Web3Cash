'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, keccak256, toHex, zeroAddress } from 'viem';
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
] as const;

/** Convert a Postgres UUID to the bytes32 key the EscrowV2 contract uses. */
function campaignIdToBytes32(uuid: string): `0x${string}` {
  return keccak256(toHex(uuid));
}

type Step =
  | 'idle'
  | 'creating' | 'waiting-create'
  | 'approving' | 'waiting-approve'
  | 'funding' | 'waiting-fund'
  | 'success' | 'error';

interface FundCampaignButtonProps {
  campaignId: string;
  budgetUsdc?: string;
  onSuccess?: () => void;
}

export function FundCampaignButton({ campaignId, budgetUsdc, onSuccess }: FundCampaignButtonProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState(budgetUsdc ?? '');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');

  const cid = campaignIdToBytes32(campaignId);

  // Check if campaign already exists on-chain
  const { data: campaignData } = useReadContract({
    address: ESCROW_V2_ADDRESS,
    abi: ESCROW_V2_ABI,
    functionName: 'getCampaign',
    args: [cid],
  });

  const campaignExists = campaignData
    ? (campaignData as [string, bigint, bigint, boolean])[0] !== zeroAddress
    : false;

  // --- write hooks ---
  const {
    writeContract: sendCreate,
    data: createHash,
    error: createError,
    reset: resetCreate,
  } = useWriteContract();

  const {
    writeContract: sendApprove,
    data: approveHash,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const {
    writeContract: sendFund,
    data: fundHash,
    error: fundError,
    reset: resetFund,
  } = useWriteContract();

  const { isSuccess: createConfirmed } = useWaitForTransactionReceipt({ hash: createHash });
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: fundConfirmed } = useWaitForTransactionReceipt({ hash: fundHash });

  // After createCampaign tx confirms → start approve
  useEffect(() => {
    if (createConfirmed && step === 'waiting-create') {
      startApprove();
    }
  }, [createConfirmed, step]);

  // After approve tx confirms → start fundCampaign
  useEffect(() => {
    if (approveConfirmed && step === 'waiting-approve') {
      setStep('funding');
      sendFund({
        address: ESCROW_V2_ADDRESS,
        abi: ESCROW_V2_ABI,
        functionName: 'fundCampaign',
        args: [cid, parseUnits(amount, 6)],
      });
      setStep('waiting-fund');
    }
  }, [approveConfirmed, step]);

  // After fund tx confirms → done
  useEffect(() => {
    if (fundConfirmed && step === 'waiting-fund') {
      setStep('success');
      onSuccess?.();
    }
  }, [fundConfirmed, step]);

  // Error handlers
  useEffect(() => {
    if (createError && (step === 'creating' || step === 'waiting-create')) {
      setError(createError.message.split('\n')[0] ?? 'Create campaign rejected');
      setStep('error');
    }
  }, [createError, step]);

  useEffect(() => {
    if (approveError && (step === 'approving' || step === 'waiting-approve')) {
      setError(approveError.message.split('\n')[0] ?? 'Approval rejected');
      setStep('error');
    }
  }, [approveError, step]);

  useEffect(() => {
    if (fundError && (step === 'funding' || step === 'waiting-fund')) {
      setError(fundError.message.split('\n')[0] ?? 'Fund transaction failed');
      setStep('error');
    }
  }, [fundError, step]);

  function startApprove() {
    setStep('approving');
    sendApprove({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ESCROW_V2_ADDRESS, parseUnits(amount, 6)],
    });
    setStep('waiting-approve');
  }

  function handleFund() {
    if (!address || !amount || !ESCROW_V2_ADDRESS || !USDC_ADDRESS) {
      setError('Connect your wallet and enter an amount');
      return;
    }

    setError('');
    resetCreate();
    resetApprove();
    resetFund();

    if (!campaignExists) {
      // Step 1a: create the campaign on-chain first
      setStep('creating');
      sendCreate({
        address: ESCROW_V2_ADDRESS,
        abi: ESCROW_V2_ABI,
        functionName: 'createCampaign',
        args: [cid],
      });
      setStep('waiting-create');
    } else {
      // Campaign already exists on-chain, skip straight to approve
      startApprove();
    }
  }

  function handleRetry() {
    setError('');
    resetCreate();
    resetApprove();
    resetFund();
    setStep('idle');
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

  const busy = step !== 'idle' && step !== 'success' && step !== 'error';

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold">Fund Campaign On-Chain</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Deposit USDC into the escrow contract so quest rewards can be paid out.
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
            disabled={busy}
            className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
        </div>

        {step === 'error' ? (
          <button
            onClick={handleRetry}
            className="w-full rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-600"
          >
            Try Again
          </button>
        ) : step === 'success' ? (
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-center">
            <p className="text-sm font-semibold text-green-600">
              ✓ Campaign funded successfully!
            </p>
          </div>
        ) : (
          <button
            onClick={handleFund}
            disabled={!amount || !address || busy}
            className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition-all hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50"
          >
            {step === 'idle' && 'Fund Campaign'}
            {step === 'creating' && 'Confirm campaign creation in wallet...'}
            {step === 'waiting-create' && 'Creating campaign on-chain...'}
            {step === 'approving' && 'Confirm USDC approval in wallet...'}
            {step === 'waiting-approve' && 'Waiting for approval...'}
            {step === 'funding' && 'Confirm funding in wallet...'}
            {step === 'waiting-fund' && 'Depositing USDC...'}
          </button>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">
            <strong>How it works:</strong> {campaignExists ? 'Two' : 'Three'} wallet confirmations are needed —
            {!campaignExists && ' first to register the campaign on-chain,'}
            {' '}then to approve USDC spending, and finally to deposit into the escrow contract.
          </p>
        </div>
      </div>
    </div>
  );
}
