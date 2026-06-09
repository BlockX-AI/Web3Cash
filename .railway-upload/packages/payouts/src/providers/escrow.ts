import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  toBytes,
  encodeFunctionData,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  CLAIM_TYPES,
  ESCROW_ABI,
  ESCROW_DOMAIN,
} from '@web3cash/contracts';
import { getChain } from '../chains.js';
import type {
  ConfirmationStatus,
  PayoutProviderAdapter,
  PayoutTransfer,
  SubmitResult,
} from '../types.js';

/**
 * EscrowContractProvider — Phase 6 payout adapter.
 *
 * For each transfer in a batch we:
 *   1. Compute a deterministic `claimId = keccak256(payoutId | recipient | amount)`.
 *   2. Sign an EIP-712 Claim with the attestor (ESCROW_ATTESTOR_PRIVATE_KEY).
 *   3. Submit the claim via the relayer wallet (CORE_WALLET_PRIVATE_KEY).
 *
 * Why two keys?
 *   - The attestor is the contract's authorising signer. We rotate it via the
 *     Escrow's `setAttestor` if it leaks. It signs EIP-712 messages off-chain
 *     and never touches gas.
 *   - The relayer is a hot wallet that pays gas to broadcast `claim`. It has
 *     no special on-chain authority — anyone can relay a valid attestor sig.
 *
 * For the MVP we allow the same key for both via env, but production deploys
 * MUST split them.
 */
export class EscrowContractProvider implements PayoutProviderAdapter {
  readonly id = 'ESCROW_CONTRACT' as const;

  private readonly escrowAddress: Address;
  private readonly campaignId: Hex;
  private readonly attestorPk: Hex;
  private readonly relayerPk: Hex;
  private readonly chainId: number;
  private readonly claimTtlSec: number;

  constructor(opts?: {
    escrowAddress?: Address;
    campaignId?: Hex;
    attestorPk?: Hex;
    relayerPk?: Hex;
    chainId?: number;
    claimTtlSec?: number;
  }) {
    const escrowAddress =
      (opts?.escrowAddress ?? (process.env.ESCROW_CONTRACT_ADDRESS as Address | undefined)) ||
      undefined;
    if (!escrowAddress) {
      throw new Error('ESCROW_CONTRACT_ADDRESS is required for EscrowContractProvider');
    }
    this.escrowAddress = escrowAddress;

    // For Phase 6 MVP there is one platform-wide campaign keyed by env. Phase 7
    // will key per-campaign once the Console wires `escrowAddress` to projects.
    const cid = opts?.campaignId ?? (process.env.ESCROW_CAMPAIGN_ID as Hex | undefined);
    if (!cid) throw new Error('ESCROW_CAMPAIGN_ID is required (bytes32 hex)');
    this.campaignId = cid;

    const attPk = opts?.attestorPk ?? (process.env.ESCROW_ATTESTOR_PRIVATE_KEY as Hex | undefined);
    if (!attPk) throw new Error('ESCROW_ATTESTOR_PRIVATE_KEY is required');
    this.attestorPk = attPk.startsWith('0x') ? attPk : (`0x${attPk}` as Hex);

    const relPk =
      opts?.relayerPk ??
      (process.env.CORE_WALLET_PRIVATE_KEY as Hex | undefined) ??
      this.attestorPk;
    this.relayerPk = relPk.startsWith('0x') ? relPk : (`0x${relPk}` as Hex);

    this.chainId =
      opts?.chainId ?? Number(process.env.DEFAULT_CHAIN_ID ?? '11155111');
    this.claimTtlSec = opts?.claimTtlSec ?? 60 * 60; // 1h default
  }

  async submit(transfers: PayoutTransfer[]): Promise<SubmitResult> {
    if (transfers.length === 0) throw new Error('no transfers');
    // For MVP we only support one-leg payouts (one user per Payout row). The
    // service layer already coalesces a user's pendingBalance into a single
    // Payout, so transfers.length === 1 in practice. The contract supports
    // multi-claim batching natively if/when we relax this.
    if (transfers.length > 1) {
      throw new Error('EscrowContractProvider expects exactly one transfer per submit');
    }
    const t = transfers[0]!;

    const recipient = t.to as Address;
    const amount = t.amountUsdcAtomic;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + this.claimTtlSec);
    const claimId = keccak256(
      toBytes(`${t.payoutId}|${recipient.toLowerCase()}|${amount.toString()}`),
    );

    const attestor = privateKeyToAccount(this.attestorPk);
    const relayer = privateKeyToAccount(this.relayerPk);
    const chain = getChain(this.chainId);

    const signature = await attestor.signTypedData({
      domain: {
        ...ESCROW_DOMAIN,
        chainId: this.chainId,
        verifyingContract: this.escrowAddress,
      },
      types: CLAIM_TYPES,
      primaryType: 'Claim',
      message: {
        campaignId: this.campaignId,
        recipient,
        amount,
        claimId,
        deadline,
      },
    });

    const data = encodeFunctionData({
      abi: ESCROW_ABI,
      functionName: 'claim',
      args: [this.campaignId, recipient, amount, claimId, deadline, signature],
    });

    const wallet = createWalletClient({ account: relayer, chain, transport: http() });
    const txHash = await wallet.sendTransaction({
      to: this.escrowAddress,
      data,
      value: 0n,
    });

    return { providerRef: txHash, txHash };
  }

  async checkStatus(input: {
    providerRef: string;
    txHash: string | null;
  }): Promise<ConfirmationStatus> {
    const txHash = (input.txHash ?? input.providerRef) as Hex | undefined;
    if (!txHash) return { kind: 'PENDING' };

    const chain = getChain(this.chainId);
    const client = createPublicClient({ chain, transport: http() });

    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      if (!receipt) return { kind: 'PENDING' };
      if (receipt.status === 'success') {
        return {
          kind: 'CONFIRMED',
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
        };
      }
      return { kind: 'FAILED', reason: 'reverted' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Tx not yet mined → still pending.
      if (/not found|could not be found/i.test(msg)) return { kind: 'PENDING' };
      return { kind: 'FAILED', reason: msg };
    }
  }
}

/**
 * Helper: convert a UUID v4 (e.g. campaign id from Postgres) to a bytes32
 * suitable for `Web3CashEscrow.createCampaign`. The mapping is keccak256(uuid)
 * to give a uniform 32-byte key the contract can store cheaply.
 */
export function campaignIdFromUuid(uuid: string): Hex {
  return keccak256(toHex(uuid));
}
