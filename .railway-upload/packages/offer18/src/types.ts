export type Offer18Goal = 'signup' | 'quest_complete' | 'kyc_verified' | 'deposit';

export interface PostbackOptions {
  clickId: string;
  goal: Offer18Goal;
  payout?: number;
}

export interface Offer18Config {
  trackingDomain: string;
  securityToken: string;
  goalIds: Record<Offer18Goal, string>;
}
