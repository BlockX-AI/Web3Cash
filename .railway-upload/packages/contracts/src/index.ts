/**
 * Public surface for `@web3cash/contracts`. Inline ABIs + EIP-712 typed-data
 * fragments so other packages (notably `@web3cash/payouts`) can sign claims
 * and broadcast txs without any Hardhat / artifact-loading at runtime.
 *
 * If you change Solidity, regenerate by running `pnpm --filter @web3cash/contracts compile`
 * and update the matching ABI fragment below.
 */

export const ESCROW_DOMAIN = {
  name: 'Web3CashEscrow',
  version: '1',
} as const;

export const ESCROW_V2_DOMAIN = {
  name: 'Web3CashEscrowV2',
  version: '2',
} as const;

export const REGISTRY_DOMAIN = {
  name: 'Web3CashRegistry',
  version: '1',
} as const;

export const CLAIM_TYPES = {
  Claim: [
    { name: 'campaignId', type: 'bytes32' },
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'claimId', type: 'bytes32' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

export const BIND_TYPES = {
  Bind: [
    { name: 'wallet', type: 'address' },
    { name: 'platform', type: 'bytes32' },
    { name: 'handleHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

/** Minimal Escrow ABI used by @web3cash/payouts. Full ABI lives in artifacts/. */
export const ESCROW_ABI = [
  {
    type: 'function',
    name: 'createCampaign',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'endsAt', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'topUp',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'claimId', type: 'bytes32' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'remainingOf',
    stateMutability: 'view',
    inputs: [{ name: 'campaignId', type: 'bytes32' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'claimed',
    stateMutability: 'view',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'claimId', type: 'bytes32' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'event',
    name: 'Claimed',
    inputs: [
      { name: 'campaignId', type: 'bytes32', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'claimId', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
] as const;

/** EscrowV2 ABI with per-campaign balance tracking */
export const ESCROW_V2_ABI = [
  {
    type: 'function',
    name: 'createCampaign',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'campaignId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'fundCampaign',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'fundPlatformReserve',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'claimId', type: 'bytes32' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdrawCampaignFunds',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'deactivateCampaign',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'campaignId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getCampaign',
    stateMutability: 'view',
    inputs: [{ name: 'campaignId', type: 'bytes32' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'balance', type: 'uint256' },
      { name: 'spent', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'getAvailableFunds',
    stateMutability: 'view',
    inputs: [{ name: 'campaignId', type: 'bytes32' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'platformReserve',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'claimed',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'event',
    name: 'CampaignCreated',
    inputs: [
      { name: 'campaignId', type: 'bytes32', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CampaignFunded',
    inputs: [
      { name: 'campaignId', type: 'bytes32', indexed: true },
      { name: 'funder', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Claimed',
    inputs: [
      { name: 'campaignId', type: 'bytes32', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'claimId', type: 'bytes32', indexed: false },
    ],
    anonymous: false,
  },
] as const;

/** Minimal Registry ABI used for off-chain reads. */
export const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'bind',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'platform', type: 'bytes32' },
      { name: 'handleHash', type: 'bytes32' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'bindingOf',
    stateMutability: 'view',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'platform', type: 'bytes32' },
    ],
    outputs: [{ type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'nonces',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export interface DeploymentInfo {
  network: string;
  chainId: number;
  registry: `0x${string}`;
  escrow: `0x${string}`;
  usdc: `0x${string}`;
  attestor: `0x${string}`;
  deployedAt: string;
}
