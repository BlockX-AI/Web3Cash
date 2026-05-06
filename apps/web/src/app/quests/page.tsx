import { cookies } from 'next/headers';
import { verifySession } from '@web3cash/auth';
import { QuestFeed } from '@/components/quest-feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function QuestsPage() {
  const token = cookies().get('w3c_session')?.value;
  const claims = token ? await verifySession(token) : null;
  const signedIn = !!claims;

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-28">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Active Quests
          </span>
          <h1 className="mt-6 text-5xl font-medium tracking-tight">
            Earn USDC
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Complete quests and get paid instantly via smart contract. All campaigns are funded on-chain with transparent budgets.
          </p>
        </div>

        <section className="mt-12">
          <QuestFeed readOnly={!signedIn} />
        </section>
    </main>
  );
}
