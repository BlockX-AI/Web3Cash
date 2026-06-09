import React, { useState } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { waitlistApi } from './api';

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
  prefillWallet?: string;
}

export function WaitlistModal({ open, onClose, prefillWallet }: WaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [wallet, setWallet] = useState(prefillWallet ?? '');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email && !wallet) {
      setError('Enter your email or wallet address.');
      return;
    }
    setLoading(true);
    try {
      await waitlistApi.join({ email: email || undefined, walletAddress: wallet || undefined });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:text-black"
        >
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle className="h-12 w-12 text-[#564c8c]" />
            <h2 className="text-2xl font-semibold text-black">You're on the list!</h2>
            <p className="text-gray-500">We'll reach out when your spot is ready.</p>
            <button
              onClick={onClose}
              className="mt-2 rounded-full bg-black px-8 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-2xl font-semibold text-black">Join the Waitlist</h2>
            <p className="mb-6 text-sm text-gray-500">
              Be the first to earn real USDC from Web3 quests.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#564c8c] focus:ring-2 focus:ring-[#564c8c]/20"
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="h-px flex-1 bg-gray-200" />
                or
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Wallet address
                </label>
                <input
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-mono outline-none focus:border-[#564c8c] focus:ring-2 focus:ring-[#564c8c]/20"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-full bg-black px-8 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Join Waitlist
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
