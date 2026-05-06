'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ERR_COPY: Record<string, string> = {
  NO_PENDING_BALANCE: 'Nothing to withdraw yet.',
  BELOW_MIN_WITHDRAWAL: 'Minimum withdrawal is $1.',
  KYC_REQUIRED:
    'You\u2019ve crossed the $500 lifetime threshold. Complete KYC to continue withdrawing.',
  USER_NOT_FOUND: 'User record missing — please sign out and back in.',
  INTERNAL_LEDGER_MISMATCH:
    'Ledger reconciliation mismatch. Support has been alerted.',
  unauthorized: 'Please sign in first.',
};

export function WithdrawCard({
  pendingBalanceUsdc,
  kycStatus,
}: {
  pendingBalanceUsdc: string;
  kycStatus: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'ok'; payoutId: string; amountUsdc: string }
    | { kind: 'err'; code: string; message?: string }
  >({ kind: 'idle' });

  const numeric = Number(pendingBalanceUsdc);
  const disabled = state.kind === 'loading' || numeric < 1;

  async function onWithdraw() {
    setState({ kind: 'loading' });
    const res = await fetch('/api/withdrawals', { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setState({
        kind: 'ok',
        payoutId: body.payoutId,
        amountUsdc: body.amountUsdc,
      });
      router.refresh();
    } else {
      setState({
        kind: 'err',
        code: body.error ?? 'error',
        message: body.message,
      });
    }
  }

  return (
    <div className="rounded-2xl bg-muted p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Withdrawable
          </div>
          <div className="mt-2 text-2xl font-semibold">
            ${pendingBalanceUsdc}{' '}
            <span className="text-sm text-muted-foreground">USDC</span>
          </div>
        </div>
        <button
          onClick={onWithdraw}
          disabled={disabled}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none"
        >
          {state.kind === 'loading' ? 'Queueing\u2026' : 'Withdraw'}
        </button>
      </div>

      {kycStatus !== 'VERIFIED' && (
        <p className="mt-3 text-xs text-muted-foreground">
          KYC required at $500 cumulative. Current status:{' '}
          <span className="font-mono">{kycStatus}</span>.
        </p>
      )}

      {state.kind === 'ok' && (
        <p className="mt-3 text-xs text-green-600 dark:text-green-400">
          Queued ${state.amountUsdc} USDC. Settles after the next batch is signed.
        </p>
      )}
      {state.kind === 'err' && (
        <p className="mt-3 text-xs text-red-500">
          {ERR_COPY[state.code] ?? state.code}
          {state.message && <span className="ml-2 text-muted-foreground">({state.message})</span>}
        </p>
      )}
    </div>
  );
}
