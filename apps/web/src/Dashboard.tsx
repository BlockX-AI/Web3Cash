import React, { useCallback, useEffect, useState } from 'react';
import {
  Wallet, Zap, Trophy, Users, ArrowUpRight, Copy, CheckCircle2,
  XCircle, Clock, AlertTriangle, ExternalLink, RefreshCw,
  MessageSquare, Shield, TrendingUp, Gift, LogOut, Send,
} from 'lucide-react';

import { useAuth } from './WalletProvider';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  questsApi, userApi, oauthApi, kycApi,
  type Quest, type QuestCompletion, type SocialIdentity,
  type ReferralInfo, type Withdrawal,
} from './api';

const TwitterXIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GithubIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

const TelegramIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
);

/* ── helpers ─────────────────────────────────────────────────────────── */

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
function fmt(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtNum(n: string | number) {
  return parseFloat(String(n)).toFixed(2);
}

const STATUS_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  HOLDING:  { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  VERIFIED: { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Ready' },
  PAID:     { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Paid' },
  FAILED:   { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Failed' },
  PENDING:  { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Queued' },
};

const QUEST_TYPE_ICON: Record<string, React.ReactNode> = {
  TWITTER_FOLLOW:   <span className="h-4 w-4 text-sky-500 [&>svg]:h-4 [&>svg]:w-4"><TwitterXIcon /></span>,
  DISCORD_JOIN:     <MessageSquare className="h-4 w-4 text-indigo-500" />,
  GITHUB_STAR:      <span className="h-4 w-4 text-gray-700 [&>svg]:h-4 [&>svg]:w-4"><GithubIcon /></span>,
  ON_CHAIN_DEPOSIT: <Zap className="h-4 w-4 text-purple-500" />,
  WALLET_CONNECT:   <Wallet className="h-4 w-4 text-blue-500" />,
  TELEGRAM_JOIN:   <Send className="h-4 w-4 text-cyan-500" />,
  INSTALL:          <ArrowUpRight className="h-4 w-4 text-emerald-500" />,
  VISIT:            <ExternalLink className="h-4 w-4 text-orange-500" />,
  VIDEO:            <TrendingUp className="h-4 w-4 text-rose-500" />,
};

function questExternalUrl(q: Quest): string | null {
  const requirements = q.requirements ?? {};
  if (q.type === 'GITHUB_STAR' && requirements.owner && requirements.repo) {
    return `https://github.com/${requirements.owner}/${requirements.repo}`;
  }
  if (q.type === 'TWITTER_FOLLOW' && requirements.targetHandle) {
    return `https://x.com/${requirements.targetHandle}`;
  }
  if (q.type === 'TELEGRAM_JOIN') {
    return (requirements.inviteLink as string | undefined) ?? (
      requirements.chatId ? `https://t.me/c/${String(requirements.chatId).replace('-100', '')}` : null
    );
  }
  if (q.type === 'DISCORD_JOIN' && requirements.inviteUrl) {
    return requirements.inviteUrl as string;
  }
  if (q.type === 'VISIT' && requirements.pageUrl) {
    const url = new URL(requirements.pageUrl as string);
    const clickId = localStorage.getItem('o18_click_id');
    const affId = localStorage.getItem('o18_aff_id');
    const offerId = localStorage.getItem('o18_offer_id');
    if (clickId) url.searchParams.set('click_id', clickId);
    if (affId) url.searchParams.set('aff_id', affId);
    if (offerId) url.searchParams.set('offer_id', offerId);
    return url.toString();
  }
  return null;
}

const BASE_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/* ── Tab type ─────────────────────────────────────────────────────────── */

type Tab = 'quests' | 'earnings' | 'referrals' | 'account';

/* ── Main Dashboard ───────────────────────────────────────────────────── */

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('quests');
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f8ff] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#564c8c] mx-auto mb-5 shadow-lg">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect to earn USDC</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Complete quests — star repos, join communities, follow accounts — and get paid in USDC directly to your wallet.
          </p>
          <div className="flex justify-center">
            <ConnectButton label="Connect Wallet to Start" />
          </div>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  function copyRef() {
    navigator.clipboard.writeText(
      `${window.location.origin}?ref=${user!.referralCode}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'quests',   label: 'Quests',   icon: <Zap className="h-4 w-4" /> },
    { id: 'earnings', label: 'Earnings', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'referrals',label: 'Referrals',icon: <Users className="h-4 w-4" /> },
    { id: 'account',  label: 'Account',  icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f8f8ff]">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#564c8c]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Web3Cash</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Pending balance pill */}
            <div className="hidden items-center gap-2 rounded-full bg-[#f0eeff] px-3 py-1 sm:flex">
              <Wallet className="h-3.5 w-3.5 text-[#564c8c]" />
              <span className="text-xs font-semibold text-[#564c8c]">
                ${fmtNum(user.pendingBalanceUsdc)} USDC
              </span>
            </div>

            {/* Referral copy */}
            <button
              onClick={copyRef}
              className="hidden items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 sm:flex"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy referral link'}
            </button>

            <button onClick={signOut} className="rounded-full border border-gray-200 p-1.5 text-gray-500 hover:text-gray-800">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition-colors
                ${tab === t.id
                  ? 'border-b-2 border-[#564c8c] text-[#564c8c]'
                  : 'text-gray-500 hover:text-gray-800'}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'quests'    && <QuestsTab />}
        {tab === 'earnings'  && <EarningsTab />}
        {tab === 'referrals' && <ReferralsTab />}
        {tab === 'account'   && <AccountTab />}
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTS TAB
   ══════════════════════════════════════════════════════════════════════ */

function QuestsTab() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completions, setCompletions] = useState<QuestCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qr, cr] = await Promise.all([
        questsApi.list(),
        questsApi.myCompletions(),
      ]);
      setQuests(qr.quests);
      setCompletions(cr.completions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completedIds = new Set(
    completions
      .filter((c) => ['HOLDING', 'VERIFIED', 'PAID'].includes(c.status))
      .map((c) => c.questId),
  );

  async function handleComplete(questId: string) {
    setCompleting(questId);
    setError(null);
    setSuccess(null);
    try {
      const res = await questsApi.complete(questId);
      setSuccess(`Quest submitted! Reward releases ${new Date(res.releaseAt).toLocaleDateString()}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to complete quest');
    } finally {
      setCompleting(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Available Quests</h2>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {quests.map((q) => {
          const done = completedIds.has(q.id);
          const completion = completions.find((c) => c.questId === q.id);
          const chip = completion ? STATUS_CHIP[completion.status] : null;
          const isFull = q.completionsCount >= q.maxCompletions;

          return (
            <div
              key={q.id}
              className={`rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md ${done ? 'opacity-80' : ''}`}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {QUEST_TYPE_ICON[q.type] ?? <Trophy className="h-4 w-4 text-gray-400" />}
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {q.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="rounded-full bg-[#564c8c] px-2.5 py-0.5 text-xs font-bold text-white">
                  ${fmtNum(q.rewardUsdc)}
                </span>
              </div>

              <h3 className="mb-1 font-semibold text-gray-900">{q.title}</h3>
              {q.description && (
                <p className="mb-3 text-sm text-gray-500 line-clamp-2">{q.description}</p>
              )}

              <div className="mb-4 flex items-center gap-3 text-xs text-gray-400">
                <span>{q.completionsCount}/{q.maxCompletions} claimed</span>
                <span>·</span>
                <span>Sybil score ≥ {q.minSybilScore}</span>
              </div>

              {/* Progress bar */}
              <div className="mb-4 h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-[#564c8c]"
                  style={{ width: `${Math.min(100, (q.completionsCount / q.maxCompletions) * 100)}%` }}
                />
              </div>

              {done && chip ? (
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${chip.bg} ${chip.text}`}>
                  {chip.label === 'Paid' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   chip.label === 'Failed' ? <XCircle className="h-3.5 w-3.5" /> :
                   <Clock className="h-3.5 w-3.5" />}
                  {chip.label}
                  {completion?.releaseAt && chip.label === 'Pending' &&
                    ` · releases ${fmt(completion.releaseAt)}`}
                </div>
              ) : isFull ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                  <XCircle className="h-3.5 w-3.5" /> Fully claimed
                </div>
              ) : (
                <div className="space-y-2">
                  {questExternalUrl(q) && (
                    <a
                      href={questExternalUrl(q) ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-xl border border-[#564c8c]/20 bg-white py-2.5 text-center text-sm font-medium text-[#564c8c] hover:bg-[#f4f1ff] transition-colors"
                    >
                      Open Task
                    </a>
                  )}
                  <button
                    onClick={() => handleComplete(q.id)}
                    disabled={completing === q.id}
                    className="w-full rounded-xl bg-[#564c8c] py-2.5 text-sm font-medium text-white hover:bg-[#3f3870] disabled:opacity-60 transition-colors"
                  >
                    {completing === q.id ? 'Verifying…' : 'Verify Completion'}
                  </button>
                  <p className="text-[11px] leading-relaxed text-gray-400">
                    Rewards are paid only after Web3Cash verifies this action through the official account/API.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {quests.length === 0 && !loading && (
        <EmptyState
          icon={<Zap className="h-10 w-10 text-gray-300" />}
          title="No active quests"
          subtitle="Check back soon — new quests are added regularly."
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EARNINGS TAB
   ══════════════════════════════════════════════════════════════════════ */

function EarningsTab() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.withdrawals();
      setWithdrawals(res.withdrawals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleWithdraw() {
    setWithdrawing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await userApi.withdraw();
      setSuccess(`Withdrawal initiated! $${fmtNum(res.amountUsdc)} USDC queued.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  }

  const pendingUsd = parseFloat(user?.pendingBalanceUsdc ?? '0');
  const totalUsd = parseFloat(user?.totalEarnedUsdc ?? '0');

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending Balance"
          value={`$${fmtNum(pendingUsd)} USDC`}
          icon={<Wallet className="h-5 w-5 text-[#564c8c]" />}
          accent="#564c8c"
        />
        <StatCard
          label="Total Earned"
          value={`$${fmtNum(totalUsd)} USDC`}
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          accent="#10b981"
        />
        <StatCard
          label="KYC Status"
          value={user?.kycStatus ?? '—'}
          icon={<Shield className="h-5 w-5 text-amber-500" />}
          accent="#f59e0b"
        />
      </div>

      {/* Withdraw CTA */}
      {pendingUsd >= 1 ? (
        <div className="rounded-2xl border border-[#564c8c]/20 bg-[#f0eeff] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[#564c8c]">
                ${fmtNum(pendingUsd)} USDC available to withdraw
              </p>
              <p className="text-xs text-[#564c8c]/70 mt-0.5">
                Minimum $1.00 · Paid to your connected wallet
              </p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="rounded-xl bg-[#564c8c] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3f3870] disabled:opacity-60 whitespace-nowrap"
            >
              {withdrawing ? 'Processing…' : 'Withdraw USDC'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-sm text-gray-500">
            Complete quests to earn USDC. Minimum withdrawal is $1.00.
          </p>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Withdrawal History</h3>
        {loading ? (
          <LoadingSpinner />
        ) : withdrawals.length === 0 ? (
          <EmptyState
            icon={<ArrowUpRight className="h-10 w-10 text-gray-300" />}
            title="No withdrawals yet"
            subtitle="Your withdrawal history will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {withdrawals.map((w) => {
                  const chip = STATUS_CHIP[w.status] ?? STATUS_CHIP['PENDING'];
                  return (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">${fmtNum(w.amountUsdc)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${chip.bg} ${chip.text}`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmt(w.createdAt)}</td>
                      <td className="px-4 py-3">
                        {w.txHash ? (
                          <a
                            href={`https://etherscan.io/tx/${w.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[#564c8c] hover:underline"
                          >
                            {w.txHash.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   REFERRALS TAB
   ══════════════════════════════════════════════════════════════════════ */

function ReferralsTab() {
  const { user } = useAuth();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    userApi.referrals().then(setInfo).catch(console.error).finally(() => setLoading(false));
  }, []);

  const refUrl = `${window.location.origin}?ref=${user?.referralCode}`;

  function copy() {
    navigator.clipboard.writeText(refUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Referral link card */}
      <div className="rounded-2xl border border-[#564c8c]/20 bg-[#f0eeff] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-[#564c8c] p-2">
            <Gift className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-[#564c8c]">Earn with referrals</p>
            <p className="text-xs text-[#564c8c]/70">10% on L1 · 3% on L2 · lifetime earnings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            readOnly
            value={refUrl}
            className="flex-1 rounded-xl border border-[#564c8c]/30 bg-white px-3 py-2 text-sm text-gray-600 font-mono focus:outline-none"
          />
          <button
            onClick={copy}
            className="rounded-xl bg-[#564c8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#3f3870] flex items-center gap-1.5"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && info && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Referral Earnings" value={`$${fmtNum(info.totalReferralEarnings)} USDC`} icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} accent="#10b981" />
          <StatCard label="L1 Referrals" value={String(info.l1Count ?? '—')} icon={<Users className="h-5 w-5 text-[#564c8c]" />} accent="#564c8c" />
          <StatCard label="L2 Referrals" value={String(info.l2Count ?? '—')} icon={<Users className="h-5 w-5 text-indigo-400" />} accent="#818cf8" />
        </div>
      )}

      {/* Earnings list */}
      {!loading && info && info.earnings.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Recent Earnings</h3>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Referee</th>
                  <th className="px-4 py-3 text-left">Level</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {info.earnings.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{short(e.refereeWallet)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${e.level === 1 ? 'bg-[#f0eeff] text-[#564c8c]' : 'bg-indigo-50 text-indigo-600'}`}>
                        L{e.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">${fmtNum(e.amountUsdc)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${e.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmt(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <LoadingSpinner />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ACCOUNT TAB
   ══════════════════════════════════════════════════════════════════════ */

function AccountTab() {
  const { user } = useAuth();
  const [identities, setIdentities] = useState<SocialIdentity[]>([]);
  const [kycStatus, setKycStatus] = useState(user?.kycStatus ?? 'NONE');
  const [kycLoading, setKycLoading] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    oauthApi.identities().then((r: { identities: SocialIdentity[] }) => setIdentities(r.identities)).catch(console.error);

    // Check for link success in URL params
    const params = new URLSearchParams(window.location.search);
    const linked = params.get('linked');
    if (linked) {
      setSuccess(`${linked.charAt(0).toUpperCase() + linked.slice(1)} connected successfully!`);
      window.history.replaceState({}, '', window.location.pathname);
    }
    const err = params.get('error');
    if (err) {
      setError(`Connection failed: ${err}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const linkedPlatforms = new Set(identities.map((i) => i.platform));

  const [showTelegramWidget, setShowTelegramWidget] = useState(false);

  function startOAuth(platform: string) {
    window.location.href = `${BASE_API}/api/oauth/${platform.toLowerCase()}/start?returnTo=/dashboard`;
  }

  function handleTelegramConnect() {
    setShowTelegramWidget(true);
    // Load Telegram widget script dynamically
    setTimeout(() => {
      const container = document.getElementById('telegram-login-widget');
      if (container && !container.querySelector('script')) {
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', 'web3cas_bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '8');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-onauth', 'window.onTelegramAuth(user)');
        container.appendChild(script);
      }
    }, 100);
  }

  useEffect(() => {
    // Attach Telegram auth callback to window
    (window as any).onTelegramAuth = (user: any) => {
      linkTelegram(user);
    };
    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [linkTelegram]);

  async function linkTelegram(authData: any) {
    setUnlinking('TELEGRAM');
    try {
      const res = await fetch(`${BASE_API}/api/oauth/telegram/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });
      if (!res.ok) throw new Error('Failed to link Telegram');
      await oauthApi.identities().then((r: { identities: SocialIdentity[] }) => setIdentities(r.identities));
      setSuccess('Telegram connected successfully!');
      setShowTelegramWidget(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to link Telegram');
    } finally {
      setUnlinking(null);
    }
  }

  async function unlink(platform: string) {
    setUnlinking(platform);
    try {
      await oauthApi.unlink(platform);
      setIdentities((prev) => prev.filter((i) => i.platform !== platform));
      setSuccess(`${platform} disconnected.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unlink');
    } finally {
      setUnlinking(null);
    }
  }

  async function startKyc() {
    setKycLoading(true);
    setError(null);
    try {
      const res = await kycApi.start();
      if (res.oneTimeLink) {
        window.open(res.oneTimeLink, '_blank', 'noopener,noreferrer');
        setSuccess('KYC process opened in a new tab. Check back after completing it.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'KYC start failed');
    } finally {
      setKycLoading(false);
    }
  }

  const sybilScore = user?.sybilScore ?? 0;

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Wallet info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Wallet</h3>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0eeff]">
            <Wallet className="h-5 w-5 text-[#564c8c]" />
          </div>
          <div>
            <p className="font-mono text-sm font-medium text-gray-900">{user?.walletAddress}</p>
            <p className="text-xs text-gray-400">Chain ID: {user?.chainId}</p>
          </div>
        </div>
      </div>

      {/* Sybil score */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Sybil Score</h3>
          <span className={`text-lg font-bold ${sybilScore >= 60 ? 'text-green-600' : sybilScore >= 30 ? 'text-amber-500' : 'text-red-500'}`}>
            {sybilScore}/100
          </span>
        </div>
        <div className="mb-3 h-2 w-full rounded-full bg-gray-100">
          <div
            className={`h-2 rounded-full transition-all ${sybilScore >= 60 ? 'bg-green-500' : sybilScore >= 30 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${sybilScore}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          Link social accounts and verify KYC to raise your score and unlock higher-value quests.
        </p>
      </div>

      {/* Social connections */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Social Connections</h3>
        <div className="space-y-3">
          {[
            { platform: 'TWITTER', label: 'Twitter / X', icon: <span className="text-sky-500"><TwitterXIcon /></span>, points: '+5 pts' },
            { platform: 'DISCORD', label: 'Discord',      icon: <span className="text-indigo-500"><MessageSquare className="h-5 w-5" /></span>, points: '+5 pts' },
            { platform: 'GITHUB',  label: 'GitHub',       icon: <span className="text-gray-800"><GithubIcon /></span>, points: '+5 pts' },
            { platform: 'TELEGRAM', label: 'Telegram',     icon: <span className="text-cyan-500"><TelegramIcon /></span>, points: '+5 pts' },
          ].map(({ platform, label, icon, points }) => {
            const linked = linkedPlatforms.has(platform);
            const identity = identities.find((i) => i.platform === platform);
            return (
              <div key={platform} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  {icon}
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    {linked && identity?.platformHandle && (
                      <p className="text-xs text-gray-500">@{identity.platformHandle}</p>
                    )}
                    {!linked && (
                      <p className="text-xs text-[#564c8c] font-medium">{points} to sybil score</p>
                    )}
                  </div>
                </div>
                {linked ? (
                  <button
                    onClick={() => unlink(platform)}
                    disabled={unlinking === platform}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {unlinking === platform ? '…' : 'Disconnect'}
                  </button>
                ) : platform === 'TELEGRAM' ? (
                  <button
                    onClick={handleTelegramConnect}
                    className="rounded-lg bg-[#564c8c] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3f3870]"
                  >
                    Connect
                  </button>
                ) : (
                  <button
                    onClick={() => startOAuth(platform)}
                    className="rounded-lg bg-[#564c8c] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3f3870]"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* KYC */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Identity Verification (KYC)</h3>
            <p className="mt-0.5 text-xs text-gray-500">Required for withdrawals above $500 · +15 sybil pts</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium
            ${kycStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
              kycStatus === 'PENDING'  ? 'bg-yellow-100 text-yellow-700' :
              kycStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-500'}`}>
            {kycStatus}
          </span>
        </div>
        {kycStatus !== 'VERIFIED' && (
          <button
            onClick={startKyc}
            disabled={kycLoading || kycStatus === 'PENDING'}
            className="mt-4 w-full rounded-xl bg-[#564c8c] py-2.5 text-sm font-medium text-white hover:bg-[#3f3870] disabled:opacity-60"
          >
            {kycLoading ? 'Starting…' :
              kycStatus === 'PENDING' ? 'Verification in progress…' :
              'Start Identity Verification'}
          </button>
        )}
        {kycStatus === 'VERIFIED' && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Identity verified — no withdrawal limits
          </div>
        )}
      </div>

      {/* Telegram Login Widget Modal */}
      {showTelegramWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Connect Telegram</h3>
              <button
                onClick={() => setShowTelegramWidget(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Click the button below to authorize your Telegram account. This will link your Telegram identity to your wallet.
            </p>
            <div id="telegram-login-widget" className="flex justify-center">
              {/* Telegram widget will be injected here */}
            </div>
            <p className="mt-4 text-xs text-gray-400 text-center">
              Your data is securely validated using Telegram's signature verification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ══════════════════════════════════════════════════════════════════════ */

function StatCard({ label, value, icon, accent }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Alert({ type, message, onClose }: {
  type: 'error' | 'success' | 'warning';
  message: string;
  onClose: () => void;
}) {
  const styles = {
    error:   { bg: 'bg-red-50 border-red-200',     text: 'text-red-700',   icon: <XCircle className="h-4 w-4" /> },
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: <CheckCircle2 className="h-4 w-4" /> },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4" /> },
  }[type];
  return (
    <div className={`flex items-start justify-between rounded-xl border px-4 py-3 ${styles.bg} ${styles.text}`}>
      <div className="flex items-center gap-2">
        {styles.icon}
        <p className="text-sm">{message}</p>
      </div>
      <button onClick={onClose} className="ml-4 shrink-0 text-current opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
      <div className="mb-3">{icon}</div>
      <p className="font-medium text-gray-700">{title}</p>
      <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#564c8c] border-t-transparent" />
    </div>
  );
}
