import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Zap, CreditCard, ListChecks,
  LogOut, RefreshCw, ChevronLeft, ChevronRight, Search,
  CheckCircle2, XCircle, Clock, AlertTriangle, Eye, EyeOff,
  ShieldAlert, TrendingDown, Activity,
} from 'lucide-react';
import {
  adminApi,
  type Stats, type AdminUser, type AdminQuest,
  type AdminPayout, type WaitlistEntry,
  type FlaggedWallet, type SybilBucket, type VelocityAlert, type AdminReview,
} from './adminApi';

/* ── Types ──────────────────────────────────────────────────────────────── */
type Page = 'dashboard' | 'users' | 'quests' | 'payouts' | 'waitlist' | 'fraud';

/* ── Colours / helpers ──────────────────────────────────────────────────── */
const PURPLE = '#564c8c';
const SIDEBAR_BG = '#13111e';

const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  VERIFIED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  NONE: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-green-100 text-green-800',
};

function Badge({ label }: { label: string }) {
  const cls = STATUS_COLORS[label] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';
}

function fmt(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Login ──────────────────────────────────────────────────────────────── */
function Login({ onLogin }: { onLogin: (secret: string) => void }) {
  const [secret, setSecret] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!secret) { setErr('Enter admin secret'); return; }
    setLoading(true); setErr('');
    try {
      const old = (window as any).__adminSecret;
      (window as any).__adminSecret = secret;
      await adminApi.stats();
      onLogin(secret);
    } catch {
      (window as any).__adminSecret = '';
      setErr('Invalid admin secret or API unreachable');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#f8f8ff] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: PURPLE }}>
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Web3Cash Admin</h1>
          <p className="text-sm text-gray-500">Enter your admin secret to continue</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Admin secret"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none focus:border-[#564c8c] focus:ring-2 focus:ring-[#564c8c]/20"
            />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button type="submit" disabled={loading}
            className="rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ background: PURPLE }}>
            {loading ? 'Checking…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Sidebar ────────────────────────────────────────────────────────────── */
const NAV: { id: Page; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard',  Icon: LayoutDashboard },
  { id: 'users',     label: 'Users',      Icon: Users },
  { id: 'quests',    label: 'Quests',     Icon: Zap },
  { id: 'payouts',   label: 'Payouts',    Icon: CreditCard },
  { id: 'waitlist',  label: 'Waitlist',   Icon: ListChecks },
  { id: 'fraud',     label: 'Fraud',      Icon: ShieldAlert },
];

function Sidebar({ page, setPage, onLogout }: { page: Page; setPage: (p: Page) => void; onLogout: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 flex w-56 flex-col" style={{ background: SIDEBAR_BG }}>
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: PURPLE }}>
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-white tracking-wide">W3C Admin</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setPage(id)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              page === id ? 'text-white' : 'text-white/50 hover:text-white/80'
            }`}
            style={page === id ? { background: PURPLE } : {}}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <button onClick={onLogout}
        className="flex items-center gap-3 px-6 py-5 text-sm text-white/40 hover:text-white border-t border-white/10 transition-colors">
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </aside>
  );
}

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */
function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([adminApi.stats(), adminApi.healthCheck()]);
      setStats(s);
      setApiOk(h.status === 'ok');
    } catch { setApiOk(false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-medium ${apiOk ? 'text-green-600' : 'text-red-500'}`}>
            {apiOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            API {apiOk ? 'Online' : 'Offline'}
          </span>
          <button onClick={load} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} />
          <StatCard label="Active Quests" value={stats.activeQuests.toLocaleString()} />
          <StatCard label="Pending Payouts" value={stats.pendingPayouts.toLocaleString()} />
          <StatCard label="Waitlist" value={stats.waitlistCount.toLocaleString()} />
          <StatCard label="Total Paid" value={`$${parseFloat(stats.totalPaidUsdc).toFixed(2)}`} sub="USDC confirmed" />
        </div>
      ) : (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-sm text-red-600">
          Failed to load stats. Check API is running and admin secret is correct.
        </div>
      )}
    </div>
  );
}

/* ── Users ──────────────────────────────────────────────────────────────── */
function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editWallet, setEditWallet] = useState('');
  const [editScore, setEditScore] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const r = await adminApi.users(p, s);
      setUsers(r.users); setTotal(r.total); setPages(r.pages);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function handleSybil(wallet: string) {
    setSaving(true);
    try {
      await adminApi.setSybil(wallet, parseInt(editScore, 10));
      setEditWallet('');
      load();
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Users <span className="text-base font-normal text-gray-400">({total})</span></h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); load(1, e.target.value); }}
              placeholder="Search wallet…"
              className="rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-sm outline-none focus:border-[#564c8c] w-56"
            />
          </div>
          <button onClick={() => load()} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              {['Wallet', 'Tier', 'Sybil', 'KYC', 'Pending (USDC)', 'Earned (USDC)', 'Joined'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</th>
              ))}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.walletAddress} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{short(u.walletAddress)}</td>
                <td className="px-4 py-3"><Badge label={u.tier} /></td>
                <td className="px-4 py-3">
                  {editWallet === u.walletAddress ? (
                    <div className="flex items-center gap-1">
                      <input type="number" value={editScore} onChange={e => setEditScore(e.target.value)}
                        className="w-16 rounded border border-gray-200 px-2 py-1 text-xs" min={0} max={100} />
                      <button onClick={() => handleSybil(u.walletAddress)} disabled={saving}
                        className="rounded bg-green-500 px-2 py-1 text-xs text-white">✓</button>
                      <button onClick={() => setEditWallet('')}
                        className="rounded bg-gray-200 px-2 py-1 text-xs">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditWallet(u.walletAddress); setEditScore(String(u.sybilScore)); }}
                      className="rounded-lg bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">
                      {u.sybilScore}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3"><Badge label={u.kycStatus} /></td>
                <td className="px-4 py-3 text-right">{parseFloat(u.pendingBalanceUsdc).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{parseFloat(u.totalEarnedUsdc).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{fmt(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <a href={`https://etherscan.io/address/${u.walletAddress}`} target="_blank" rel="noreferrer"
                    className="text-[#564c8c] text-xs hover:underline">View ↗</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={() => { setPage(p => Math.max(1, p - 1)); load(Math.max(1, page - 1)); }}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 hover:bg-gray-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          <button onClick={() => { setPage(p => Math.min(pages, p + 1)); load(Math.min(pages, page + 1)); }}
            disabled={page === pages}
            className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 hover:bg-gray-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Quests ─────────────────────────────────────────────────────────────── */
function QuestsPage() {
  const [quests, setQuests] = useState<AdminQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    campaignId: '',
    title: '',
    description: '',
    type: 'TWITTER_FOLLOW',
    rewardUsdc: '1',
    maxCompletions: 1000,
    minSybilScore: 50,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.quests(); setQuests(r.quests); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(q: AdminQuest) {
    setToggling(q.id);
    try { await adminApi.toggleQuest(q.id, !q.active); load(); }
    finally { setToggling(null); }
  }

  async function createQuest(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createQuest(formData);
      setShowCreateModal(false);
      setFormData({
        campaignId: '',
        title: '',
        description: '',
        type: 'TWITTER_FOLLOW',
        rewardUsdc: '1',
        maxCompletions: 1000,
        minSybilScore: 50,
      });
      load();
    } catch (err) {
      console.error('Failed to create quest:', err);
      alert('Failed to create quest. Check console for details.');
    } finally {
      setCreating(false);
    }
  }

  const TYPES: Record<string, string> = {
    TWITTER_FOLLOW: '🐦 Twitter Follow',
    DISCORD_JOIN: '💬 Discord Join',
    GITHUB_STAR: '⭐ GitHub Star',
    ON_CHAIN_DEPOSIT: '⛓ On-Chain Deposit',
    WALLET_CONNECT: '🔗 Wallet Connect',
    TELEGRAM_JOIN: '✈️ Telegram Join',
    INSTALL: '📲 Install',
    VISIT: '🌐 Visit',
    VIDEO: '🎬 Video',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Quests <span className="text-base font-normal text-gray-400">({quests.length})</span></h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-[#564c8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#3f3870]"
          >
            + Create Quest
          </button>
          <button onClick={load} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Create New Quest</h3>
            <form onSubmit={createQuest} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Campaign ID</label>
                <input
                  type="text"
                  value={formData.campaignId}
                  onChange={e => setFormData({ ...formData, campaignId: e.target.value })}
                  placeholder="Enter campaign ID"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Quest title"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Quest description"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {Object.entries(TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Reward (USDC)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rewardUsdc}
                    onChange={e => setFormData({ ...formData, rewardUsdc: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Max Completions</label>
                  <input
                    type="number"
                    value={formData.maxCompletions}
                    onChange={e => setFormData({ ...formData, maxCompletions: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Min Sybil Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.minSybilScore}
                  onChange={e => setFormData({ ...formData, minSybilScore: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-[#564c8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#3f3870] disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create Quest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              {['Title', 'Project / Campaign', 'Type', 'Reward (USDC)', 'Completions', 'Min Sybil', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</th>
              ))}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Toggle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Loading…</td></tr>
            ) : quests.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">No quests found</td></tr>
            ) : quests.map(q => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{q.title}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  <div>{q.campaign?.project?.name ?? '—'}</div>
                  <div className="text-gray-400">{q.campaign?.name ?? '—'}</div>
                </td>
                <td className="px-4 py-3 text-xs">{TYPES[q.type] ?? q.type}</td>
                <td className="px-4 py-3 font-semibold text-[#564c8c]">${parseFloat(q.rewardUsdc).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="text-gray-700">{q.completionsCount}</span>
                  <span className="text-gray-400"> / {q.maxCompletions}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{q.minSybilScore}</td>
                <td className="px-4 py-3">
                  <Badge label={q.active ? 'APPROVED' : 'FAILED'} />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggle(q)}
                    disabled={toggling === q.id}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      q.active
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    } disabled:opacity-50`}
                  >
                    {toggling === q.id ? '…' : q.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Payouts ────────────────────────────────────────────────────────────── */
function PayoutsPage() {
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(async (s = statusFilter) => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([adminApi.payouts(s || undefined), adminApi.checkPayouts()]);
      setPayouts(r.payouts);
      setCounts({ QUEUED: c.queued, SUBMITTED: c.submitted, CONFIRMED: c.confirmed, FAILED: c.failed });
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const STATUSES = ['', 'QUEUED', 'SUBMITTED', 'CONFIRMED', 'FAILED'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Payouts</h2>
        <button onClick={() => load()} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
          <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-3">
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-400 font-medium">{k}</p>
            <p className="text-2xl font-bold text-gray-900">{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        {STATUSES.map(s => (
          <button key={s || 'all'} onClick={() => { setStatusFilter(s); load(s); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === s ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={statusFilter === s ? { background: PURPLE } : {}}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              {['ID', 'Wallet', 'Amount (USDC)', 'Status', 'Provider', 'Tx Hash', 'Date'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">Loading…</td></tr>
            ) : payouts.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">No payouts</td></tr>
            ) : payouts.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.id.slice(0, 8)}…</td>
                <td className="px-4 py-3 font-mono text-xs">{short(p.userWallet)}</td>
                <td className="px-4 py-3 font-semibold text-[#564c8c]">${parseFloat(p.amountUsdc).toFixed(2)}</td>
                <td className="px-4 py-3"><Badge label={p.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.provider}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {p.txHash ? (
                    <a href={`https://etherscan.io/tx/${p.txHash}`} target="_blank" rel="noreferrer"
                      className="text-[#564c8c] hover:underline">{p.txHash.slice(0, 10)}…</a>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{fmt(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Waitlist ────────────────────────────────────────────────────────────── */
function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.waitlist(); setEntries(r.entries); setTotal(r.total); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Waitlist <span className="text-base font-normal text-gray-400">({total})</span>
        </h2>
        <button onClick={load} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
          <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              {['#', 'Email', 'Wallet', 'Joined'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={4} className="py-12 text-center text-gray-400">Loading…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={4} className="py-12 text-center text-gray-400">No entries yet</td></tr>
            ) : entries.map((e, i) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-4 py-3">{e.email ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {e.walletAddress ? short(e.walletAddress) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{fmt(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Fraud Page ─────────────────────────────────────────────────────────── */
function FraudPage() {
  const [flagged, setFlagged] = useState<FlaggedWallet[]>([]);
  const [buckets, setBuckets] = useState<SybilBucket[]>([]);
  const [alerts, setAlerts] = useState<VelocityAlert[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, d, a, r] = await Promise.all([
        adminApi.flaggedWallets(),
        adminApi.sybilDistribution(),
        adminApi.velocityAlerts(),
        adminApi.reviewQueue(),
      ]);
      setFlagged(f.wallets);
      setBuckets(d.buckets);
      setAlerts(a.alerts);
      setReviews(r.reviews);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function resolve(id: string, action: 'APPROVE' | 'REJECT') {
    setResolving(id);
    try {
      await adminApi.resolveReview(id, action, note || undefined);
      setReviews((prev: AdminReview[]) => prev.filter((r: AdminReview) => r.id !== id));
      setNote('');
    } catch { /* noop */ }
    finally { setResolving(null); }
  }

  const maxBucket = Math.max(...buckets.map((b: SybilBucket) => b.count), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500" /> Fraud Dashboard
        </h2>
        <button onClick={load} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
          <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Sybil Score Distribution */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-indigo-500" /> Sybil Score Distribution
        </h3>
        {loading ? (
          <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <div className="space-y-3">
            {buckets.map((b: SybilBucket) => (
              <div key={b.range} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-right text-xs text-gray-500 font-mono">{b.range}</span>
                <div className="flex-1 rounded-full bg-gray-100 h-4 overflow-hidden">
                  <div
                    className="h-4 rounded-full transition-all"
                    style={{
                      width: `${(b.count / maxBucket) * 100}%`,
                      background: b.range.startsWith('0') ? '#ef4444' : b.range.startsWith('20') ? '#f97316' : b.range.startsWith('40') ? '#eab308' : '#22c55e',
                    }}
                  />
                </div>
                <span className="w-20 shrink-0 text-xs text-gray-500">{b.count.toLocaleString()} ({b.pct}%)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Velocity Alerts */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-500" /> Velocity Alerts (last hour)
        </h3>
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ) : alerts.length === 0 ? (
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> No velocity anomalies detected
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-xs text-amber-700 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Wallet</th>
                  <th className="px-4 py-2 text-left">Completions/hr</th>
                  <th className="px-4 py-2 text-left">Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {alerts.map((a: VelocityAlert) => (
                  <tr key={a.walletAddress} className="hover:bg-amber-50/50">
                    <td className="px-4 py-2 font-mono text-xs">{short(a.walletAddress)}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                        {a.completionsLastHour}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400">{a.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Flagged Wallets */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" /> Flagged Wallets
          {flagged.length > 0 && (
            <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">{flagged.length}</span>
          )}
        </h3>
        {loading ? (
          <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
        ) : flagged.length === 0 ? (
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> No flagged wallets
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-red-50 text-xs text-red-700 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Wallet</th>
                  <th className="px-4 py-2 text-left">Sybil</th>
                  <th className="px-4 py-2 text-left">24h Completions</th>
                  <th className="px-4 py-2 text-left">Total Earned</th>
                  <th className="px-4 py-2 text-left">Flag Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {flagged.map((w: FlaggedWallet) => (
                  <tr key={w.walletAddress} className="hover:bg-red-50/30">
                    <td className="px-4 py-2 font-mono text-xs">{short(w.walletAddress)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${w.sybilScore < 10 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {w.sybilScore}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs">{w.completionsLast24h}</td>
                    <td className="px-4 py-2 text-xs font-medium">${parseFloat(w.totalEarnedUsdc).toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">{w.flagReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Review Queue */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" /> Manual Review Queue
          {reviews.length > 0 && (
            <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600">{reviews.length}</span>
          )}
        </h3>
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ) : reviews.length === 0 ? (
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Queue is empty
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r: AdminReview) => (
              <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-gray-700">{short(r.walletAddress)}</p>
                    <p className="mt-1 text-xs text-gray-500">{r.reason}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{fmt(r.createdAt)}</p>
                  </div>
                  <Badge label={r.status} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={note}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
                    placeholder="Resolution note…"
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#564c8c]"
                  />
                  <button
                    onClick={() => resolve(r.id, 'APPROVE')}
                    disabled={resolving === r.id}
                    className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => resolve(r.id, 'REJECT')}
                    disabled={resolving === r.id}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── App root ────────────────────────────────────────────────────────────── */
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState<Page>('dashboard');

  function handleLogin(secret: string) {
    (window as any).__adminSecret = secret;
    import.meta.env.VITE_ADMIN_SECRET || ((window as any).__adminSecretRuntime = secret);
    setLoggedIn(true);
  }

  if (!loggedIn) return <Login onLogin={handleLogin} />;

  const PAGE_MAP: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />,
    users:     <UsersPage />,
    quests:    <QuestsPage />,
    payouts:   <PayoutsPage />,
    waitlist:  <WaitlistPage />,
    fraud:     <FraudPage />,
  };

  return (
    <div className="min-h-screen bg-[#f8f8ff]">
      <Sidebar page={page} setPage={setPage} onLogout={() => setLoggedIn(false)} />
      <main className="ml-56 min-h-screen p-8">
        {PAGE_MAP[page]}
      </main>
    </div>
  );
}
