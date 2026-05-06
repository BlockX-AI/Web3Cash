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
  VERIFY_FAIL: 'Verification failed — complete the action first, then link your account on the Dashboard.',
  VERIFY_INVALID: 'Quest config is invalid. Please report.',
  VERIFY_RETRY: 'Rate-limited upstream. Try again in a minute.',
  QUEST_INACTIVE: 'This quest has ended.',
  CAMPAIGN_NOT_ACTIVE: 'This campaign is paused.',
  unauthorized: 'Please sign in first.',
};

function questActionLabel(quest: Quest): { text: string; href: string } | null {
  const req = quest.requirements;
  if (quest.type === 'TWITTER_FOLLOW' && typeof req.targetHandle === 'string') {
    return { text: `Follow @${req.targetHandle}`, href: `https://x.com/${req.targetHandle}` };
  }
  if (quest.type === 'DISCORD_JOIN') {
    const url = typeof req.inviteUrl === 'string' ? req.inviteUrl : '#';
    return { text: 'Join Discord Server', href: url };
  }
  if (quest.type === 'GITHUB_STAR' && typeof req.owner === 'string' && typeof req.repo === 'string') {
    return { text: `Star ${req.owner}/${req.repo}`, href: `https://github.com/${req.owner}/${req.repo}` };
  }
  return null;
}

function questLinkAccountHref(quest: Quest): { text: string; href: string } | null {
  if (quest.type === 'TWITTER_FOLLOW') return { text: 'Link Twitter', href: '/api/oauth/twitter/start?returnTo=/quests' };
  if (quest.type === 'DISCORD_JOIN') return { text: 'Link Discord', href: '/api/oauth/discord/start?returnTo=/quests' };
  if (quest.type === 'GITHUB_STAR') return { text: 'Link GitHub', href: '/api/oauth/github/start?returnTo=/quests' };
  return null;
}

export function QuestFeed({ readOnly = false }: { readOnly?: boolean } = {}) {
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [claim, setClaim] = useState<Record<string, ClaimState>>({});
  const [, startTransition] = useTransition();

  async function load() {
    try {
      const res = await fetch('/api/quests', { cache: 'no-store' });
      if (!res.ok) { setQuests([]); return; }
      const data = await res.json();
      setQuests(data.quests ?? []);
    } catch {
      setQuests([]);
    }
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
      <div className="rounded-2xl bg-muted p-8 text-center">
        <p className="text-muted-foreground">Loading quests…</p>
      </div>
    );
  }
  if (quests.length === 0) {
    return (
      <div className="rounded-2xl bg-muted p-8 text-center">
        <p className="text-muted-foreground">No active quests right now. Check back soon!</p>
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
    <li className="group relative overflow-hidden rounded-2xl bg-muted p-6 transition-colors duration-300 hover:bg-muted/80">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-foreground/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {quest.type.replace('_', ' ')}
            </span>
            {quest.campaign.project?.verifiedBadge && (
              <span
                title="Verified project"
                className="rounded-full border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-accent"
              >
                ✓ Verified
              </span>
            )}
          </div>
          <h3 className="mt-3 text-xl font-medium tracking-tight">{quest.title}</h3>
          {quest.description && (
            <p className="mt-2 text-sm text-muted-foreground">{quest.description}</p>
          )}
          {(() => {
            const action = questActionLabel(quest);
            const link = questLinkAccountHref(quest);
            if (!action && !link) return null;
            return (
              <div className="mt-3 flex flex-wrap gap-2">
                {action && (
                  <a
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                  >
                    {quest.type === 'TWITTER_FOLLOW' && '𝕏 '}
                    {quest.type === 'DISCORD_JOIN' && '💬 '}
                    {quest.type === 'GITHUB_STAR' && '⭐ '}
                    {action.text} ↗
                  </a>
                )}
                {link && !completed && (
                  <a
                    href={link.href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    🔗 {link.text}
                  </a>
                )}
              </div>
            );
          })()}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Reward:</span>
              <span className="font-semibold text-accent">${quest.rewardUsdc} USDC</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Slots:</span>
              <span>{quest.slotsRemaining}/{quest.maxCompletions}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Min Score:</span>
              <span>{quest.minSybilScore}</span>
            </div>
          </div>
          <div className="mt-4 max-w-md">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Campaign Budget</span>
              <span className="font-mono">
                ${quest.campaign.remainingUsdc} / ${quest.campaign.budgetUsdc} USDC
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${100 - pct}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="rounded-full bg-foreground/5 px-2 py-1">{quest.campaign.pricingModel}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 md:min-w-[200px]">
          {completed ? (
            <CompletionBadge completion={completed} />
          ) : state.kind === 'ok' ? (
            <span className="text-xs text-accent">
              Claimed! Releases {new Date(state.releaseAt).toLocaleString()}.
            </span>
          ) : state.kind === 'err' ? (
            <span className="text-xs text-red-500">
              {ERR_COPY[state.code] ?? state.code}
            </span>
          ) : null}
          {readOnly ? (
            <a
              href="/"
              className="w-full rounded-xl bg-accent px-6 py-3 text-center text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20"
            >
              Sign in to claim
            </a>
          ) : (
            <button
              onClick={onClaim}
              disabled={disabled}
              className="w-full rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
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
      ? 'text-accent'
      : completion.status === 'FAILED'
        ? 'text-red-500'
        : 'text-accent';
  return (
    <span className={`rounded-full bg-accent/10 px-3 py-1 text-xs font-medium ${color}`}>
      {completion.status === 'VERIFIED' && '✓ '}
      {completion.status === 'PAID' && '💰 '}
      {completion.status}
      {completion.releaseAt && completion.status === 'HOLDING' && (
        <> · {new Date(completion.releaseAt).toLocaleString()}</>
      )}
    </span>
  );
}
