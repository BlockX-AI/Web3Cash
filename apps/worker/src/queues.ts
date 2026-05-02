import { Queue } from 'bullmq';
import { redisConnection } from './lib/redis.js';

/** Queue names — single source of truth, used by both producer and consumer. */
export const QueueNames = {
  ComputeSybilScore: 'compute-sybil-score',
  RecheckQuest: 'recheck-quest',
  ConfirmPayout: 'confirm-payout',
} as const;

export interface ComputeSybilScoreJobData {
  walletAddress: string;
  chainId: number;
}

export interface RecheckQuestJobData {
  completionId: string;
}

export interface ConfirmPayoutJobData {
  payoutId: string;
}

const defaults = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 30_000 },
    removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
    removeOnFail: { age: 30 * 24 * 3600 },
  },
};

export const computeSybilScoreQueue = new Queue<ComputeSybilScoreJobData>(
  QueueNames.ComputeSybilScore,
  defaults,
);

export const recheckQuestQueue = new Queue<RecheckQuestJobData>(
  QueueNames.RecheckQuest,
  defaults,
);

export const confirmPayoutQueue = new Queue<ConfirmPayoutJobData>(
  QueueNames.ConfirmPayout,
  defaults,
);

/**
 * Schedule a tx-confirmation poll for a SUBMITTED payout. Use a stable jobId
 * so the same payout never has duplicate concurrent polls.
 */
export async function scheduleConfirmPayout(
  payoutId: string,
  delayMs = 30_000,
): Promise<void> {
  await confirmPayoutQueue.add(
    'confirm',
    { payoutId },
    { delay: delayMs, jobId: `confirm:${payoutId}` },
  );
}

/**
 * Schedules a re-check of a HOLDING completion at `releaseAt`.
 * Jobs are keyed by completionId so repeated calls dedupe.
 */
export async function scheduleQuestRecheck(
  completionId: string,
  releaseAt: Date,
): Promise<void> {
  const delay = Math.max(0, releaseAt.getTime() - Date.now());
  await recheckQuestQueue.add(
    'recheck',
    { completionId },
    { delay, jobId: `recheck:${completionId}` },
  );
}
