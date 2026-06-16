const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const SECRET = ((window as any).__adminSecret || import.meta.env.VITE_ADMIN_SECRET) ?? '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': SECRET,
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => req<T>(path, { method: 'GET' });
const post = <T>(path: string, body?: unknown) =>
  req<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) =>
  req<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => req<T>(path, { method: 'DELETE' });

export interface Stats {
  totalUsers: number;
  activeQuests: number;
  pendingPayouts: number;
  waitlistCount: number;
  totalPaidUsdc: string;
}

export interface AdminUser {
  walletAddress: string;
  chainId: number;
  sybilScore: number;
  kycStatus: string;
  tier: string;
  pendingBalanceUsdc: string;
  totalEarnedUsdc: string;
  referralCode: string;
  createdAt: string;
}

export interface AdminQuest {
  id: string;
  title: string;
  description: string | null;
  type: string;
  rewardUsdc: string;
  maxCompletions: number;
  completionsCount: number;
  minSybilScore: number;
  active: boolean;
  createdAt: string;
  campaign: { name: string; project: { name: string } };
}

export interface AdminPayout {
  id: string;
  userWallet: string;
  amountUsdc: string;
  status: string;
  provider: string;
  txHash: string | null;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  email: string | null;
  walletAddress: string | null;
  createdAt: string;
}

export const adminApi = {
  stats: () => get<Stats>('/api/admin/stats'),

  users: (page = 1, search = '') =>
    get<{ users: AdminUser[]; total: number; pages: number }>(
      `/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`,
    ),
  setSybil: (walletAddress: string, score: number) =>
    post('/api/admin/set-sybil', { walletAddress, score }),

  quests: () => get<{ quests: AdminQuest[] }>('/api/admin/quests'),
  createQuest: (data: {
    campaignId: string;
    title: string;
    description?: string;
    type: string;
    rewardUsdc: string;
    maxCompletions: number;
    minSybilScore?: number;
  }) => post('/api/admin/quests', data),
  updateQuest: (id: string, data: Partial<AdminQuest>) =>
    patch(`/api/admin/quests/${id}`, data),
  toggleQuest: (id: string, active: boolean) =>
    patch(`/api/admin/quests/${id}`, { active }),

  payouts: (status?: string) =>
    get<{ payouts: AdminPayout[] }>(
      `/api/admin/payouts${status ? `?status=${status}` : ''}`,
    ),
  checkPayouts: () =>
    get<{ queued: number; submitted: number; confirmed: number; failed: number }>(
      '/api/admin/check-payouts',
    ),

  waitlist: () => get<{ entries: WaitlistEntry[]; total: number }>('/api/admin/waitlist'),

  healthCheck: () =>
    fetch(`${BASE}/api/health`).then((r) => r.json() as Promise<{ status: string }>),

  /* ── Fraud dashboard ─────────────────────────────────────────────── */
  flaggedWallets: () =>
    get<{ wallets: FlaggedWallet[] }>('/api/admin/fraud/flagged-wallets'),
  sybilDistribution: () =>
    get<{ buckets: SybilBucket[] }>('/api/admin/fraud/sybil-distribution'),
  velocityAlerts: () =>
    get<{ alerts: VelocityAlert[] }>('/api/admin/fraud/velocity-alerts'),
  reviewQueue: () =>
    get<{ reviews: AdminReview[] }>('/api/admin/fraud/review-queue'),
  resolveReview: (id: string, action: 'APPROVE' | 'REJECT', note?: string) =>
    post(`/api/admin/fraud/review-queue/${id}/resolve`, { action, note }),
};

/* ── Fraud types ─────────────────────────────────────────────────────── */

export interface FlaggedWallet {
  walletAddress: string;
  sybilScore: number;
  completionsLast24h: number;
  totalEarnedUsdc: string;
  flagReason: string;
  createdAt: string;
}

export interface SybilBucket {
  range: string;
  count: number;
  pct: number;
}

export interface VelocityAlert {
  walletAddress: string;
  completionsLastHour: number;
  threshold: number;
  triggeredAt: string;
}

export interface AdminReview {
  id: string;
  walletAddress: string;
  reason: string;
  status: string;
  note: string | null;
  createdAt: string;
}
