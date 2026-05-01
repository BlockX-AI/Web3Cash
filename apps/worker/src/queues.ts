import { Queue } from 'bullmq';
import { redisConnection } from './lib/redis.js';

/** Queue names — single source of truth, used by both producer and consumer. */
export const QueueNames = {
  ComputeSybilScore: 'compute-sybil-score',
  RecheckQuest: 'recheck-quest',
  // Phase 3:
  // ReleasePayout: 'release-payout',
} as const;

export interface ComputeSybilScoreJobData {
  walletAddress: string;
  chainId: number;
}

export interface RecheckQuestJobData {
  completionId: string;
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
