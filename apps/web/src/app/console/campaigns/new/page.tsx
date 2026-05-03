import { CampaignForm } from '@/components/campaign-form';

export const dynamic = 'force-dynamic';

export default function NewCampaignPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Create New Campaign
          </h2>
        </div>
      </div>

      <div className="mt-8 max-w-3xl">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <CampaignForm />
          </div>
        </div>
      </div>
    </div>
  );
}
