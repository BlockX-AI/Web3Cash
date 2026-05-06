'use client';

import Link from 'next/link';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

const inputClass = 'mt-2 w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-colors';

export default function CreatePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [campaign, setCampaign] = useState({ name: '', budgetUsdc: '', endsAt: '' });
  const [quest, setQuest] = useState({
    type: 'TWITTER_FOLLOW',
    title: '',
    description: '',
    rewardUsdc: '',
    maxCompletions: '',
    requirements: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState('');

  const QUEST_TYPES = [
    { value: 'TWITTER_FOLLOW', label: 'Twitter Follow', placeholder: 'e.g. web3cash' },
    { value: 'DISCORD_JOIN', label: 'Discord Join', placeholder: 'e.g. discord.gg/web3cash' },
    { value: 'GITHUB_STAR', label: 'GitHub Star', placeholder: 'e.g. owner/repo or https://github.com/owner/repo' },
    { value: 'VISIT', label: 'Website Visit', placeholder: 'e.g. https://yoursite.com' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }

    setStatus('submitting');
    setError('');

    try {
      const campaignRes = await fetch('/api/console/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaign.name,
          budgetUsdc: campaign.budgetUsdc,
          chainId: '11155111',
          endsAt: campaign.endsAt || null,
        }),
      });

      if (!campaignRes.ok) {
        const body = await campaignRes.json().catch(() => ({}));
        if (campaignRes.status === 401) {
          throw new Error('Please sign in with your wallet first. Go to the homepage to connect.');
        }
        throw new Error(body.error ?? 'Failed to create campaign');
      }
      const newCampaign = await campaignRes.json();

      let requirements: Record<string, string> = {};
      if (quest.type === 'TWITTER_FOLLOW') requirements = { targetHandle: quest.requirements };
      else if (quest.type === 'DISCORD_JOIN') requirements = { inviteUrl: quest.requirements };
      else if (quest.type === 'GITHUB_STAR') {
        // Handle both "owner/repo" and "https://github.com/owner/repo" formats
        let input = quest.requirements.trim();
        if (input.startsWith('http')) {
          // Extract owner/repo from URL
          const match = input.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
          if (match && match[1] && match[2]) {
            requirements = { owner: match[1], repo: match[2] };
          } else {
            requirements = { owner: '', repo: '' };
          }
        } else {
          // Parse as "owner/repo"
          const parts = input.split('/');
          requirements = { owner: parts[0] ?? '', repo: parts[1] ?? '' };
        }
      } else if (quest.type === 'VISIT') requirements = { url: quest.requirements };

      const questRes = await fetch(`/api/console/campaigns/${newCampaign.id}/quests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: quest.type,
          title: quest.title,
          description: quest.description,
          rewardUsdc: quest.rewardUsdc,
          maxCompletions: parseInt(quest.maxCompletions),
          minSybilScore: 0,
          requirements,
        }),
      });

      if (!questRes.ok) {
        const body = await questRes.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create quest');
      }

      setResult({ id: newCampaign.id, name: newCampaign.name });
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  if (status === 'done' && result) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center px-6 pt-28">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-4xl">
              ✓
            </div>
            <h1 className="mt-6 text-3xl font-medium tracking-tight">Campaign Created!</h1>
            <p className="mt-3 text-muted-foreground">
              Your campaign <span className="font-semibold text-foreground">{result.name}</span> is live.
              Quest completers can now earn USDC by completing your quests.
            </p>
            <div className="mt-8 rounded-xl bg-muted p-4 text-left">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Campaign ID</p>
              <p className="mt-1 break-all font-mono text-sm text-foreground">{result.id}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/quests"
                className="block rounded-xl bg-accent px-6 py-3 text-center text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20"
              >
                View Live Quests
              </Link>
              <Link
                href="/console"
                className="block rounded-xl bg-muted px-6 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
              >
                Go to Console
              </Link>
            </div>
          </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pb-20 pt-28">
        {/* Step indicators */}
        <div className="flex items-center gap-4 justify-center mb-10">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= 1 ? 'bg-accent text-black' : 'bg-muted text-muted-foreground'}`}>
              1
            </div>
            <span className={`text-sm font-medium ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>Campaign</span>
          </div>
          <div className={`h-px w-12 ${step >= 2 ? 'bg-accent' : 'bg-border'}`} />
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= 2 ? 'bg-accent text-black' : 'bg-muted text-muted-foreground'}`}>
              2
            </div>
            <span className={`text-sm font-medium ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>Quest</span>
          </div>
        </div>

        <div className="rounded-2xl bg-muted p-8">
          <h1 className="text-2xl font-medium tracking-tight">
            {step === 1 ? 'Create Campaign' : 'Add Quest'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 1
              ? 'Set up your campaign details and budget allocation.'
              : 'Define what action users need to complete to earn USDC.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium">Campaign Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Web3Cash Launch — Social Proof"
                    value={campaign.name}
                    onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Total Budget <span className="text-accent">(USDC)</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={campaign.budgetUsdc}
                    onChange={(e) => setCampaign({ ...campaign, budgetUsdc: e.target.value })}
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Fund this campaign on-chain via the smart contract after creation.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium">End Date <span className="text-muted-foreground">(optional)</span></label>
                  <input
                    type="datetime-local"
                    value={campaign.endsAt}
                    onChange={(e) => setCampaign({ ...campaign, endsAt: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium">Quest Type</label>
                  <select
                    value={quest.type}
                    onChange={(e) => setQuest({ ...quest, type: e.target.value, requirements: '' })}
                    className={inputClass}
                  >
                    {QUEST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Quest Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Follow @web3cash on Twitter"
                    value={quest.title}
                    onChange={(e) => setQuest({ ...quest, title: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Follow our official account to earn $1 USDC."
                    value={quest.description}
                    onChange={(e) => setQuest({ ...quest, description: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    {QUEST_TYPES.find((t) => t.value === quest.type)?.label.split(' ').slice(1).join(' ')} Target
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={QUEST_TYPES.find((t) => t.value === quest.type)?.placeholder}
                    value={quest.requirements}
                    onChange={(e) => setQuest({ ...quest, requirements: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">
                      Reward <span className="text-accent">(USDC)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 1.00"
                      value={quest.rewardUsdc}
                      onChange={(e) => setQuest({ ...quest, rewardUsdc: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Max completions</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 500"
                      value={quest.maxCompletions}
                      onChange={(e) => setQuest({ ...quest, maxCompletions: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                    {error}
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-3 pt-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="flex-1 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20 disabled:opacity-60"
              >
                {status === 'submitting'
                  ? 'Creating...'
                  : step === 1
                  ? 'Next: Add Quest'
                  : 'Launch Campaign'}
              </button>
            </div>
          </form>
        </div>

        {/* Info box */}
        <div className="mt-8 rounded-xl bg-muted p-6">
          <h3 className="text-sm font-semibold">How Campaign Funding Works</h3>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-accent font-bold">1.</span> Create your campaign here (stored in DB)</li>
            <li className="flex gap-2"><span className="text-accent font-bold">2.</span> Approve USDC spend on the smart contract</li>
            <li className="flex gap-2"><span className="text-accent font-bold">3.</span> Call <code className="rounded bg-background px-1 py-0.5 text-foreground">escrow.createCampaign()</code> to lock funds on-chain</li>
            <li className="flex gap-2"><span className="text-accent font-bold">4.</span> Users complete quests and the smart contract pays them</li>
          </ol>
          <a
            href="https://sepolia.etherscan.io/address/0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            View Escrow Contract on Etherscan
          </a>
        </div>
      </main>
  );
}
