'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SybilOverrideButton({ currentScore }: { currentScore: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function setScore(score: number) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/set-sybil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Override:</span>
      <button
        onClick={() => setScore(100)}
        disabled={loading || currentScore === 100}
        className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400 hover:bg-green-500/30 disabled:opacity-30"
      >
        100
      </button>
      <button
        onClick={() => setScore(50)}
        disabled={loading || currentScore === 50}
        className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-30"
      >
        50
      </button>
      <button
        onClick={() => setScore(0)}
        disabled={loading || currentScore === 0}
        className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/30 disabled:opacity-30"
      >
        0
      </button>
    </div>
  );
}
