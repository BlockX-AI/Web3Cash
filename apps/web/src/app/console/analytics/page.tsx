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
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track your campaign performance and spending
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-semibold text-gray-900">
                  ${totalSpent.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="mt-1">
              <p className="text-sm font-medium text-gray-500">Total Spent (USDC)</p>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-semibold text-gray-900">{totalCompletions}</div>
              </div>
            </div>
            <div className="mt-1">
              <p className="text-sm font-medium text-gray-500">Total Completions</p>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-semibold text-gray-900">
                  ${avgReward.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="mt-1">
              <p className="text-sm font-medium text-gray-500">Avg Reward per Completion</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Campaign Performance</h2>
        <div className="mt-4 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Campaign
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Budget
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Spent
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Quests
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Completions
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Utilization
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {campaignStats.map((stat) => (
                      <tr key={stat.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {stat.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          ${stat.budget.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          ${stat.spent.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {stat.questCount}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {stat.completions}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {stat.budget > 0 ? ((stat.spent / stat.budget) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
