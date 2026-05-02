'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';
import { useState } from 'react';
import { useAccount, useChainId, useDisconnect, useSignMessage } from 'wagmi';

/**
 * One-click flow:
 *   1. RainbowKit ConnectButton handles wallet connection.
 *   2. After connect, fetch a nonce, build SIWE message, sign, POST to /api/auth/verify.
 *   3. On success, reload — server-side session cookie is set.
 */
export function SignInButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [status, setStatus] = useState<'idle' | 'signing' | 'verifying' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    if (!address) return;
    setStatus('signing');
    setError(null);

    try {
      const nonceRes = await fetch('/api/auth/nonce', { method: 'POST' });
      if (!nonceRes.ok) throw new Error('Failed to fetch nonce');
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Web3Cash. This will not trigger a transaction or cost any gas.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const prepared = message.prepareMessage();
      const signature = await signMessageAsync({ message: prepared });

      setStatus('verifying');
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prepared, signature }),
      });

      if (!verifyRes.ok) {
        const body = (await verifyRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'Verification failed');
      }

      window.location.href = '/dashboard';
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <ConnectButton />
      {isConnected && (
        <div className="flex flex-col gap-2">
          <button
            onClick={signIn}
            disabled={status === 'signing' || status === 'verifying'}
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 text-sm font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-50"
          >
            {status === 'signing' && '⏳ Awaiting signature...'}
            {status === 'verifying' && '🔄 Verifying...'}
            {(status === 'idle' || status === 'error') && '🔐 Sign in with Ethereum'}
          </button>
          {status === 'error' && error && (
            <button
              onClick={() => disconnect()}
              className="text-xs text-red-400 underline"
            >
              {error} — disconnect & retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
