'use client';

import Link from 'next/link';
import { useState } from 'react';

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
    { value: 'TWITTER_FOLLOW', label: '🐦 Twitter Follow', placeholder: 'e.g. web3cash' },
    { value: 'DISCORD_JOIN', label: '💬 Discord Join', placeholder: 'e.g. discord.gg/web3cash' },
    { value: 'GITHUB_STAR', label: '⭐ GitHub Star', placeholder: 'e.g. owner/repo' },
    { value: 'VISIT', label: '🌐 Website Visit', placeholder: 'e.g. https://yoursite.com' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }

    setStatus('submitting');
    setError('');

    try {
      // Create campaign
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
        throw new Error(body.error ?? 'Failed to create campaign');
      }
      const newCampaign = await campaignRes.json();

      // Build requirements object from quest type
      const selectedType = QUEST_TYPES.find((t) => t.value === quest.type);
      let requirements: Record<string, string> = {};
      if (quest.type === 'TWITTER_FOLLOW') requirements = { targetHandle: quest.requirements };
      else if (quest.type === 'DISCORD_JOIN') requirements = { inviteUrl: quest.requirements };
      else if (quest.type === 'GITHUB_STAR') {
        const parts = quest.requirements.split('/');
        requirements = { owner: parts[0] ?? '', repo: parts[1] ?? '' };
      } else if (quest.type === 'VISIT') requirements = { url: quest.requirements };

      // Create quest
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
      <div className="min-h-screen bg-black">
        <nav className="border-b border-yellow-900/20 bg-black/50 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600" />
              <span className="text-xl font-bold text-yellow-400">Web3Cash</span>
            </Link>
          </div>
        </nav>
        <main className="flex min-h-[80vh] items-center justify-center px-6">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 text-4xl">
              🎉
            </div>
            <h1 className="mt-6 text-3xl font-bold text-yellow-400">Campaign Created!</h1>
            <p className="mt-3 text-neutral-400">
              Your campaign <span className="font-semibold text-yellow-400">{result.name}</span> is live.
              Quest completers can now earn USDC by completing your quests.
            </p>
            <div className="mt-8 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-left">
              <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Campaign ID</p>
              <p className="mt-1 break-all font-mono text-sm text-yellow-400">{result.id}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/quests"
                className="block rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 text-center text-sm font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500"
              >
                View Live Quests →
              </Link>
              <Link
                href="/console"
                className="block rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-3 text-center text-sm font-medium text-yellow-400 transition hover:bg-yellow-500/20"
              >
                Go to Console
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <nav className="border-b border-yellow-900/20 bg-black/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600" />
              <span className="text-xl font-bold text-yellow-400">Web3Cash</span>
            </Link>
            <Link href="/quests" className="text-sm text-neutral-400 hover:text-yellow-400 transition">
              Browse Quests
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-6 py-16">
        {/* Step indicators */}
        <div className="flex items-center gap-4 justify-center mb-10">
          <div className={`flex items-center gap-2`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= 1 ? 'bg-yellow-500 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
              1
            </div>
            <span className={`text-sm font-medium ${step >= 1 ? 'text-yellow-400' : 'text-neutral-500'}`}>Campaign</span>
          </div>
          <div className={`h-px w-12 ${step >= 2 ? 'bg-yellow-500' : 'bg-neutral-800'}`} />
          <div className={`flex items-center gap-2`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= 2 ? 'bg-yellow-500 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
              2
            </div>
            <span className={`text-sm font-medium ${step >= 2 ? 'text-yellow-400' : 'text-neutral-500'}`}>Quest</span>
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent p-8">
          <h1 className="text-2xl font-bold text-yellow-400">
            {step === 1 ? '🚀 Create Campaign' : '✨ Add Quest'}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {step === 1
              ? 'Set up your campaign details and budget allocation.'
              : 'Define what action users need to complete to earn USDC.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-300">Campaign Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Web3Cash Launch — Social Proof"
                    value={campaign.name}
                    onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-yellow-500/20 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300">
                    Total Budget <span className="text-yellow-400">(USDC)</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={campaign.budgetUsdc}
                    onChange={(e) => setCampaign({ ...campaign, budgetUsdc: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-yellow-500/20 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30"
                  />
                  <p className="mt-1.5 text-xs text-neutral-500">
                    Fund this campaign on-chain via the smart contract after creation.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300">End Date <span className="text-neutral-500">(optional)</span></label>
                  <input
                    type="datetime-local"
                    value={campaign.endsAt}
                    onChange={(e) => setCampaign({ ...campaign, endsAt: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-yellow-500/20 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-300">Quest Type</label>
                  <select
                    value={quest.type}
                    onChange={(e) => setQuest({ ...quest, type: e.target.value, requirements: '' })}
                    className="mt-2 w-full rounded-xl border border-yellow-500/20 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30"
                  >
                    {QUEST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300">Quest Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Follow @web3cash on Twitter"
                    value={quest.title}
                    onChange={(e) => setQuest({ ...quest, title: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-yellow-500/20 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300">Description <span className="text-neutral-500">(optional)</span></label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Follow our official account to earn $1 USDC."
                    value={quest.description}
                    onChange={(e) => setQuest({ ...quest, description: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-yellow-500/20 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300">
                    {QUEST_TYPES.find((t) => t.value === quest.type)?.label.split(' ').slice(1).join(' ')} Target
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={QUEST_TYPES.find((t) => t.value === quest.type)?.placeholder}
                    value={quest.requirements}
                    onChange={(e) => setQuest({ ...quest, requirements: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-yellow-500/20 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300">
                      Reward per completion <span className="text-yellow-400">(USDC)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 1.00"
                      value={quest.rewardUsdc}
                      onChange={(e) => setQuest({ ...quest, rewardUsdc: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-yellow-500/20 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300">Max completions</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 500"
                      value={quest.maxCompletions}
                      onChange={(e) => setQuest({ ...quest, maxCompletions: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-yellow-500/20 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30"
                    />
                  </div>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
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
                  className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-3 text-sm font-medium text-yellow-400 transition hover:bg-yellow-500/20"
                >
                  ← Back
                </button>
              )}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 text-sm font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-60"
              >
                {status === 'submitting'
                  ? '⏳ Creating...'
                  : step === 1
                  ? 'Next: Add Quest →'
                  : '🚀 Launch Campaign'}
              </button>
            </div>
          </form>
        </div>

        {/* Info box */}
        <div className="mt-8 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6">
          <h3 className="text-sm font-semibold text-yellow-400">💡 How Campaign Funding Works</h3>
          <ol className="mt-3 space-y-2 text-sm text-neutral-400">
            <li className="flex gap-2"><span className="text-yellow-400 font-bold">1.</span> Create your campaign here (stored in DB)</li>
            <li className="flex gap-2"><span className="text-yellow-400 font-bold">2.</span> Approve USDC spend on the smart contract</li>
            <li className="flex gap-2"><span className="text-yellow-400 font-bold">3.</span> Call <code className="rounded bg-neutral-800 px-1 py-0.5 text-yellow-400">escrow.createCampaign()</code> to lock funds on-chain</li>
            <li className="flex gap-2"><span className="text-yellow-400 font-bold">4.</span> Users complete quests → smart contract pays them instantly</li>
          </ol>
          <a
            href="https://sepolia.etherscan.io/address/0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-yellow-400 hover:underline"
          >
            🔗 View Escrow Contract on Etherscan
          </a>
        </div>
      </main>
    </div>
  );
}
