'use client';

import { useEffect, useState } from 'react';

interface Payout {
  id: string;
  amountUsdc: string;
  provider: string;
  status: 'QUEUED' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';
  chainId: number;
  txHash: string | null;
  providerRef: string | null;
  failureReason: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

const STATUS_COLOR: Record<Payout['status'], string> = {
  QUEUED: 'text-amber-400',
  SUBMITTED: 'text-sky-400',
  CONFIRMED: 'text-emerald-400',
  FAILED: 'text-red-400',
};

export function PayoutHistory() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);

  useEffect(() => {
    fetch('/api/withdrawals')
      .then((r) => (r.ok ? r.json() : { payouts: [] }))
      .then((data) => setPayouts(data.payouts ?? []))
      .catch(() => setPayouts([]));
  }, []);

  if (payouts === null) {
    return <p className="text-sm text-neutral-500">Loading payouts\u2026</p>;
  }
  if (payouts.length === 0) {
    return <p className="text-sm text-neutral-500">No withdrawals yet.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-800 border border-neutral-800">
      {payouts.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-4 bg-neutral-950 px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[10px] uppercase tracking-widest ${STATUS_COLOR[p.status]}`}>
                {p.status}
              </span>
              <span className="font-mono text-[10px] text-neutral-600">\u00b7</span>
              <span className="font-mono text-[10px] text-neutral-500">{p.provider}</span>
              <span className="font-mono text-[10px] text-neutral-600">\u00b7</span>
              <span className="font-mono text-[10px] text-neutral-500">chain {p.chainId}</span>
            </div>
            <div className="mt-1 text-sm">
              <span className="font-medium">${p.amountUsdc}</span>{' '}
              <span className="text-neutral-500">USDC</span>
              {p.txHash && (
                <a
                  href={txExplorerUrl(p.chainId, p.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-3 font-mono text-xs text-neutral-400 underline hover:text-white"
                >
                  {p.txHash.slice(0, 10)}\u2026{p.txHash.slice(-6)}
                </a>
              )}
              {p.failureReason && (
                <span className="ml-3 text-xs text-red-400">{p.failureReason}</span>
              )}
            </div>
          </div>
          <div className="text-right text-[10px] font-mono text-neutral-500">
            {new Date(p.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}

function txExplorerUrl(chainId: number, txHash: string): string {
  switch (chainId) {
    case 1:
      return `https://etherscan.io/tx/${txHash}`;
    case 11155111:
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    case 8453:
      return `https://basescan.org/tx/${txHash}`;
    case 84532:
      return `https://sepolia.basescan.org/tx/${txHash}`;
    case 137:
      return `https://polygonscan.com/tx/${txHash}`;
    default:
      return '#';
  }
}
