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
  campaign: { id: string; name: string };
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

export function QuestFeed() {
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
    return <p className="text-sm text-neutral-500">Loading quests…</p>;
  }
  if (quests.length === 0) {
    return <p className="text-sm text-neutral-500">No active quests right now.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-800 border border-neutral-800">
      {quests.map((q) => (
        <QuestCard
          key={q.id}
          quest={q}
          state={claim[q.id] ?? { kind: 'idle' }}
          onClaim={() => onClaim(q.id)}
        />
      ))}
    </ul>
  );
}

function QuestCard({
  quest,
  state,
  onClaim,
}: {
  quest: Quest;
  state: ClaimState;
  onClaim: () => void;
}) {
  const completed = quest.userCompletion;
  const disabled =
    state.kind === 'loading' ||
    !!completed ||
    quest.slotsRemaining <= 0;

  return (
    <li className="flex flex-col gap-3 bg-neutral-950 p-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            {quest.type}
          </span>
          <span className="font-mono text-[10px] text-neutral-600">·</span>
          <span className="font-mono text-[10px] text-neutral-500">
            {quest.campaign.name}
          </span>
        </div>
        <h3 className="mt-1 text-base font-medium">{quest.title}</h3>
        {quest.description && (
          <p className="mt-1 text-sm text-neutral-400">{quest.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
          <span>
            Reward: <span className="text-neutral-200">${quest.rewardUsdc} USDC</span>
          </span>
          <span>
            Slots: {quest.slotsRemaining}/{quest.maxCompletions}
          </span>
          <span>Min sybil: {quest.minSybilScore}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {completed ? (
          <CompletionBadge completion={completed} />
        ) : state.kind === 'ok' ? (
          <span className="text-xs text-emerald-400">
            Claimed. Releases {new Date(state.releaseAt).toLocaleString()}.
          </span>
        ) : state.kind === 'err' ? (
          <span className="text-xs text-red-400">
            {ERR_COPY[state.code] ?? state.code}
          </span>
        ) : null}
        <button
          onClick={onClaim}
          disabled={disabled}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {state.kind === 'loading' ? 'Verifying…' : completed ? 'Done' : 'Claim'}
        </button>
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
      ? 'text-emerald-400'
      : completion.status === 'FAILED'
        ? 'text-red-400'
        : 'text-amber-400';
  return (
    <span className={`text-xs ${color}`}>
      {completion.status}
      {completion.releaseAt && completion.status === 'HOLDING' && (
        <> · releases {new Date(completion.releaseAt).toLocaleString()}</>
      )}
    </span>
  );
}
