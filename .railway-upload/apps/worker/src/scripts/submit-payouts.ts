/**
 * Operator script: submit all QUEUED payouts as a single Safe multiSend tx.
 *
 *   pnpm --filter @web3cash/worker exec tsx src/scripts/submit-payouts.ts
 *
 * Flow:
 *   1. processQueuedPayouts → POSTs proposal to Safe Tx Service.
 *   2. For each Payout that just transitioned QUEUED→SUBMITTED, schedule a
 *      `confirm-payout` job that polls until on-chain finality.
 *
 * Run on a cron (e.g. every 15 min) in production. Safe owners co-sign in the
 * Safe UI; once threshold is met, the relayer broadcasts. Our `confirmPayout`
 * worker watches for the eventual txHash.
 */
import { processQueuedPayouts } from '@web3cash/payouts';
import { logger } from '../lib/logger.js';
import { scheduleConfirmPayout } from '../queues.js';

async function main() {
  const provider = (process.env.PAYOUT_PROVIDER ?? 'GNOSIS_SAFE') as
    | 'GNOSIS_SAFE'
    | 'CIRCLE_API'
    | 'ESCROW_CONTRACT';
  const chainId = Number(process.env.DEFAULT_CHAIN_ID ?? '1');

  logger.info({ provider, chainId }, 'submit-payouts: starting');

  const result = await processQueuedPayouts({ provider, chainId });
  logger.info(
    { provider, chainId, submitted: result.submitted.length, reason: result.reason },
    'submit-payouts: provider returned',
  );

  for (const payoutId of result.submitted) {
    await scheduleConfirmPayout(payoutId, 30_000);
  }

  logger.info(
    { scheduled: result.submitted.length },
    'submit-payouts: confirmation jobs queued',
  );

  process.exit(0);
}

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : String(err) }, 'submit-payouts failed');
  process.exit(1);
});
