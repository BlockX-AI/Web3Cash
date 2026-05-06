'use client';

import { useState } from 'react';

type Trace = Array<{ step: string; data: unknown }>;

export function ProcessPipelineButton() {
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setTrace(null);
    try {
      const res = await fetch('/api/admin/process-pipeline', { method: 'POST' });
      const json = await res.json();
      if (!res.ok && !json?.trace) {
        setError(json?.error ?? `HTTP ${res.status}`);
      } else {
        setTrace(json.trace as Trace);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-muted p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">
            Run end-to-end pipeline (MVP test)
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Force-rechecks HOLDING quests → drains pending balance → submits an
            on-chain payout via the escrow contract → returns the tx hash.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Run pipeline'}
        </button>
      </div>

      {error && (
        <pre className="mt-4 overflow-x-auto rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500">
          {error}
        </pre>
      )}

      {trace && (
        <div className="mt-4 space-y-2">
          {trace.map((t, i) => (
            <details
              key={i}
              open={i === trace.length - 1}
              className="rounded-xl border border-border bg-background p-3"
            >
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {t.step}
              </summary>
              <pre className="mt-2 overflow-x-auto text-xs text-foreground/80">
                {JSON.stringify(t.data, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
