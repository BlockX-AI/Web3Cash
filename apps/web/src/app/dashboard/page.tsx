import Link from 'next/link';
import { verifySession } from '@web3cash/auth';
import { prisma } from '@web3cash/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QuestFeed } from '@/components/quest-feed';
import { DiscordLinkButton } from '@/components/discord-link-button';
import { GithubLinkButton } from '@/components/github-link-button';
import { WithdrawCard } from '@/components/withdraw-card';
import { ReferralCard } from '@/components/referral-card';
import { PayoutHistory } from '@/components/payout-history';
import { ProcessPipelineButton } from '@/components/process-pipeline-button';
import { TestEscrowButton } from '@/components/test-escrow-button';
import { SybilOverrideButton } from '@/components/sybil-override-button';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const token = cookies().get('w3c_session')?.value;
  if (!token) redirect('/');

  const claims = await verifySession(token);
  if (!claims) redirect('/');

  const user = await prisma.user.findUnique({
    where: { walletAddress: claims.sub },
    include: {
      socialIdentities: { select: { platform: true, platformHandle: true } },
    },
  });
  if (!user) redirect('/');

  const discord = user.socialIdentities.find((s) => s.platform === 'DISCORD');
  const github = user.socialIdentities.find((s) => s.platform === 'GITHUB');

  return (
    <div className="min-h-screen bg-black">
      <nav className="border-b border-yellow-900/20 bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600" />
              <span className="text-lg font-bold text-yellow-400">Web3Cash</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/quests" className="text-sm text-neutral-400 hover:text-yellow-400 transition">
                Quests
              </Link>
              <form action="/api/auth/logout" method="POST">
                <button className="text-xs text-neutral-400 hover:text-yellow-400 transition" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-yellow-500/70">
        Web3Cash · Dashboard
      </p>
      <h1 className="mt-3 text-4xl font-bold text-yellow-400">Welcome</h1>

      <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-yellow-500/20 bg-yellow-500/20 md:grid-cols-2">
        <Stat label="Wallet" value={`${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`} />
        <Stat label="Chain" value={`#${user.chainId}`} />
        <Stat label="Sybil score" value={`${user.sybilScore} / 100`} extra={<SybilOverrideButton currentScore={user.sybilScore} />} />
        <Stat label="KYC" value={user.kycStatus} />
        <Stat label="Pending USDC" value={user.pendingBalanceUsdc.toString()} />
        <Stat label="Total earned USDC" value={user.totalEarnedUsdc.toString()} />
        <Stat label="Referral code" value={user.referralCode} mono />
        <Stat label="Tier" value={user.tier} />
      </div>

      <section className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        <WithdrawCard
          pendingBalanceUsdc={user.pendingBalanceUsdc.toString()}
          kycStatus={user.kycStatus}
        />
        <ReferralCard />
      </section>

      <section className="mt-12 rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent p-6">
        <h2 className="text-xl font-bold text-yellow-400">Connected accounts</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Link your Discord & GitHub accounts to verify quest completions.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <DiscordLinkButton linkedHandle={discord?.platformHandle ?? null} />
          <GithubLinkButton linkedHandle={github?.platformHandle ?? null} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-yellow-400">Quests</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Complete quests to earn USDC. Social rewards clear after a 72-hour hold.
        </p>
        <div className="mt-6">
          <QuestFeed />
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <TestEscrowButton />
        <ProcessPipelineButton />
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-yellow-400">Withdrawals</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Paid on-chain via smart contract escrow. Transaction links shown below once complete.
        </p>
        <div className="mt-6">
          <PayoutHistory />
        </div>
      </section>
      </main>
    </div>
  );
}

function Stat({ label, value, mono, extra }: { label: string; value: string; mono?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="bg-black px-5 py-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-yellow-500/70">
        {label}
      </div>
      <div className={`mt-2 text-lg text-yellow-400 ${mono ? 'font-mono' : ''}`}>{value}</div>
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  );
}
