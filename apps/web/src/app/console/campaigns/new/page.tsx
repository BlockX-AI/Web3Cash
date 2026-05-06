import { CampaignForm } from '@/components/campaign-form';

export const dynamic = 'force-dynamic';

export default function NewCampaignPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-28">
      <h2 className="text-3xl font-medium tracking-tight">
        Create New Campaign
      </h2>
      <div className="mt-8 rounded-2xl bg-muted p-6">
        <CampaignForm />
      </div>
    </main>
  );
}
