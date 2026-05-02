import { requireProjectAuth } from '@web3cash/auth/project-auth';
import { prisma } from '@web3cash/db';
import Link from 'next/link';

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
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your campaigns and track performance
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href="/console/campaigns/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            Create Campaign
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-semibold text-gray-900">{totalCampaigns}</div>
              </div>
            </div>
            <div className="mt-1">
              <p className="text-sm font-medium text-gray-500">Total Campaigns</p>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-semibold text-gray-900">{activeCampaigns}</div>
              </div>
            </div>
            <div className="mt-1">
              <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-semibold text-gray-900">{totalQuests}</div>
              </div>
            </div>
            <div className="mt-1">
              <p className="text-sm font-medium text-gray-500">Total Quests</p>
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
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Recent Campaigns</h2>
        <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {project.campaigns.slice(0, 5).map((campaign) => (
              <li key={campaign.id}>
                <Link href={`/console/campaigns/${campaign.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {campaign.name}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          campaign.status === 'FUNDED' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Budget: ${campaign.budgetUsdc.toString()} USDC
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          Spent: ${campaign.spentUsdc.toString()} USDC
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
