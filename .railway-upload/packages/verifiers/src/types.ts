import type { QuestType } from '@web3cash/db';

/**
 * Outcome of a single verification attempt.
 *
 * - PASS    → condition is currently satisfied (e.g. user is following).
 * - FAIL    → condition is NOT satisfied (reward must not be paid).
 * - RETRY   → transient (rate limit, API 5xx); re-queue with backoff.
 * - INVALID → quest config is broken (unknown handle, etc.); mark quest inactive.
 */
export type VerifyOutcome = 'PASS' | 'FAIL' | 'RETRY' | 'INVALID';

export interface VerifyInput {
  userWallet: string;
  questType: QuestType;
  /** Quest.requirements JSON blob from the DB. */
  requirements: Record<string, unknown>;
}

export interface VerifyResult {
  outcome: VerifyOutcome;
  latencyMs: number;
  /** Opaque payload stored in verification_events for forensics. */
  payload: Record<string, unknown>;
  errorMessage?: string;
}

export interface QuestVerifier {
  /** Quest types this verifier handles. */
  readonly supports: readonly QuestType[];
  verify(input: VerifyInput): Promise<VerifyResult>;
}
