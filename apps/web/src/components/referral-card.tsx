'use client';

import { useEffect, useState } from 'react';

interface ReferralStats {
  referralCode: string;
  refereeCount: number;
  earnings: {
    total: string;
    pending: string;
    paid: string;
    reversed: string;
  };
}

export function ReferralCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referrals')
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => undefined);
  }, []);

  if (!stats) {
    return (
      <div className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
        Loading referral stats\u2026
      </div>
    );
  }

  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}?ref=${stats.referralCode}`
      : `?ref=${stats.referralCode}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl bg-muted p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Referrals
      </div>
      <div className="mt-3 grid grid-cols-3 gap-4">
        <Stat label="Referees" value={String(stats.refereeCount)} />
        <Stat label="Earned" value={`$${stats.earnings.total}`} />
        <Stat label="Pending" value={`$${stats.earnings.pending}`} />
      </div>

      <div className="mt-5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Your link
        </div>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs">
            {link}
          </code>
          <button
            onClick={copy}
            className="rounded-xl border border-border px-3 py-2 text-xs transition-colors hover:bg-background"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          You earn 10% of every quest your referees complete.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
