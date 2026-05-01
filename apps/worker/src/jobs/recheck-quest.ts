import { Worker, type Job, UnrecoverableError } from 'bullmq';
import { recheckCompletion } from '@web3cash/verifiers';
import { redisConnection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { QueueNames, type RecheckQuestJobData } from '../queues.js';

export function startRecheckQuestWorker(): Worker<RecheckQuestJobData> {
  const worker = new Worker<RecheckQuestJobData>(
    QueueNames.RecheckQuest,
    async (job: Job<RecheckQuestJobData>) => {
      const { completionId } = job.data;
      const outcome = await recheckCompletion(completionId);
      logger.info({ completionId, outcome, attempt: job.attemptsMade }, 'quest recheck');

      // RETRY → let BullMQ re-run with backoff (throw a recoverable error).
      if (outcome === 'RETRY') {
        throw new Error('verifier_retry');
      }
      // PROMOTED / FAILED / NOOP are all terminal.
      if (outcome === 'NOOP') {
        throw new UnrecoverableError('completion_not_in_holding_state');
      }
      return { outcome };
    },
    { connection: redisConnection, concurrency: 4 },
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, completionId: job?.data.completionId, err: err.message },
      'recheck-quest job failed',
    );
  });

  return worker;
}
