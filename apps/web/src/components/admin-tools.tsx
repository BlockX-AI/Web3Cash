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
    <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent p-4">
      <h4 className="text-sm font-bold text-purple-400">Admin Tools</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={bootstrapProject}
          disabled={loading}
          className="rounded bg-purple-500/20 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
        >
          Bootstrap Project
        </button>
        <button
          onClick={checkPayouts}
          disabled={loading}
          className="rounded bg-purple-500/20 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
        >
          Check Payouts
        </button>
      </div>
      {result && (
        <pre className="mt-3 overflow-x-auto rounded bg-black/40 p-2 text-[10px] text-purple-200">
          {result}
        </pre>
      )}
    </div>
  );
}
