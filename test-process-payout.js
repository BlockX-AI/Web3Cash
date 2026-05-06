// Test script to process the queued payout
import { processQueuedPayouts } from '@web3cash/payouts';

async function test() {
  try {
    console.log('Processing queued payouts...');
    const result = await processQueuedPayouts({
      provider: 'ESCROW_CONTRACT',
      chainId: 11155111,
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
