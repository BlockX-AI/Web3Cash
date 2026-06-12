const BASE = import.meta.env.VITE_API_URL ?? 'https://webcash-production.up.railway.app';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string) => req<T>(path, { method: 'GET' }),
  post:   <T>(path: string, body?: unknown) =>
    req<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => req<T>(path, { method: 'DELETE' }),
};

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface AuthUser {
  walletAddress: string;
  chainId: number;
  sybilScore: number;
  kycStatus: string;
  tier: string;
  pendingBalanceUsdc: string;
  totalEarnedUsdc: string;
  referralCode: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string | null;
  rewardUsdc: string;
  type: string;
  maxCompletions: number;
  completionsCount: number;
  minSybilScore: number;
  requirements: Record<string, unknown>;
}

export interface QuestCompletion {
  id: string;
  questId: string;
  status: string;
  rewardUsdc: string;
  verifiedAt: string | null;
  releaseAt: string | null;
  paidAt: string | null;
  quest: { title: string; type: string };
}

export interface Withdrawal {
  id: string;
  amountUsdc: string;
  status: string;
  provider: string;
  txHash: string | null;
  createdAt: string;
}

export interface SocialIdentity {
  platform: string;
  platformHandle: string | null;
  createdAt: string;
}

export interface ReferralEarning {
  id: string;
  refereeWallet: string;
  level: number;
  amountUsdc: string;
  status: string;
  createdAt: string;
}

export interface ReferralInfo {
  totalReferralEarnings: string;
  l1Count: number;
  l2Count: number;
  earnings: ReferralEarning[];
}

/* ── API namespaces ────────────────────────────────────────────────────── */

export const authApi = {
  nonce:  () => api.post<{ nonce: string }>('/api/auth/nonce'),
  verify: (message: string, signature: string) => {
    const offer18ClickId  = localStorage.getItem('o18_click_id')  ?? undefined;
    const offer18AffId    = localStorage.getItem('o18_aff_id')    ?? undefined;
    const offer18OfferId  = localStorage.getItem('o18_offer_id')  ?? undefined;
    const referredByCode  = localStorage.getItem('w3c_ref')       ?? undefined;
    console.log('[Offer18] Sending to backend:', {
      offer18ClickId,
      offer18AffId,
      offer18OfferId,
      referredByCode,
    });
    return api.post<{ success: boolean; walletAddress: string }>('/api/auth/verify', {
      message,
      signature,
      ...(offer18ClickId  && { offer18ClickId }),
      ...(offer18AffId    && { offer18AffId }),
      ...(offer18OfferId  && { offer18OfferId }),
      ...(referredByCode  && { referredByCode }),
    });
  },
  me:     () => api.get<AuthUser>('/api/auth/me'),
  logout: () => api.post<{ success: boolean }>('/api/auth/logout'),
};

export const questsApi = {
  list:          () => api.get<{ quests: Quest[] }>('/api/quests'),
  campaigns:     () => api.get<{ campaigns: any[] }>('/api/quests/campaigns'),
  myCompletions: () => api.get<{ completions: QuestCompletion[] }>('/api/quests/my-completions'),
  complete:      (questId: string) =>
    api.post<{ completionId: string; status: string; releaseAt: string }>(`/api/quests/${questId}/complete`),
};

export const userApi = {
  referrals:  () => api.get<ReferralInfo>('/api/user/referrals'),
  withdrawals: () => api.get<{ withdrawals: Withdrawal[] }>('/api/user/withdrawals'),
  withdraw:   () => api.post<{ payoutId: string; amountUsdc: string; lineItemCount: number }>('/api/user/withdrawals'),
};

export const oauthApi = {
  identities: () => api.get<{ identities: SocialIdentity[] }>('/api/oauth/identities'),
  unlink:     (platform: string) => api.delete<{ success: boolean }>(`/api/oauth/${platform}`),
};

export const kycApi = {
  start:  (email?: string) =>
    api.post<{ inquiryId: string; oneTimeLink: string | null; sessionToken: string | null }>(
      '/api/kyc/start', email ? { email } : {},
    ),
  status: () => api.get<{ kycStatus: string }>('/api/kyc/status'),
};

export const waitlistApi = {
  join: (payload: { email?: string; walletAddress?: string }) =>
    api.post<{ success: boolean }>('/api/waitlist', payload),
};
