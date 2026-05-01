import { logger } from './lib/logger.js';
import { startComputeSybilScoreWorker } from './jobs/compute-sybil-score.js';

logger.info('🚀 Web3Cash worker starting...');

const workers = [startComputeSybilScoreWorker()];

logger.info({ workers: workers.length }, '✅ workers running');

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
