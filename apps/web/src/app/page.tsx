import Link from 'next/link';
import { SignInButton } from '@/components/sign-in-button';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
          Web3Cash
        </p>
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
          Real money for real Web3 actions.
        </h1>
        <p className="max-w-xl text-neutral-400">
          Connect your wallet, sign in, and start earning USDC for verified
          on-chain and social actions. No gas to sign in. Rewards clear after a
          72-hour anti-fraud hold.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SignInButton />
        <Link
          href="/quests"
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900"
        >
          Browse quests →
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-3 text-sm text-neutral-400 sm:grid-cols-3">
        <li className="border border-neutral-800 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            Verified
          </p>
          <p className="mt-1 text-neutral-200">Quests are scored by Sybil signals + 72h hold.</p>
        </li>
        <li className="border border-neutral-800 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            Funded
          </p>
          <p className="mt-1 text-neutral-200">
            Every campaign has on-chain budget. Live remaining shown per quest.
          </p>
        </li>
        <li className="border border-neutral-800 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            Cashable
          </p>
          <p className="mt-1 text-neutral-200">
            Withdraw USDC via Gnosis Safe (Phase 6: escrow contracts).
          </p>
        </li>
      </ul>

      <footer className="mt-12 border-t border-neutral-800 pt-6 font-mono text-xs text-neutral-600">
        v0.1.0 · Phase 2: Quest loop · <Link href="/quests" className="underline hover:text-neutral-400">Browse quests</Link>
      </footer>
    </main>
  );
}
