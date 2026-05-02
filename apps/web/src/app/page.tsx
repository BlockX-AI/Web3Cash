import Link from 'next/link';
import { SignInButton } from '@/components/sign-in-button';

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="border-b border-yellow-900/20 bg-black/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600" />
              <span className="text-xl font-bold text-yellow-400">Web3Cash</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/quests"
                className="text-sm text-neutral-400 transition hover:text-yellow-400"
              >
                Browse Quests
              </Link>
              <Link
                href="/create"
                className="text-sm text-neutral-400 transition hover:text-yellow-400"
              >
                Create Campaign
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <div className="inline-block rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-1.5 text-xs font-medium text-yellow-400">
            ⚡ Powered by Smart Contracts on Sepolia
          </div>
          <h1 className="mt-8 bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-6xl font-bold text-transparent md:text-7xl">
            Earn Real USDC
            <br />
            for Web3 Actions
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
            The first on-chain quest platform where projects pay users directly via smart contracts.
            No middlemen. No delays. Just instant USDC rewards.
          </p>
        </div>

        {/* Two User Types */}
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {/* Quest Completers */}
          <div className="group relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent p-8 transition hover:border-yellow-500/40">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-yellow-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 text-2xl">
                💰
              </div>
              <h2 className="mt-4 text-2xl font-bold text-yellow-400">
                For Quest Completers
              </h2>
              <p className="mt-2 text-neutral-400">
                Connect your wallet and start earning USDC by completing social and on-chain quests.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-yellow-400">✓</span>
                  <span className="text-sm text-neutral-300">Instant USDC payments via smart contract</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-yellow-400">✓</span>
                  <span className="text-sm text-neutral-300">No gas fees to claim rewards</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-yellow-400">✓</span>
                  <span className="text-sm text-neutral-300">Verified projects with live budgets</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-yellow-400">✓</span>
                  <span className="text-sm text-neutral-300">Sybil protection ensures fair rewards</span>
                </li>
              </ul>
              <div className="mt-8 flex flex-col gap-3">
                <SignInButton />
                <Link
                  href="/quests"
                  className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-3 text-center text-sm font-medium text-yellow-400 transition hover:bg-yellow-500/20"
                >
                  Browse Available Quests →
                </Link>
              </div>
            </div>
          </div>

          {/* Quest Creators */}
          <div className="group relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent p-8 transition hover:border-yellow-500/40">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-yellow-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 text-2xl">
                🚀
              </div>
              <h2 className="mt-4 text-2xl font-bold text-yellow-400">
                For Quest Creators
              </h2>
              <p className="mt-2 text-neutral-400">
                Launch campaigns and grow your Web3 project with verified users and real engagement.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-yellow-400">✓</span>
                  <span className="text-sm text-neutral-300">Create custom quests (Twitter, Discord, GitHub)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-yellow-400">✓</span>
                  <span className="text-sm text-neutral-300">Fund campaigns with USDC on-chain</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-yellow-400">✓</span>
                  <span className="text-sm text-neutral-300">Real-time analytics and metrics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-yellow-400">✓</span>
                  <span className="text-sm text-neutral-300">Transparent on-chain budget tracking</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link
                  href="/create"
                  className="block rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 text-center text-sm font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500"
                >
                  Create Your First Campaign →
                </Link>
                <Link
                  href="/console"
                  className="mt-3 block rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-3 text-center text-sm font-medium text-yellow-400 transition hover:bg-yellow-500/20"
                >
                  Access Console
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400">20 USDC</div>
            <div className="mt-1 text-sm text-neutral-400">Campaign Budget</div>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400">100%</div>
            <div className="mt-1 text-sm text-neutral-400">On-Chain</div>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400">$1</div>
            <div className="mt-1 text-sm text-neutral-400">Per Quest</div>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400">Instant</div>
            <div className="mt-1 text-sm text-neutral-400">Payouts</div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20">
          <h2 className="text-center text-3xl font-bold text-yellow-400">
            How It Works
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-2xl font-bold text-yellow-400">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold text-yellow-400">
                Connect Wallet
              </h3>
              <p className="mt-2 text-sm text-neutral-400">
                Sign in with your Ethereum wallet using SIWE. No gas fees required.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-2xl font-bold text-yellow-400">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold text-yellow-400">
                Complete Quests
              </h3>
              <p className="mt-2 text-sm text-neutral-400">
                Follow projects on Twitter, join Discord, star GitHub repos, and more.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-2xl font-bold text-yellow-400">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold text-yellow-400">
                Get Paid
              </h3>
              <p className="mt-2 text-sm text-neutral-400">
                Receive USDC instantly to your wallet via smart contract. Fully transparent.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-yellow-900/20 bg-black/50 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-neutral-500">
            v0.1.0 · Powered by Smart Contracts on Sepolia Testnet
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/quests" className="text-xs text-neutral-400 hover:text-yellow-400">
              Browse Quests
            </Link>
            <Link href="/create" className="text-xs text-neutral-400 hover:text-yellow-400">
              Create Campaign
            </Link>
            <a
              href="https://sepolia.etherscan.io/address/0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-400 hover:text-yellow-400"
            >
              View Contract
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
