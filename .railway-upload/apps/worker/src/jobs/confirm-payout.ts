import { Worker, type Job } from 'bullmq';
import { confirmPayout } from '@web3cash/payouts';
import { redisConnection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import {
  QueueNames,
  scheduleConfirmPayout,
  type ConfirmPayoutJobData,
} from '../queues.js';

/**
 * Worker for `confirm-payout`.
 *
 * Each job re-checks one SUBMITTED payout via the configured PayoutProvider.
 *
 *   - PENDING   → re-schedule the same job with a 30s delay (capped at 1h).
 *   - CONFIRMED → mark payout PAID downstream (handled inside service).
 *   - FAILED    → refund pending balance (handled inside service).
 *   - NOOP      → payout already settled or unknown; drop.
 */

const RETRY_DELAYS_MS = [30_000, 60_000, 2 * 60_000, 5 * 60_000, 15 * 60_000];

export function startConfirmPayoutWorker(): Worker<ConfirmPayoutJobData> {
  const worker = new Worker<ConfirmPayoutJobData>(
    QueueNames.ConfirmPayout,
    async (job: Job<ConfirmPayoutJobData>) => {
      const { payoutId } = job.data;
      const outcome = await confirmPayout(payoutId);
      logger.info(
        { payoutId, outcome, attempt: job.attemptsMade },
        'confirm-payout',
      );

      if (outcome === 'PENDING') {
        // Re-schedule with backoff. We don't throw because BullMQ would treat
        // the job as failed and apply its own retry policy on top of ours.
        const idx = Math.min(
          job.attemptsMade,
          RETRY_DELAYS_MS.length - 1,
        );
        await scheduleConfirmPayout(payoutId, RETRY_DELAYS_MS[idx]!);
      }
      return { outcome };
    },
    { connection: redisConnection, concurrency: 4 },
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, payoutId: job?.data.payoutId, err: err.message },
      'confirm-payout job failed',
    );
  });

  return worker;
}
