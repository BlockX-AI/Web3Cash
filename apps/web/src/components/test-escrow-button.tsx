'use client';

import { useState } from 'react';

type Trace = Array<{ step: string; data: unknown }>;

export function TestEscrowButton() {
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);

  async function run() {
    setLoading(true);
    setTrace(null);
    try {
      const res = await fetch('/api/admin/test-escrow', { method: 'POST' });
      const json = await res.json();
      setTrace(json.trace as Trace);
    } catch (err) {
      setTrace([
        {
          step: 'fetch_error',
          data: { error: err instanceof Error ? err.message : String(err) },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-muted p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-medium">Debug: Test Escrow</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Attempts to submit 1 USDC to your wallet via escrow contract. Shows
            exact error if it fails.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="shrink-0 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {loading ? 'Testing…' : 'Test'}
        </button>
      </div>

      {trace && (
        <div className="mt-3 space-y-1.5">
          {trace.map((t, i) => (
            <details
              key={i}
              open={i === trace.length - 1}
              className="rounded-xl border border-border bg-background p-2"
            >
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t.step}
              </summary>
              <pre className="mt-1.5 overflow-x-auto text-[10px] text-foreground/80">
                {JSON.stringify(t.data, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
