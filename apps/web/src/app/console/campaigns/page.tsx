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
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">Campaigns</h1>
          <p className="mt-1 text-sm text-neutral-400">Manage your quest campaigns and track their on-chain performance</p>
        </div>
        <Link
          href="/create"
          className="rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-5 py-2.5 text-sm font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500"
        >
          + New Campaign
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {campaigns.length === 0 ? (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-12 text-center">
            <p className="text-neutral-400">No campaigns yet. Create your first campaign to get started.</p>
            <Link
              href="/create"
              className="mt-4 inline-block rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-2.5 text-sm font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500"
            >
              Create First Campaign →
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
                className="block rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 transition hover:border-yellow-500/40 hover:bg-yellow-500/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-yellow-400">{campaign.name}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        campaign.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                        campaign.status === 'FUNDED' ? 'bg-yellow-500/20 text-yellow-400' :
                        campaign.status === 'ENDED' ? 'bg-neutral-700 text-neutral-400' :
                        'bg-neutral-800 text-neutral-400'
                      }`}>{campaign.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-6 text-sm">
                      <span className="text-neutral-500">Budget: <span className="font-medium text-yellow-400">${campaign.budgetUsdc.toString()} USDC</span></span>
                      <span className="text-neutral-500">Spent: <span className="font-medium text-neutral-300">${campaign.spentUsdc.toString()} USDC</span></span>
                      <span className="text-neutral-500">Quests: <span className="font-medium text-neutral-300">{campaign.quests.length}</span></span>
                      <span className="text-neutral-500">Completions: <span className="font-medium text-neutral-300">{totalCompletions}</span></span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 max-w-xs overflow-hidden rounded-full bg-neutral-800">
                        <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-neutral-500">{pct}% spent</span>
                    </div>
                  </div>
                  <span className="ml-4 text-neutral-500 text-lg">→</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
