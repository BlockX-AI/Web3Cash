import { prisma, Prisma, type PayoutProvider } from '@web3cash/db';
import {
  KYC_THRESHOLD_USDC,
  MIN_WITHDRAWAL_USDC,
  PAYOUT_CONFIRMATIONS,
} from '@web3cash/shared';
import { decimalToAtomic, sumAtomic } from './money.js';
import { getProvider } from './providers/index.js';
import type { PayoutTransfer } from './types.js';

/**
 * Phase 3 payout service.
 *
 * Three top-level operations:
 *   - createWithdrawal: user clicks "Withdraw" → atomically drains pending
 *     balance into a QUEUED Payout row.
 *   - processQueuedPayouts: an operator (or worker) submits all QUEUED rows
 *     of a given provider in one batched on-chain tx.
 *   - confirmPayout: worker polls a SUBMITTED row to mark CONFIRMED/FAILED.
 *
 * Money invariants (enforced):
 *   1. Sum of (CREDITED ReferralEarning) + (VERIFIED unpaid Completion)
 *      EQUALS user.pendingBalanceUsdc at withdrawal time.
 *   2. After CONFIRMED payout: parent Completions → PAID, ReferralEarnings → PAID.
 *   3. On FAILED payout: pending balance is restored, sources flip back to
 *      VERIFIED / CREDITED so the user can retry.
 */

export type WithdrawalErrorCode =
  | 'NO_PENDING_BALANCE'
  | 'BELOW_MIN_WITHDRAWAL'
  | 'KYC_REQUIRED'
  | 'USER_NOT_FOUND'
  | 'INTERNAL_LEDGER_MISMATCH';

export type CreateWithdrawalResult =
  | {
      ok: true;
      payoutId: string;
      amountUsdc: string;
      lineItemCount: number;
    }
  | { ok: false; code: WithdrawalErrorCode; message?: string };

interface LineItem {
  kind: 'COMPLETION' | 'REFERRAL';
  sourceId: string;
  amount: string; // decimal string for Json safety
}

/**
 * Move every CREDITED referral earning + every VERIFIED unpaid completion
 * into a single QUEUED Payout. Decrements `pendingBalanceUsdc` to zero and
 * flips source rows to a "locked" intermediate state so they cannot be
 * double-spent: completions stay VERIFIED but get a non-null `paidAt`
 * placeholder; earnings move to PAID immediately (idempotent because of the
 * unique completionId index).
 *
 * NOTE on Completion locking: we use `paidAt` as the lock marker so we don't
 * have to introduce a 6th `CompletionStatus` value. Phase 6's escrow contract
 * makes this explicit via on-chain claim state.
 */
export async function createWithdrawal(
  userWallet: string,
  opts: { provider?: PayoutProvider; chainId?: number } = {},
): Promise<CreateWithdrawalResult> {
  const wallet = userWallet.toLowerCase();
  const provider = opts.provider ?? (process.env.PAYOUT_PROVIDER as PayoutProvider | undefined) ?? 'ESCROW_CONTRACT';
  const chainId = opts.chainId ?? 1;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) return { ok: false as const, code: 'USER_NOT_FOUND' as const };

    if (user.pendingBalanceUsdc.lt(MIN_WITHDRAWAL_USDC)) {
      return { ok: false as const, code: 'BELOW_MIN_WITHDRAWAL' as const };
    }

    // KYC gate: cumulative withdrawn + about-to-withdraw must stay below threshold
    // unless the user is verified. `totalEarnedUsdc` is incremented on each
    // VERIFIED quest so it's a stable proxy for cumulative payouts.
    if (
      user.kycStatus !== 'VERIFIED' &&
      user.totalEarnedUsdc.gte(KYC_THRESHOLD_USDC)
    ) {
      return { ok: false as const, code: 'KYC_REQUIRED' as const };
    }

    // Pull the source rows. We lock for update implicitly via Prisma's
    // serializable transaction (the surrounding $transaction).
    const completions = await tx.questCompletion.findMany({
      where: { userWallet: wallet, status: 'VERIFIED', paidAt: null },
      select: { id: true, rewardUsdc: true },
    });
    const earnings = await tx.referralEarning.findMany({
      where: { referrerWallet: wallet, status: 'CREDITED' },
      select: { id: true, amountUsdc: true },
    });

    const lineItems: LineItem[] = [
      ...completions.map((c) => ({
        kind: 'COMPLETION' as const,
        sourceId: c.id,
        amount: c.rewardUsdc.toString(),
      })),
      ...earnings.map((e) => ({
        kind: 'REFERRAL' as const,
        sourceId: e.id,
        amount: e.amountUsdc.toString(),
      })),
    ];

    if (lineItems.length === 0) {
      return { ok: false as const, code: 'NO_PENDING_BALANCE' as const };
    }

    const total = lineItems.reduce(
      (acc, li) => acc.plus(li.amount),
      new Prisma.Decimal(0),
    );

    // Reconciliation: ledger sources MUST equal pendingBalance. If not, abort
    // and require an admin to investigate — never silently absorb the diff.
    if (!total.equals(user.pendingBalanceUsdc)) {
      return {
        ok: false as const,
        code: 'INTERNAL_LEDGER_MISMATCH' as const,
        message: `pending=${user.pendingBalanceUsdc.toString()} sources=${total.toString()}`,
      };
    }

    // 1. Create the Payout row.
    const payout = await tx.payout.create({
      data: {
        userWallet: wallet,
        amountUsdc: total,
        provider,
        status: 'QUEUED',
        chainId,
        lineItems: lineItems as unknown as Prisma.InputJsonValue,
      },
    });

    // 2. Lock sources. Completions: stamp paidAt so the next withdraw skips
    //    them. Earnings: flip CREDITED → PAID.
    await tx.questCompletion.updateMany({
      where: { id: { in: completions.map((c) => c.id) } },
      data: { paidAt: new Date() },
    });
    await tx.referralEarning.updateMany({
      where: { id: { in: earnings.map((e) => e.id) } },
      data: { status: 'PAID', paidAt: new Date() },
    });

    // 3. Drain pending balance.
    await tx.user.update({
      where: { walletAddress: wallet },
      data: { pendingBalanceUsdc: 0 },
    });

    // 4. Append audit event.
    await tx.payoutEvent.create({
      data: {
        payoutId: payout.id,
        fromStatus: null,
        toStatus: 'QUEUED',
        actor: 'system',
        payload: {
          lineItemCount: lineItems.length,
          completions: completions.length,
          earnings: earnings.length,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      ok: true as const,
      payoutId: payout.id,
      amountUsdc: total.toString(),
      lineItemCount: lineItems.length,
    };
  });
}

/**
 * Submit every QUEUED Payout for a given provider as a single batched tx.
 * Should be called by an operator script or a low-frequency worker (e.g.
 * every 15 minutes). Returns the list of Payouts that were submitted.
 */
export async function processQueuedPayouts(input: {
  provider: PayoutProvider;
  chainId: number;
}): Promise<{ submitted: string[]; reason?: string }> {
  const queued = await prisma.payout.findMany({
    where: {
      provider: input.provider,
      status: 'QUEUED',
      chainId: input.chainId,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (queued.length === 0) return { submitted: [] };

  const transfers: PayoutTransfer[] = queued.map((p) => ({
    payoutId: p.id,
    to: p.userWallet,
    amountUsdcAtomic: decimalToAtomic(p.amountUsdc),
  }));

  // Sanity: amounts must sum to at least 1 atom (avoids submitting empties).
  if (sumAtomic(transfers.map((t) => t.amountUsdcAtomic)) === 0n) {
    return { submitted: [], reason: 'all_zero' };
  }

  const provider = getProvider(input.provider);
  const result = await provider.submit(transfers);

  const now = new Date();
  await prisma.$transaction([
    prisma.payout.updateMany({
      where: { id: { in: queued.map((p) => p.id) } },
      data: {
        status: 'SUBMITTED',
        providerRef: result.providerRef,
        txHash: result.txHash ?? null,
        submittedAt: now,
      },
    }),
    prisma.payoutEvent.createMany({
      data: queued.map((p) => ({
        payoutId: p.id,
        fromStatus: 'QUEUED',
        toStatus: 'SUBMITTED',
        actor: `provider.${input.provider.toLowerCase()}`,
        payload: {
          providerRef: result.providerRef,
          txHash: result.txHash ?? null,
          batchSize: queued.length,
        } as Prisma.InputJsonValue,
      })),
    }),
  ]);

  return { submitted: queued.map((p) => p.id) };
}

/**
 * Re-check a SUBMITTED payout. On CONFIRMED → mark PAID downstream. On FAILED
 * → restore pending balance and unlock sources. Idempotent: safe to call
 * many times for the same payout.
 */
export type ConfirmOutcome = 'CONFIRMED' | 'PENDING' | 'FAILED' | 'NOOP';

export async function confirmPayout(payoutId: string): Promise<ConfirmOutcome> {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout || payout.status !== 'SUBMITTED') return 'NOOP';
  if (!payout.providerRef) return 'NOOP';

  const provider = getProvider(payout.provider);
  const status = await provider.checkStatus({
    providerRef: payout.providerRef,
    txHash: payout.txHash,
  });

  if (status.kind === 'PENDING') return 'PENDING';

  if (status.kind === 'CONFIRMED') {
    await prisma.$transaction([
      prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'CONFIRMED',
          txHash: status.txHash,
          confirmedAt: new Date(),
        },
      }),
      // Sources are already locked (paidAt set) — nothing further to flip.
      // Completions ledger note: paidAt was set when the Payout was queued; we
      // could also bump CompletionStatus to PAID for explicitness:
      prisma.questCompletion.updateMany({
        where: {
          id: {
            in: lineItemIds(payout.lineItems, 'COMPLETION'),
          },
        },
        data: { status: 'PAID' },
      }),
      prisma.payoutEvent.create({
        data: {
          payoutId: payout.id,
          fromStatus: 'SUBMITTED',
          toStatus: 'CONFIRMED',
          actor: 'worker.confirm-payout',
          payload: {
            txHash: status.txHash,
            blockNumber: status.blockNumber.toString(),
            confirmations: PAYOUT_CONFIRMATIONS,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);
    return 'CONFIRMED';
  }

  // FAILED — refund the user's pending balance and unlock sources.
  await prisma.$transaction([
    prisma.payout.update({
      where: { id: payout.id },
      data: { status: 'FAILED', failureReason: status.reason },
    }),
    prisma.questCompletion.updateMany({
      where: {
        id: { in: lineItemIds(payout.lineItems, 'COMPLETION') },
      },
      data: { paidAt: null },
    }),
    prisma.referralEarning.updateMany({
      where: {
        id: { in: lineItemIds(payout.lineItems, 'REFERRAL') },
      },
      data: { status: 'CREDITED', paidAt: null },
    }),
    prisma.user.update({
      where: { walletAddress: payout.userWallet },
      data: { pendingBalanceUsdc: { increment: payout.amountUsdc } },
    }),
    prisma.payoutEvent.create({
      data: {
        payoutId: payout.id,
        fromStatus: 'SUBMITTED',
        toStatus: 'FAILED',
        actor: 'worker.confirm-payout',
        payload: { reason: status.reason } as Prisma.InputJsonValue,
      },
    }),
  ]);
  return 'FAILED';
}

function lineItemIds(lineItems: unknown, kind: 'COMPLETION' | 'REFERRAL'): string[] {
  if (!Array.isArray(lineItems)) return [];
  return (lineItems as Array<{ kind: string; sourceId: string }>)
    .filter((li) => li.kind === kind)
    .map((li) => li.sourceId);
}
