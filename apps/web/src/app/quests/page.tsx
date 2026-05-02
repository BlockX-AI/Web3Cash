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
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
            Web3Cash · Quests
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Earn USDC</h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Live, funded campaigns. Rewards clear after a 72-hour anti-fraud
            hold. Min withdrawal threshold applies.
          </p>
        </div>
        {!signedIn && (
          <Link
            href="/"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Sign in
          </Link>
        )}
        {signedIn && (
          <Link
            href="/dashboard"
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900"
          >
            My dashboard
          </Link>
        )}
      </div>

      <section className="mt-10">
        <QuestFeed readOnly={!signedIn} />
      </section>

      <footer className="mt-16 border-t border-neutral-800 pt-6 font-mono text-xs text-neutral-600">
        Phase 2 · Quest loop
      </footer>
    </main>
  );
}
