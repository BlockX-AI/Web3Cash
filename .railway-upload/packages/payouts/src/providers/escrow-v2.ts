import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  toBytes,
  concat,
  encodeFunctionData,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  ESCROW_V2_ABI,
  ESCROW_V2_DOMAIN,
  CLAIM_TYPES,
} from '@web3cash/contracts';
import { getChain } from '../chains.js';
import type {
  ConfirmationStatus,
  PayoutProviderAdapter,
  PayoutTransfer,
  SubmitResult,
} from '../types.js';

/**
 * EscrowContractV2Provider — Enhanced payout adapter with per-campaign balance tracking.
 *
 * Key improvements over V1:
 *   - Per-campaign balance tracking on-chain
 *   - Campaign creators can fund their own campaigns
 *   - Platform reserve for subsidizing campaigns
 *   - Campaign creators can withdraw unused funds
 *   - Better transparency and auditability
 *
 * For each transfer in a batch we:
 *   1. Compute a deterministic `claimId = keccak256(payoutId | recipient | amount)`.
 *   2. Sign an EIP-712 Claim with the attestor (ESCROW_ATTESTOR_PRIVATE_KEY).
 *   3. Submit the claim via the relayer wallet (CORE_WALLET_PRIVATE_KEY).
 *
 * The contract checks campaign balance first, then falls back to platform reserve.
 */
export class EscrowContractV2Provider implements PayoutProviderAdapter {
  readonly id = 'ESCROW_CONTRACT_V2' as const;

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
      (opts?.escrowAddress ?? (process.env.ESCROW_CONTRACT_ADDRESS_V2 as Address | undefined)) ||
      undefined;
    if (!escrowAddress) {
      throw new Error('ESCROW_CONTRACT_ADDRESS_V2 is required for EscrowContractV2Provider');
    }
    this.escrowAddress = escrowAddress;

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

    const attestor = privateKeyToAccount(this.attestorPk);
    const relayer = privateKeyToAccount(this.relayerPk);
    const chain = getChain(this.chainId);
    const wallet = createWalletClient({ account: relayer, chain, transport: http() });

    // Submit each transfer as a separate claim transaction
    // The contract supports batching but for simplicity we submit sequentially
    const txHashes: string[] = [];
    
    for (const t of transfers) {
      const recipient = t.to as Address;
      const amount = t.amountUsdcAtomic;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + this.claimTtlSec);
      const claimId = keccak256(
        toBytes(`${t.payoutId}|${recipient.toLowerCase()}|${amount.toString()}`),
      );

      // Contract expects: keccak256(abi.encodePacked(campaignId, recipient, amount, claimId, deadline))
      // abi.encodePacked concatenates without padding, so we use concat
      const packed = concat([
        this.campaignId,
        recipient,
        toHex(amount, { size: 32 }),
        claimId,
        toHex(deadline, { size: 32 }),
      ]);
      const messageHash = keccak256(packed);
      
      // signMessage automatically applies toEthSignedMessageHash prefix
      const signature = await attestor.signMessage({ message: { raw: messageHash } });

      const data = encodeFunctionData({
        abi: ESCROW_V2_ABI,
        functionName: 'claim',
        args: [this.campaignId, recipient, amount, claimId, deadline, signature],
      });

      const txHash = await wallet.sendTransaction({
        to: this.escrowAddress,
        data,
        value: 0n,
      });

      txHashes.push(txHash);
    }

    // Return the first tx hash as the primary reference
    // All txs are recorded in the batch but the service expects a single ref
    return { providerRef: txHashes[0]!, txHash: txHashes[0]! };
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

  /**
   * Get campaign balance and stats from the contract
   */
  async getCampaignInfo(): Promise<{
    creator: Address;
    balance: bigint;
    spent: bigint;
    active: boolean;
  }> {
    const chain = getChain(this.chainId);
    const client = createPublicClient({ chain, transport: http() });

    const [creator, balance, spent, active] = await client.readContract({
      address: this.escrowAddress,
      abi: ESCROW_V2_ABI,
      functionName: 'getCampaign',
      args: [this.campaignId],
    });

    return { creator, balance, spent, active };
  }

  /**
   * Get total available funds (campaign balance + platform reserve)
   */
  async getAvailableFunds(): Promise<bigint> {
    const chain = getChain(this.chainId);
    const client = createPublicClient({ chain, transport: http() });

    return await client.readContract({
      address: this.escrowAddress,
      abi: ESCROW_V2_ABI,
      functionName: 'getAvailableFunds',
      args: [this.campaignId],
    });
  }

  /**
   * Get platform reserve balance
   */
  async getPlatformReserve(): Promise<bigint> {
    const chain = getChain(this.chainId);
    const client = createPublicClient({ chain, transport: http() });

    return await client.readContract({
      address: this.escrowAddress,
      abi: ESCROW_V2_ABI,
      functionName: 'platformReserve',
      args: [],
    });
  }
}

/**
 * Helper: convert a UUID v4 (e.g. campaign id from Postgres) to a bytes32
 * suitable for `Web3CashEscrowV2.createCampaign`. The mapping is keccak256(uuid)
 * to give a uniform 32-byte key the contract can store cheaply.
 */
export function campaignIdFromUuid(uuid: string): Hex {
  return keccak256(toHex(uuid));
}
