/**
 * Admin endpoint that runs the entire post-claim pipeline end-to-end for the
 * caller's wallet. Designed for MVP testing without a separately deployed
 * worker.
 *
 *   1. Force-recheck all HOLDING completions for caller (HOLDING → VERIFIED).
 *   2. Drain pending balance into a QUEUED Payout row.
 *   3. Submit the Payout on-chain via EscrowContractProvider.
 *   4. Confirm the tx (poll for finality).
 *
 * Returns a step-by-step trace including the on-chain tx hash.
 *
 * Auth: requires SIWE session. Only operates on the caller's own wallet.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@web3cash/db';
import { recheckCompletion } from '@web3cash/verifiers';
import {
  createWithdrawal,
  processQueuedPayouts,
  confirmPayout,
} from '@web3cash/payouts';
import { getSessionWallet } from '@/lib/session';

export const runtime = 'nodejs';

function explorerUrl(chainId: number, txHash: string): string {
  if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
  if (chainId === 1) return `https://etherscan.io/tx/${txHash}`;
  return txHash;
}

export async function POST() {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const trace: Array<{ step: string; data: unknown }> = [];
  const chainId = Number(process.env.DEFAULT_CHAIN_ID ?? '11155111');
  const provider =
    (process.env.PAYOUT_PROVIDER as
      | 'GNOSIS_SAFE'
      | 'CIRCLE_API'
      | 'ESCROW_CONTRACT'
      | 'ESCROW_CONTRACT_V2') ?? 'ESCROW_CONTRACT';

  // ── Step 1: Force-recheck all HOLDING completions for this wallet ─────────
  const holding = await prisma.questCompletion.findMany({
    where: { userWallet: wallet, status: 'HOLDING' },
    select: { id: true, questId: true },
  });

  const recheckResults: Array<{ completionId: string; outcome: string }> = [];
  for (const c of holding) {
    try {
      const outcome = await recheckCompletion(c.id);
      recheckResults.push({ completionId: c.id, outcome });
    } catch (err) {
      recheckResults.push({
        completionId: c.id,
        outcome: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  trace.push({ step: '1_recheck_holding', data: { count: holding.length, recheckResults } });

  // ── Step 2: Create a withdrawal (drains pendingBalance → QUEUED Payout) ───
  const withdrawal = await createWithdrawal(wallet, { chainId, provider });
  trace.push({ step: '2_create_withdrawal', data: withdrawal });

  // Don't return early if withdrawal fails - there might be existing QUEUED payouts to process

  // ── Step 3: Submit the Payout on-chain via Escrow ─────────────────────────
  let submitResult;
  try {
    submitResult = await processQueuedPayouts({ provider, chainId });
    trace.push({ step: '3_submit_onchain', data: submitResult });
    
    // If submission returned empty array, check if there was a reason
    if (submitResult.submitted.length === 0 && submitResult.reason) {
      trace.push({
        step: '3_submit_error',
        data: { error: submitResult.reason, note: 'No payouts were submitted' },
      });
      return NextResponse.json({ ok: false, trace }, { status: 200 });
    }
  } catch (err) {
    trace.push({
      step: '3_submit_onchain',
      data: {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    });
    return NextResponse.json({ ok: false, trace }, { status: 200 });
  }

  // ── Step 4: Confirm the payout (poll for tx finality) ─────────────────────
  // For MVP we do a single confirm pass. If still SUBMITTED, the user can
  // re-hit this endpoint or we can rely on a follow-up cron/worker.
  const submittedIds = submitResult.submitted ?? [];
  const confirmations: Array<{
    payoutId: string;
    outcome: string;
    txHash: string | null;
    explorer: string | null;
  }> = [];
  for (const payoutId of submittedIds) {
    let outcome = 'PENDING';
    try {
      outcome = await confirmPayout(payoutId);
    } catch (err) {
      outcome = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    }
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      select: { txHash: true, status: true, chainId: true },
    });
    confirmations.push({
      payoutId,
      outcome,
      txHash: payout?.txHash ?? null,
      explorer:
        payout?.txHash && payout?.chainId
          ? explorerUrl(payout.chainId, payout.txHash)
          : null,
    });
  }
  trace.push({ step: '4_confirm', data: confirmations });

  // Final user state snapshot
  const user = await prisma.user.findUnique({
    where: { walletAddress: wallet },
    select: {
      pendingBalanceUsdc: true,
      totalEarnedUsdc: true,
    },
  });
  trace.push({
    step: '5_final_state',
    data: {
      pendingBalanceUsdc: user?.pendingBalanceUsdc.toString() ?? '0',
      totalEarnedUsdc: user?.totalEarnedUsdc.toString() ?? '0',
    },
  });

  return NextResponse.json({ ok: true, trace });
}
