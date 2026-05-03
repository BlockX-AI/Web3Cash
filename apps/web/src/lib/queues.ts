import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@web3cash/shared';

/**
 * Producer-side queue client for the Next.js runtime.
 * Same queue name as the worker's consumer, so this just enqueues into the
 * shared Redis.
 */

declare global {
  // eslint-disable-next-line no-var
  var __w3c_redis: IORedis | undefined;
  // eslint-disable-next-line no-var
  var __w3c_recheck_queue: Queue<{ completionId: string }> | undefined;
}

function getRedis(): IORedis {
  if (!globalThis.__w3c_redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is required');
    globalThis.__w3c_redis = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return globalThis.__w3c_redis;
}

export function recheckQueue(): Queue<{ completionId: string }> {
  if (!globalThis.__w3c_recheck_queue) {
    globalThis.__w3c_recheck_queue = new Queue(QUEUE_NAMES.RECHECK_QUEST, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
        removeOnFail: { age: 30 * 24 * 3600 },
      },
    });
  }
  return globalThis.__w3c_recheck_queue;
}

export async function scheduleRecheck(completionId: string, releaseAt: Date) {
  const delay = Math.max(0, releaseAt.getTime() - Date.now());
  await recheckQueue().add(
    'recheck',
    { completionId },
    { delay, jobId: `recheck_${completionId}` },
  );
}
