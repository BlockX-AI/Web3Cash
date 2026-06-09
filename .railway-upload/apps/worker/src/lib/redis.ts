import type { ConnectionOptions } from 'bullmq';

const url = process.env.REDIS_URL;
if (!url) throw new Error('REDIS_URL env var not set');

export const redisConnection: ConnectionOptions = {
  url,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};
