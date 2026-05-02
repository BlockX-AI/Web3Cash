'use client';

import { useEffect, useState, useTransition } from 'react';

interface Quest {
  id: string;
  type: string;
  title: string;
  description: string | null;
  rewardUsdc: string;
  minSybilScore: number;
  slotsRemaining: number;
  maxCompletions: number;
  requirements: Record<string, unknown>;
  campaign: {
    id: string;
    name: string;
    budgetUsdc: string;
    spentUsdc: string;
    remainingUsdc: string;
    pricingModel: string;
    impressions: number;
    clicks: number;
    installs: number;
    leads: number;
    project: { name: string; verifiedBadge: boolean } | null;
  };
  userCompletion: { status: string; releaseAt: string | null } | null;
}

type ClaimState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; releaseAt: string }
  | { kind: 'err'; code: string; message?: string };

const ERR_COPY: Record<string, string> = {
  ALREADY_CLAIMED: 'You already claimed this quest.',
  BUDGET_EXHAUSTED: 'All slots taken. Try another quest.',
  SYBIL_TOO_LOW: 'Your Sybil score is below this quest’s threshold.',
  VERIFY_FAIL: 'Verification failed — requirement not met.',
  VERIFY_INVALID: 'Quest config is invalid. Please report.',
  VERIFY_RETRY: 'Rate-limited upstream. Try again in a minute.',
  QUEST_INACTIVE: 'This quest has ended.',
  CAMPAIGN_NOT_ACTIVE: 'This campaign is paused.',
  unauthorized: 'Please sign in first.',
};

export function QuestFeed({ readOnly = false }: { readOnly?: boolean } = {}) {
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [claim, setClaim] = useState<Record<string, ClaimState>>({});
  const [, startTransition] = useTransition();

  async function load() {
    const res = await fetch('/api/quests', { cache: 'no-store' });
    const data = await res.json();
    setQuests(data.quests ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onClaim(questId: string) {
    setClaim((s) => ({ ...s, [questId]: { kind: 'loading' } }));
    const res = await fetch(`/api/quests/${questId}/complete`, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setClaim((s) => ({
        ...s,
        [questId]: { kind: 'ok', releaseAt: body.releaseAt },
      }));
      startTransition(load);
    } else {
      setClaim((s) => ({
        ...s,
        [questId]: { kind: 'err', code: body.error ?? 'error', message: body.message },
      }));
    }
  }

  if (quests === null) {
    return (
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-8 text-center">
        <p className="text-neutral-400">Loading quests…</p>
      </div>
    );
  }
  if (quests.length === 0) {
    return (
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-8 text-center">
        <p className="text-neutral-400">No active quests right now. Check back soon!</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-6">
      {quests.map((q) => (
        <QuestCard
          key={q.id}
          quest={q}
          state={claim[q.id] ?? { kind: 'idle' }}
          onClaim={() => onClaim(q.id)}
          readOnly={readOnly}
        />
      ))}
    </ul>
  );
}

function QuestCard({
  quest,
  state,
  onClaim,
  readOnly,
}: {
  quest: Quest;
  state: ClaimState;
  onClaim: () => void;
  readOnly: boolean;
}) {
  const completed = quest.userCompletion;
  const disabled =
    state.kind === 'loading' ||
    !!completed ||
    quest.slotsRemaining <= 0;

  const budget = Number(quest.campaign.budgetUsdc);
  const spent = Number(quest.campaign.spentUsdc);
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  return (
    <li className="group relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent p-6 transition hover:border-yellow-500/40">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-yellow-500/5 blur-3xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-yellow-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-yellow-400">
              {quest.type.replace('_', ' ')}
            </span>
            {quest.campaign.project?.verifiedBadge && (
              <span
                title="Verified project"
                className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-yellow-400"
              >
                ✓ Verified
              </span>
            )}
          </div>
          <h3 className="mt-3 text-xl font-bold text-yellow-400">{quest.title}</h3>
          {quest.description && (
            <p className="mt-2 text-sm text-neutral-300">{quest.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">Reward:</span>
              <span className="font-bold text-yellow-400">${quest.rewardUsdc} USDC</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">Slots:</span>
              <span className="text-neutral-300">{quest.slotsRemaining}/{quest.maxCompletions}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">Min Score:</span>
              <span className="text-neutral-300">{quest.minSybilScore}</span>
            </div>
          </div>
          <div className="mt-4 max-w-md">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Campaign Budget</span>
              <span className="font-mono">
                ${quest.campaign.remainingUsdc} / ${quest.campaign.budgetUsdc} USDC
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600"
                style={{ width: `${100 - pct}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
              <span className="rounded-full bg-neutral-800 px-2 py-1">{quest.campaign.pricingModel}</span>
              {quest.campaign.impressions > 0 && <span>{quest.campaign.impressions.toLocaleString()}</span>}
              {quest.campaign.clicks > 0 && <span>{quest.campaign.clicks.toLocaleString()}</span>}
              {quest.campaign.installs > 0 && <span>{quest.campaign.installs.toLocaleString()}</span>}
              {quest.campaign.leads > 0 && <span>{quest.campaign.leads.toLocaleString()}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 md:min-w-[200px]">
          {completed ? (
            <CompletionBadge completion={completed} />
          ) : state.kind === 'ok' ? (
            <span className="text-xs text-yellow-400">
              Claimed! Releases {new Date(state.releaseAt).toLocaleString()}.
            </span>
          ) : state.kind === 'err' ? (
            <span className="text-xs text-red-400">
              {ERR_COPY[state.code] ?? state.code}
            </span>
          ) : null}
          {readOnly ? (
            <a
              href="/"
              className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 text-center text-sm font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500"
            >
              Sign in to claim
            </a>
          ) : (
            <button
              onClick={onClaim}
              disabled={disabled}
              className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 text-sm font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500 disabled:cursor-not-allowed disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500"
            >
              {state.kind === 'loading' ? 'Verifying…' : completed ? 'Done' : 'Claim Reward'}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function CompletionBadge({
  completion,
}: {
  completion: { status: string; releaseAt: string | null };
}) {
  const color =
    completion.status === 'VERIFIED' || completion.status === 'PAID'
      ? 'text-yellow-400'
      : completion.status === 'FAILED'
        ? 'text-red-400'
        : 'text-yellow-400';
  return (
    <span className={`rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium ${color}`}>
      {completion.status === 'VERIFIED' && '✓ '}
      {completion.status === 'PAID' && '💰 '}
      {completion.status}
      {completion.releaseAt && completion.status === 'HOLDING' && (
        <> · {new Date(completion.releaseAt).toLocaleString()}</>
      )}
    </span>
  );
}
