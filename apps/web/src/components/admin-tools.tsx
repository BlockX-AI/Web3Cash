'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminTools() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function bootstrapProject() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/bootstrap-project', { method: 'POST' });
      const json = await res.json();
      setResult(json.message || JSON.stringify(json));
      if (json.ok) {
        setTimeout(() => router.refresh(), 1000);
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function checkPayouts() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/check-payouts');
      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (err) {
      setResult(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-muted p-4">
      <h4 className="text-sm font-medium">Admin Tools</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={bootstrapProject}
          disabled={loading}
          className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          Bootstrap Project
        </button>
        <button
          onClick={checkPayouts}
          disabled={loading}
          className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          Check Payouts
        </button>
      </div>
      {result && (
        <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-background p-2 text-[10px] text-foreground/80">
          {result}
        </pre>
      )}
    </div>
  );
}
