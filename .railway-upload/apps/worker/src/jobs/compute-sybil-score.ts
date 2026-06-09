import { Worker } from 'bullmq';
import { prisma } from '@web3cash/db';
import { DualAdapter, computeSybilScore } from '@web3cash/sybil';
import { redisConnection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QueueNames, type ComputeSybilScoreJobData } from '../queues.js';

const adapter = DualAdapter.fromEnv();

export function startComputeSybilScoreWorker() {
  const worker = new Worker<ComputeSybilScoreJobData>(
    QueueNames.ComputeSybilScore,
    async (job) => {
      const { walletAddress, chainId } = job.data;
      const startedAt = Date.now();
      try {
        const result = await computeSybilScore(walletAddress, chainId, adapter);
        await prisma.verificationEvent.create({
          data: {
            userWallet: walletAddress.toLowerCase(),
            workerName: 'compute-sybil-score',
            outcome: 'PASS',
            latencyMs: Date.now() - startedAt,
            payload: result as unknown as object,
          },
        });
        logger.info({ walletAddress, score: result.score }, 'sybil score computed');
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        await prisma.verificationEvent.create({
          data: {
            userWallet: walletAddress.toLowerCase(),
            workerName: 'compute-sybil-score',
            outcome: 'ERROR',
            latencyMs: Date.now() - startedAt,
            payload: {},
            errorMessage: message,
          },
        });
        logger.error({ walletAddress, err: message }, 'sybil score failed');
        throw e;
      }
    },
    { connection: redisConnection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.warn({ jobId: job?.id, err: err.message }, 'job failed');
  });

  return worker;
}
