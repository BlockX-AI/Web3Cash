import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifySession } from '@web3cash/auth';
import { QuestFeed } from '@/components/quest-feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public quest browser. Anyone can land here from a share link, see live
 * quests + rewards + remaining budget, and decide whether to sign in.
 *
 * Authenticated users get the full claim flow; everyone else sees a
 * "Sign in to claim" CTA on each card (readOnly mode).
 */
export default async function QuestsPage() {
  const token = cookies().get('w3c_session')?.value;
  const claims = token ? await verifySession(token) : null;
  const signedIn = !!claims;

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="border-b border-yellow-900/20 bg-black/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600" />
              <span className="text-xl font-bold text-yellow-400">Web3Cash</span>
            </Link>
            <div className="flex items-center gap-4">
              {!signedIn ? (
                <Link
                  href="/"
                  className="rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-2 text-sm font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500"
                >
                  Sign in
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-400 transition hover:bg-yellow-500/20"
                >
                  My Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <div className="inline-block rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-1.5 text-xs font-medium text-yellow-400">
            💰 Active Quests
          </div>
          <h1 className="mt-6 bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-5xl font-bold text-transparent">
            Earn USDC
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-400">
            Complete quests and get paid instantly via smart contract. All campaigns are funded on-chain with transparent budgets.
          </p>
        </div>

        <section className="mt-12">
          <QuestFeed readOnly={!signedIn} />
        </section>
      </main>

      <footer className="border-t border-yellow-900/20 bg-black/50 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-neutral-500">
            Powered by Smart Contracts · All payments on-chain
          </p>
        </div>
      </footer>
    </div>
  );
}
