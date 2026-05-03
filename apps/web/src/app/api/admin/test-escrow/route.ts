/**
 * Debug endpoint to test escrow contract submission directly.
 * Shows exactly what error occurs when trying to submit a payout.
 */
import { NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/session';
import { EscrowContractProvider } from '@web3cash/payouts';

export const runtime = 'nodejs';

export async function POST() {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const trace: Array<{ step: string; data: unknown }> = [];

  try {
    // Step 1: Check env vars
    const envCheck = {
      ESCROW_CONTRACT_ADDRESS: !!process.env.ESCROW_CONTRACT_ADDRESS,
      ESCROW_CAMPAIGN_ID: !!process.env.ESCROW_CAMPAIGN_ID,
      ESCROW_ATTESTOR_PRIVATE_KEY: !!process.env.ESCROW_ATTESTOR_PRIVATE_KEY,
      CORE_WALLET_PRIVATE_KEY: !!process.env.CORE_WALLET_PRIVATE_KEY,
      DEFAULT_CHAIN_ID: process.env.DEFAULT_CHAIN_ID,
      ALCHEMY_API_KEY: !!process.env.ALCHEMY_API_KEY,
    };
    trace.push({ step: '1_env_check', data: envCheck });

    // Step 2: Initialize provider
    const provider = new EscrowContractProvider();
    trace.push({ step: '2_provider_init', data: { id: provider.id } });

    // Step 3: Try to submit a test transfer (1 USDC to caller)
    const testTransfer = {
      payoutId: 'test-' + Date.now(),
      to: wallet,
      amountUsdcAtomic: 1_000_000n, // 1 USDC (6 decimals)
    };
    trace.push({ step: '3_test_transfer', data: testTransfer });

    const result = await provider.submit([testTransfer]);
    trace.push({ step: '4_submit_result', data: result });

    return NextResponse.json({ ok: true, trace });
  } catch (err) {
    trace.push({
      step: 'error',
      data: {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined,
      },
    });
    return NextResponse.json({ ok: false, trace }, { status: 200 });
  }
}
