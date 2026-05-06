import { verifySession } from '@web3cash/auth';
import { prisma } from '@web3cash/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QuestFeed } from '@/components/quest-feed';
import { DiscordLinkButton } from '@/components/discord-link-button';
import { GithubLinkButton } from '@/components/github-link-button';
import { TwitterLinkButton } from '@/components/twitter-link-button';
import { WithdrawCard } from '@/components/withdraw-card';
import { ReferralCard } from '@/components/referral-card';
import { PayoutHistory } from '@/components/payout-history';
import { ProcessPipelineButton } from '@/components/process-pipeline-button';
import { TestEscrowButton } from '@/components/test-escrow-button';
import { SybilOverrideButton } from '@/components/sybil-override-button';
import { EscrowBalanceCard } from '@/components/escrow-balance-card';
import { WalletBalanceCard } from '@/components/wallet-balance-card';

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
  const twitter = user.socialIdentities.find((s) => s.platform === 'TWITTER');

  return (
    <main className="mx-auto max-w-4xl px-6 pb-20 pt-28">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Web3Cash · Dashboard
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight">Welcome</h1>

        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-border md:grid-cols-2">
          <Stat label="Wallet" value={`${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`} />
          <Stat label="Chain" value={`#${user.chainId}`} />
          <Stat label="Sybil score" value={`${user.sybilScore} / 100`} extra={<SybilOverrideButton currentScore={user.sybilScore} />} />
          <Stat label="KYC" value={user.kycStatus} />
          <Stat label="Pending USDC" value={user.pendingBalanceUsdc.toString()} />
          <Stat label="Total earned USDC" value={user.totalEarnedUsdc.toString()} />
          <Stat label="Referral code" value={user.referralCode} mono />
          <Stat label="Tier" value={user.tier} />
        </div>

        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <WalletBalanceCard />
          <EscrowBalanceCard />
        </section>

        <section className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <WithdrawCard
            pendingBalanceUsdc={user.pendingBalanceUsdc.toString()}
            kycStatus={user.kycStatus}
          />
          <ReferralCard />
        </section>

        <section className="mt-12 rounded-2xl bg-muted p-6">
          <h2 className="text-xl font-medium">Connected accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Link your Twitter, Discord & GitHub accounts to verify quest completions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <TwitterLinkButton linkedHandle={twitter?.platformHandle ?? null} />
            <DiscordLinkButton linkedHandle={discord?.platformHandle ?? null} />
            <GithubLinkButton linkedHandle={github?.platformHandle ?? null} />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-medium">Quests</h2>
          <p className="mt-1 text-sm text-muted-foreground">
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
          <h2 className="text-xl font-medium">Withdrawals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paid on-chain via smart contract escrow. Transaction links shown below once complete.
          </p>
          <div className="mt-6">
            <PayoutHistory />
          </div>
        </section>
    </main>
  );
}

function Stat({ label, value, mono, extra }: { label: string; value: string; mono?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="bg-background px-5 py-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-2 text-lg text-foreground ${mono ? 'font-mono' : ''}`}>{value}</div>
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  );
}
