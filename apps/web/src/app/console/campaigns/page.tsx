import { requireProjectAuth } from '@/lib/project-auth';
import { prisma } from '@web3cash/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const session = await requireProjectAuth();

  const campaigns = await prisma.campaign.findMany({
    where: { projectId: session.projectId },
    include: {
      quests: {
        select: {
          id: true,
          completionsCount: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-28">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">Campaigns</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your quest campaigns and track their on-chain performance</p>
          </div>
          <Link
            href="/create"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20"
          >
            + New Campaign
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          {campaigns.length === 0 ? (
            <div className="rounded-2xl bg-muted p-12 text-center">
              <p className="text-muted-foreground">No campaigns yet. Create your first campaign to get started.</p>
              <Link
                href="/create"
                className="mt-4 inline-block rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20"
              >
                Create First Campaign
              </Link>
            </div>
          ) : (
            campaigns.map((campaign) => {
              const spent = Number(campaign.spentUsdc);
              const budget = Number(campaign.budgetUsdc);
              const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
              const totalCompletions = campaign.quests.reduce((s, q) => s + q.completionsCount, 0);
              return (
                <Link
                  key={campaign.id}
                  href={`/console/campaigns/${campaign.id}`}
                  className="block rounded-2xl bg-muted p-6 transition-colors hover:bg-muted/80"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium">{campaign.name}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          campaign.status === 'ACTIVE' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                          campaign.status === 'FUNDED' ? 'bg-accent/20 text-accent' :
                          'bg-foreground/5 text-muted-foreground'
                        }`}>{campaign.status}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-6 text-sm">
                        <span className="text-muted-foreground">Budget: <span className="font-medium text-foreground">${campaign.budgetUsdc.toString()} USDC</span></span>
                        <span className="text-muted-foreground">Spent: <span className="font-medium text-foreground">${campaign.spentUsdc.toString()} USDC</span></span>
                        <span className="text-muted-foreground">Quests: <span className="font-medium text-foreground">{campaign.quests.length}</span></span>
                        <span className="text-muted-foreground">Completions: <span className="font-medium text-foreground">{totalCompletions}</span></span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-2 flex-1 max-w-xs overflow-hidden rounded-full bg-border">
                          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}% spent</span>
                      </div>
                    </div>
                    <span className="ml-4 text-muted-foreground text-lg">→</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
    </main>
  );
}
