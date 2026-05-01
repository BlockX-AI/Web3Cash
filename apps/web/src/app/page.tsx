import { SignInButton } from '@/components/sign-in-button';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
          Web3Cash · Phase 1
        </p>
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
          Real money for real Web3 actions.
        </h1>
        <p className="max-w-xl text-neutral-400">
          Connect your wallet, sign in, and start earning USDC for verified on-chain and social
          actions. No gas to sign in.
        </p>
      </header>

      <SignInButton />

      <footer className="mt-12 border-t border-neutral-800 pt-6 font-mono text-xs text-neutral-600">
        v0.1.0 · Phase 1: Foundation
      </footer>
    </main>
  );
}
