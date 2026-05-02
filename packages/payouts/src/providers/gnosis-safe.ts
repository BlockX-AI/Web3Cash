import {
  encodeFunctionData,
  encodePacked,
  keccak256,
  parseAbi,
  type PublicClient,
} from 'viem';
import { PAYOUT_CONFIRMATIONS } from '@web3cash/shared';
import { getPublicClient, getUsdcAddress } from '../chains.js';
import type {
  ConfirmationStatus,
  PayoutProviderAdapter,
  PayoutTransfer,
  SubmitResult,
} from '../types.js';

/**
 * Gnosis Safe Transaction Service adapter.
 *
 * Flow:
 *   1. Build N `USDC.transfer(to, amount)` calldata items.
 *   2. Wrap them in a single MultiSendCallOnly call (saves gas, single Safe tx).
 *   3. Compute the Safe transaction hash off-chain (EIP-712).
 *   4. POST the proposed tx to the Safe Transaction Service. A signer (or
 *      bot) co-signs in the Safe UI / via API; once threshold is met, the
 *      Safe relayer broadcasts on-chain.
 *   5. We poll the Safe API by `safeTxHash` to discover the eventual `txHash`.
 *
 * Required env:
 *   GNOSIS_SAFE_ADDRESS    — checksum address of the funded Safe
 *   GNOSIS_SAFE_CHAIN_ID   — chainId the Safe lives on (default 1)
 *   GNOSIS_SAFE_TX_SERVICE — base URL, e.g. https://safe-transaction-mainnet.safe.global
 *   GNOSIS_SAFE_PROPOSER   — address proposing the tx (must be a Safe owner)
 *   GNOSIS_SAFE_PROPOSER_PK — private key of the proposer (signs proposal)
 *
 * Phase 6 will replace this adapter with an on-chain `Web3CashEscrow` contract
 * that authorizes per-user claims via EIP-712 signatures (no multi-sig).
 */

const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
]);

// Canonical multiSend deployment (same address on every chain via Singleton Factory).
const MULTISEND_CALL_ONLY: `0x${string}` =
  '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D';

const MULTISEND_ABI = parseAbi([
  'function multiSend(bytes transactions)',
]);

interface GnosisSafeConfig {
  safeAddress: `0x${string}`;
  chainId: number;
  txServiceUrl: string;
  proposer: `0x${string}`;
  proposerPk: `0x${string}`;
}

function loadConfig(): GnosisSafeConfig {
  const need = (k: string) => {
    const v = process.env[k];
    if (!v) throw new Error(`${k} is required for GnosisSafe payouts`);
    return v;
  };
  return {
    safeAddress: need('GNOSIS_SAFE_ADDRESS') as `0x${string}`,
    chainId: Number(process.env.GNOSIS_SAFE_CHAIN_ID ?? '1'),
    txServiceUrl: (
      process.env.GNOSIS_SAFE_TX_SERVICE ??
      'https://safe-transaction-mainnet.safe.global'
    ).replace(/\/$/, ''),
    proposer: need('GNOSIS_SAFE_PROPOSER') as `0x${string}`,
    proposerPk: need('GNOSIS_SAFE_PROPOSER_PK') as `0x${string}`,
  };
}

/**
 * MultiSend transaction encoding (per Safe contracts spec):
 *   { operation: uint8, to: address, value: uint256, dataLength: uint256, data: bytes }
 * concatenated tightly.
 */
function encodeMultiSendInner(
  calls: Array<{ to: `0x${string}`; data: `0x${string}` }>,
): `0x${string}` {
  const parts = calls.map((c) => {
    const dataBytes = (c.data.slice(2).length / 2) | 0;
    return encodePacked(
      ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
      [0, c.to, 0n, BigInt(dataBytes), c.data],
    );
  });
  return ('0x' + parts.map((p) => p.slice(2)).join('')) as `0x${string}`;
}

export class GnosisSafeProvider implements PayoutProviderAdapter {
  readonly id = 'GNOSIS_SAFE' as const;
  private readonly cfg: GnosisSafeConfig;
  private readonly client: PublicClient;

  constructor(cfg?: Partial<GnosisSafeConfig>) {
    this.cfg = { ...loadConfig(), ...cfg };
    this.client = getPublicClient(this.cfg.chainId);
  }

  async submit(transfers: PayoutTransfer[]): Promise<SubmitResult> {
    if (transfers.length === 0) {
      throw new Error('GnosisSafeProvider.submit called with empty transfers');
    }
    const usdc = getUsdcAddress(this.cfg.chainId);

    // 1. Build inner ERC20.transfer calls.
    const calls = transfers.map((t) => ({
      to: usdc,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [t.to as `0x${string}`, t.amountUsdcAtomic],
      }),
    }));

    // 2. Wrap in multiSend.
    const innerData = encodeMultiSendInner(calls);
    const multiSendCalldata = encodeFunctionData({
      abi: MULTISEND_ABI,
      functionName: 'multiSend',
      args: [innerData],
    });

    // 3. Fetch the next nonce from the Safe Tx Service.
    const nonce = await this.fetchNextNonce();

    // 4. Compute the safeTxHash (server side; we ask the Tx Service to canonicalize).
    //    We POST the proposal; the service returns the canonical safeTxHash on success.
    const proposal = {
      safe: this.cfg.safeAddress,
      to: MULTISEND_CALL_ONLY,
      value: '0',
      data: multiSendCalldata,
      operation: 1, // DELEGATECALL — required for MultiSendCallOnly
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: '0x0000000000000000000000000000000000000000',
      refundReceiver: '0x0000000000000000000000000000000000000000',
      nonce: String(nonce),
      sender: this.cfg.proposer,
    };

    const proposeRes = await fetch(
      `${this.cfg.txServiceUrl}/api/v1/safes/${this.cfg.safeAddress}/multisig-transactions/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proposal,
          // Signature will be added in a follow-up call by an owner; the service
          // accepts proposals without one as long as `sender` is a Safe owner.
          contractTransactionHash: await this.computeSafeTxHash(proposal),
        }),
      },
    );

    if (!proposeRes.ok) {
      const text = await proposeRes.text();
      throw new Error(
        `Safe Tx Service propose failed: ${proposeRes.status} ${text}`,
      );
    }

    return {
      providerRef: await this.computeSafeTxHash(proposal),
    };
  }

  async checkStatus(input: {
    providerRef: string;
    txHash: string | null;
  }): Promise<ConfirmationStatus> {
    // Ask the Safe Tx Service for the canonical transaction record.
    const res = await fetch(
      `${this.cfg.txServiceUrl}/api/v1/multisig-transactions/${input.providerRef}/`,
    );
    if (res.status === 404) return { kind: 'PENDING' };
    if (!res.ok) {
      return {
        kind: 'FAILED',
        reason: `safe_tx_service_${res.status}`,
      };
    }
    const data = (await res.json()) as {
      isExecuted: boolean;
      isSuccessful: boolean | null;
      transactionHash: string | null;
    };

    if (!data.isExecuted || !data.transactionHash) return { kind: 'PENDING' };
    if (data.isSuccessful === false) {
      return { kind: 'FAILED', reason: 'safe_tx_reverted' };
    }

    // Verify on-chain finality (defence in depth: don't trust the indexer alone).
    const receipt = await this.client
      .getTransactionReceipt({ hash: data.transactionHash as `0x${string}` })
      .catch(() => null);
    if (!receipt) return { kind: 'PENDING' };
    if (receipt.status !== 'success') {
      return { kind: 'FAILED', reason: 'tx_reverted' };
    }
    const head = await this.client.getBlockNumber();
    if (head - receipt.blockNumber < BigInt(PAYOUT_CONFIRMATIONS)) {
      return { kind: 'PENDING' };
    }
    return {
      kind: 'CONFIRMED',
      txHash: data.transactionHash,
      blockNumber: receipt.blockNumber,
    };
  }

  // ── internals ────────────────────────────────────────────────────────────

  private async fetchNextNonce(): Promise<number> {
    const res = await fetch(
      `${this.cfg.txServiceUrl}/api/v1/safes/${this.cfg.safeAddress}/`,
    );
    if (!res.ok) {
      throw new Error(`Safe info fetch failed: ${res.status}`);
    }
    const data = (await res.json()) as { nonce: number };
    return data.nonce;
  }

  /**
   * EIP-712 hash of the Safe transaction. The Safe Transaction Service will
   * recompute this server-side; we send our copy as `contractTransactionHash`
   * to detect any encoding mismatch early.
   */
  private async computeSafeTxHash(proposal: {
    to: string;
    value: string;
    data: string;
    operation: number;
    safeTxGas: string;
    baseGas: string;
    gasPrice: string;
    gasToken: string;
    refundReceiver: string;
    nonce: string;
  }): Promise<string> {
    // SAFE_TX_TYPEHASH from Safe contracts (v1.3.0+):
    const SAFE_TX_TYPEHASH =
      '0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8';
    const DOMAIN_SEPARATOR_TYPEHASH =
      '0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218';

    const domainSeparator = keccak256(
      encodePacked(
        ['bytes32', 'uint256', 'address'],
        [
          DOMAIN_SEPARATOR_TYPEHASH as `0x${string}`,
          BigInt(this.cfg.chainId),
          this.cfg.safeAddress,
        ],
      ),
    );

    const safeTxHashStruct = keccak256(
      encodePacked(
        [
          'bytes32',
          'address',
          'uint256',
          'bytes32',
          'uint8',
          'uint256',
          'uint256',
          'uint256',
          'address',
          'address',
          'uint256',
        ],
        [
          SAFE_TX_TYPEHASH as `0x${string}`,
          proposal.to as `0x${string}`,
          BigInt(proposal.value),
          keccak256(proposal.data as `0x${string}`),
          proposal.operation,
          BigInt(proposal.safeTxGas),
          BigInt(proposal.baseGas),
          BigInt(proposal.gasPrice),
          proposal.gasToken as `0x${string}`,
          proposal.refundReceiver as `0x${string}`,
          BigInt(proposal.nonce),
        ],
      ),
    );

    return keccak256(
      encodePacked(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        ['0x19', '0x01', domainSeparator, safeTxHashStruct],
      ),
    );
  }
}
