import type { PostbackOptions, Offer18Goal } from './types.js';

function getConfig(): { domain: string; goalIds: Record<Offer18Goal, string> } | null {
  const domain = process.env.OFFER18_TRACKING_DOMAIN?.trim();
  if (!domain) return null;

  return {
    domain,
    goalIds: {
      signup: process.env.OFFER18_GOAL_SIGNUP ?? '1',
      quest_complete: process.env.OFFER18_GOAL_QUEST_COMPLETE ?? '2',
      kyc_verified: process.env.OFFER18_GOAL_KYC_VERIFIED ?? '3',
      deposit: process.env.OFFER18_GOAL_DEPOSIT ?? '4',
    },
  };
}

/**
 * Fire a server-to-server (S2S) conversion postback to Offer18.
 * Silently skips if OFFER18_TRACKING_DOMAIN or OFFER18_SECURITY_TOKEN are not set.
 *
 * Postback URL format:
 *   https://[domain]/postback?click_id={click_id}&goal_id={goal_id}&security_token={token}&payout={payout}
 */
export async function firePostback(options: PostbackOptions): Promise<void> {
  const cfg = getConfig();
  if (!cfg) return; // not configured — skip silently

  const url = new URL(`${cfg.domain}/postback`);
  url.searchParams.set('click_id', options.clickId);
  url.searchParams.set('goal_id', cfg.goalIds[options.goal]);
  if (options.payout !== undefined) {
    url.searchParams.set('payout', options.payout.toFixed(2));
  }

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Offer18 postback failed: HTTP ${res.status} for goal=${options.goal} click_id=${options.clickId}`);
  }
}
