import { requireProjectAuth } from '@/lib/project-auth';
import { prisma } from '@web3cash/db';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
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

  const totalSpent = project.campaigns.reduce(
    (sum, c) => sum + parseFloat(c.spentUsdc.toString()),
    0
  );

  const totalCompletions = project.campaigns.reduce(
    (sum, c) => sum + c.quests.reduce((qSum, q) => qSum + q.completions.length, 0),
    0
  );

  const avgReward = totalCompletions > 0 ? totalSpent / totalCompletions : 0;

  const campaignStats = project.campaigns.map((campaign) => {
    const completions = campaign.quests.reduce((sum, q) => sum + q.completions.length, 0);
    return {
      id: campaign.id,
      name: campaign.name,
      budget: parseFloat(campaign.budgetUsdc.toString()),
      spent: parseFloat(campaign.spentUsdc.toString()),
      completions,
      questCount: campaign.quests.length,
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-28">
        <h1 className="text-3xl font-medium tracking-tight">Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track your campaign performance and spending
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-muted p-5">
            <div className="text-2xl font-medium">${totalSpent.toFixed(2)}</div>
            <p className="mt-1 text-sm text-muted-foreground">Total Spent (USDC)</p>
          </div>
          <div className="rounded-2xl bg-muted p-5">
            <div className="text-2xl font-medium">{totalCompletions}</div>
            <p className="mt-1 text-sm text-muted-foreground">Total Completions</p>
          </div>
          <div className="rounded-2xl bg-muted p-5">
            <div className="text-2xl font-medium">${avgReward.toFixed(2)}</div>
            <p className="mt-1 text-sm text-muted-foreground">Avg Reward per Completion</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-medium">Campaign Performance</h2>
          <div className="mt-4 overflow-hidden rounded-2xl">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="py-3.5 pl-5 pr-3 text-left text-sm font-medium">Campaign</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-medium">Budget</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-medium">Spent</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-medium">Quests</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-medium">Completions</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-medium">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaignStats.map((stat) => (
                  <tr key={stat.id} className="bg-muted/50">
                    <td className="whitespace-nowrap py-4 pl-5 pr-3 text-sm font-medium">{stat.name}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">${stat.budget.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">${stat.spent.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{stat.questCount}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{stat.completions}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                      {stat.budget > 0 ? ((stat.spent / stat.budget) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </main>
  );
}
