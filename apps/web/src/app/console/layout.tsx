import { redirect } from 'next/navigation';
import { getProjectSession } from '@/lib/project-auth';
import Link from 'next/link';

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getProjectSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black">
      <nav className="border-b border-yellow-900/20 bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600" />
                <span className="text-lg font-bold text-yellow-400">Web3Cash</span>
                <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-500">Console</span>
              </Link>
              <div className="hidden sm:flex sm:gap-6">
                <Link href="/console" className="text-sm text-neutral-400 transition hover:text-yellow-400">
                  Overview
                </Link>
                <Link href="/console/campaigns" className="text-sm text-neutral-400 transition hover:text-yellow-400">
                  Campaigns
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/create"
                className="rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-2 text-xs font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500"
              >
                + New Campaign
              </Link>
              <span className="rounded-full border border-yellow-500/20 bg-yellow-500/5 px-3 py-1.5 font-mono text-xs text-neutral-400">
                {session.walletAddress.slice(0, 6)}…{session.walletAddress.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
