import { verifySession } from '@web3cash/auth';
import { prisma } from '@web3cash/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QuestFeed } from '@/components/quest-feed';
import { TwitterLinkButton } from '@/components/twitter-link-button';
import { WithdrawCard } from '@/components/withdraw-card';
import { ReferralCard } from '@/components/referral-card';
import { PayoutHistory } from '@/components/payout-history';

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

  const twitter = user.socialIdentities.find((s) => s.platform === 'TWITTER');

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
        Web3Cash · Dashboard
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Welcome</h1>

      <div className="mt-8 grid grid-cols-1 gap-px bg-neutral-800 md:grid-cols-2">
        <Stat label="Wallet" value={`${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`} />
        <Stat label="Chain" value={`#${user.chainId}`} />
        <Stat label="Sybil score" value={`${user.sybilScore} / 100`} />
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

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Connected accounts</h2>
          <TwitterLinkButton linkedHandle={twitter?.platformHandle ?? null} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Quests</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Complete quests to earn USDC. Social rewards clear after a 72-hour hold.
        </p>
        <div className="mt-6">
          <QuestFeed />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Withdrawals</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Batched on-chain via Gnosis Safe. Confirmation typically within minutes
          of the next signed batch.
        </p>
        <div className="mt-6">
          <PayoutHistory />
        </div>
      </section>

      <form action="/api/auth/logout" method="POST" className="mt-12">
        <button className="text-xs text-neutral-400 underline" type="submit">
          Sign out
        </button>
      </form>
    </main>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-neutral-950 px-5 py-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        {label}
      </div>
      <div className={`mt-2 text-lg ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
