import { Worker, type Job, UnrecoverableError } from 'bullmq';
import { recheckCompletion } from '@web3cash/verifiers';
import { prisma } from '@web3cash/db';
import { firePostback } from '@web3cash/offer18';
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
      if (outcome === 'PROMOTED') {
        const completion = await prisma.questCompletion.findUnique({
          where: { id: completionId },
          select: { userWallet: true, rewardUsdc: true },
        });
        if (completion) {
          const user = await prisma.user.findUnique({
            where: { walletAddress: completion.userWallet },
            select: { offer18ClickId: true },
          });
          if (user?.offer18ClickId) {
            await firePostback({
              clickId: user.offer18ClickId,
              goal: 'quest_complete',
              payout: parseFloat(completion.rewardUsdc.toString()),
            }).catch((err: Error) =>
              logger.warn({ completionId, err: err.message }, 'offer18 postback failed'),
            );
          }
        }
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
