/**
 * ESM re-export for packages that need it (like worker)
 */
export const ESCROW_DOMAIN = {
  name: 'Web3CashEscrow',
  version: '1',
};

export const REGISTRY_DOMAIN = {
  name: 'Web3CashRegistry',
  version: '1',
};

export const CLAIM_TYPES = {
  Claim: [
    { name: 'campaignId', type: 'bytes32' },
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'claimId', type: 'bytes32' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export const BIND_TYPES = {
  Bind: [
    { name: 'wallet', type: 'address' },
    { name: 'platform', type: 'bytes32' },
    { name: 'handleHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

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
];

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
];
