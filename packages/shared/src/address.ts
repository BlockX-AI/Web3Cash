/**
 * Ethereum address helpers. We always store addresses lowercase in the DB
 * to make UNIQUE / lookups deterministic.
 */

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isAddress(value: string): boolean {
  return ADDRESS_RE.test(value);
}

export function normalizeAddress(value: string): string {
  if (!isAddress(value)) {
    throw new Error(`Invalid Ethereum address: ${value}`);
  }
  return value.toLowerCase();
}
