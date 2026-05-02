import type { PayoutProvider as DbPayoutProvider } from '@web3cash/db';

/**
 * One transfer leg. A Payout becomes one or more transfers depending on the
 * provider — GnosisSafe coalesces them into a single multiSend tx; the
 * Phase 6 escrow contract unrolls them into per-claim ECDSA signatures.
 */
export interface PayoutTransfer {
  payoutId: string;
  to: string;
  amountUsdcAtomic: bigint; // 6-decimal atomic units
}

export interface SubmitResult {
  /**
   * Provider-specific id returned at submission time. For GnosisSafe this is
   * the safeTxHash; for an EOA-signed transfer this equals txHash.
   */
  providerRef: string;
  /** Optional EVM tx hash if the provider broadcasts immediately. */
  txHash?: string;
}

export type ConfirmationStatus =
  | { kind: 'PENDING' }
  | { kind: 'CONFIRMED'; txHash: string; blockNumber: bigint }
  | { kind: 'FAILED'; reason: string };

/**
 * Strategy interface for moving USDC out to user wallets.
 *
 * Implementations are stateless and inject env via a constructor or factory.
 * The service layer in `service.ts` is the only caller and handles DB writes.
 */
export interface PayoutProviderAdapter {
  readonly id: DbPayoutProvider;

  /**
   * Build & submit a batch of transfers. May POST to a Safe Transaction
   * Service queue (GnosisSafe) or sign+broadcast directly (Phase 6 escrow).
   */
  submit(transfers: PayoutTransfer[]): Promise<SubmitResult>;

  /**
   * Poll for finality. The service layer calls this per-payout from the
   * worker. Implementations should return PENDING for unknown refs so we
   * can keep polling until expiry.
   */
  checkStatus(input: {
    providerRef: string;
    txHash: string | null;
  }): Promise<ConfirmationStatus>;
}
