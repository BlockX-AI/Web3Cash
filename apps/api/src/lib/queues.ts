import { Queue } from 'bullmq';

export const QueueNames = {
  ComputeSybilScore: 'compute-sybil-score',
  RecheckQuest: 'recheck-quest',
  ConfirmPayout: 'confirm-payout',
} as const;

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error('REDIS_URL env var not set');

function makeQueue<T>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection: {
      url: redisUrl,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
      removeOnFail: { age: 30 * 24 * 3600 },
    },
  });
}

let _recheckQueue: Queue<{ completionId: string }> | null = null;
let _sybilQueue: Queue<{ walletAddress: string; chainId: number }> | null = null;

function getRecheckQueue(): Queue<{ completionId: string }> {
  if (!_recheckQueue) _recheckQueue = makeQueue<{ completionId: string }>(QueueNames.RecheckQuest);
  return _recheckQueue;
}

function getSybilQueue(): Queue<{ walletAddress: string; chainId: number }> {
  if (!_sybilQueue) _sybilQueue = makeQueue<{ walletAddress: string; chainId: number }>(QueueNames.ComputeSybilScore);
  return _sybilQueue;
}

export async function scheduleQuestRecheck(completionId: string, releaseAt: Date): Promise<void> {
  const delay = Math.max(0, releaseAt.getTime() - Date.now());
  await getRecheckQueue().add(
    'recheck',
    { completionId },
    { delay, jobId: `recheck:${completionId}` },
  );
}

export async function scheduleComputeSybilScore(walletAddress: string, chainId: number): Promise<void> {
  await getSybilQueue().add(
    'compute',
    { walletAddress, chainId },
    { jobId: `sybil:${walletAddress.toLowerCase()}` },
  );
}
