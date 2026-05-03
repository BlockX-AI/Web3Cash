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
    <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-red-400">Debug: Test Escrow</h4>
          <p className="mt-1 text-xs text-neutral-400">
            Attempts to submit 1 USDC to your wallet via escrow contract. Shows
            exact error if it fails.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="shrink-0 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-400 disabled:opacity-50"
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
              className="rounded border border-red-500/20 bg-black/40 p-2"
            >
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-red-400">
                {t.step}
              </summary>
              <pre className="mt-1.5 overflow-x-auto text-[10px] text-neutral-300">
                {JSON.stringify(t.data, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
