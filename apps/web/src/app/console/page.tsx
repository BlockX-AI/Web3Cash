import { requireProjectAuth } from '@/lib/project-auth';
import { prisma } from '@web3cash/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ConsolePage() {
  const session = await requireProjectAuth();

  const project = await prisma.project.findUnique({
    where: { id: session.projectId },
    include: {
      campaigns: {
        include: {
          quests: {
            include: {
              completions: {
                where: { status: 'VERIFIED' },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    return <div>Project not found</div>;
  }

  const totalCampaigns = project.campaigns.length;
  const activeCampaigns = project.campaigns.filter((c) => c.status === 'ACTIVE').length;
  const totalQuests = project.campaigns.reduce((sum, c) => sum + c.quests.length, 0);
  const totalCompletions = project.campaigns.reduce(
    (sum, c) => sum + c.quests.reduce((qSum, q) => qSum + q.completions.length, 0),
    0
  );

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-28">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">{project.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your campaigns and track on-chain performance</p>
          </div>
          <Link
            href="/create"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20"
          >
            + New Campaign
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Campaigns', value: totalCampaigns },
            { label: 'Active Campaigns', value: activeCampaigns },
            { label: 'Total Quests', value: totalQuests },
            { label: 'Completions', value: totalCompletions },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-muted p-5">
              <div className="text-3xl font-medium tracking-tight">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Contract Info */}
        <div className="mt-8 rounded-2xl bg-muted p-6">
          <h2 className="text-sm font-semibold">On-Chain Escrow Contract</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Escrow Address</p>
              <a
                href="https://sepolia.etherscan.io/address/0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block font-mono text-xs text-accent hover:underline"
              >
                0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7
              </a>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Registry Address</p>
              <a
                href="https://sepolia.etherscan.io/address/0x745006c263B74dF940F9571B16ef78edEAd9811A"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block font-mono text-xs text-accent hover:underline"
              >
                0x745006c263B74dF940F9571B16ef78edEAd9811A
              </a>
            </div>
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent Campaigns</h2>
            <Link href="/console/campaigns" className="text-sm text-muted-foreground hover:text-foreground transition">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {project.campaigns.length === 0 ? (
              <div className="rounded-2xl bg-muted p-8 text-center">
                <p className="text-muted-foreground">No campaigns yet.</p>
                <Link
                  href="/create"
                  className="mt-4 inline-block rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20"
                >
                  Create First Campaign
                </Link>
              </div>
            ) : (
              project.campaigns.slice(0, 5).map((campaign) => {
                const spent = Number(campaign.spentUsdc);
                const budget = Number(campaign.budgetUsdc);
                const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
                return (
                  <Link
                    key={campaign.id}
                    href={`/console/campaigns/${campaign.id}`}
                    className="flex items-center justify-between rounded-2xl bg-muted p-5 transition-colors hover:bg-muted/80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{campaign.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          campaign.status === 'ACTIVE' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                          campaign.status === 'FUNDED' ? 'bg-accent/20 text-accent' :
                          'bg-foreground/5 text-muted-foreground'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>Budget: <span className="text-foreground">${campaign.budgetUsdc.toString()} USDC</span></span>
                        <span>Spent: <span className="text-foreground">${campaign.spentUsdc.toString()} USDC</span></span>
                        <span>Quests: <span className="text-foreground">{campaign.quests.length}</span></span>
                      </div>
                      <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-border">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="ml-4 text-muted-foreground">→</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
    </main>
  );
}
