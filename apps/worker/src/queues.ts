import { Queue } from 'bullmq';
import { redisConnection } from './lib/redis.js';

/** Queue names — single source of truth, used by both producer and consumer. */
export const QueueNames = {
  ComputeSybilScore: 'compute-sybil-score',
  // Phase 2:
  // VerifyQuest: 'verify-quest',
  // RecheckQuest: 'recheck-quest',
  // Phase 3:
  // ReleasePayout: 'release-payout',
} as const;

export interface ComputeSybilScoreJobData {
  walletAddress: string;
  chainId: number;
}

export const computeSybilScoreQueue = new Queue<ComputeSybilScoreJobData>(
  QueueNames.ComputeSybilScore,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
      removeOnFail: { age: 30 * 24 * 3600 },
    },
  },
);
