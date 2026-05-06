'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CampaignForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    budgetUsdc: '',
    chainId: '1',
    startsAt: '',
    endsAt: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/console/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }

      const campaign = await response.json();
      router.push(`/console/campaigns/${campaign.id}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Campaign Name
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="budgetUsdc" className="block text-sm font-medium">
          Budget <span className="text-accent">(USDC)</span>
        </label>
        <input
          type="number"
          id="budgetUsdc"
          required
          min="0"
          step="0.01"
          value={formData.budgetUsdc}
          onChange={(e) => setFormData({ ...formData, budgetUsdc: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="chainId" className="block text-sm font-medium">
          Chain
        </label>
        <select
          id="chainId"
          value={formData.chainId}
          onChange={(e) => setFormData({ ...formData, chainId: e.target.value })}
          className={inputClass}
        >
          <option value="1">Ethereum Mainnet</option>
          <option value="137">Polygon</option>
          <option value="42161">Arbitrum</option>
          <option value="10">Optimism</option>
          <option value="8453">Base</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="startsAt" className="block text-sm font-medium">
            Start Date <span className="text-muted-foreground">(Optional)</span>
          </label>
          <input
            type="datetime-local"
            id="startsAt"
            value={formData.startsAt}
            onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="endsAt" className="block text-sm font-medium">
            End Date <span className="text-muted-foreground">(Optional)</span>
          </label>
          <input
            type="datetime-local"
            id="endsAt"
            value={formData.endsAt}
            onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}
