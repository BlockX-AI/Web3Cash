import { SiweMessage } from 'siwe';
import { normalizeAddress } from '@web3cash/shared';
import { verifyAndConsumeNonce } from './nonce.js';

export interface VerifiedSiwe {
  walletAddress: string; // normalized lowercase
  chainId: number;
  issuedAt: string;
}

/**
 * Verify a SIWE message + signature pair. Consumes the nonce on success.
 * Throws on any failure. Caller maps to 401.
 *
 * Hardening notes:
 *  - We ALWAYS validate the message domain matches our configured SIWE_DOMAIN
 *    to prevent phishing-relay attacks where a user signs a message intended
 *    for example.com that we then accept on web3cash.io.
 */
export async function verifySiwe(rawMessage: string, signature: string): Promise<VerifiedSiwe> {
  const message = new SiweMessage(rawMessage);

  const expectedDomain = process.env.SIWE_DOMAIN;
  if (!expectedDomain) {
    throw new Error('SIWE_DOMAIN env var not set');
  }
  if (message.domain !== expectedDomain) {
    throw new Error(`Domain mismatch: got ${message.domain}, expected ${expectedDomain}`);
  }

  const result = await message.verify({ signature });
  if (!result.success) {
    throw new Error('Signature verification failed');
  }

  // verify() does NOT atomically consume the nonce — do that ourselves.
  await verifyAndConsumeNonce(message.nonce);

  return {
    walletAddress: normalizeAddress(message.address),
    chainId: message.chainId,
    issuedAt: message.issuedAt ?? new Date().toISOString(),
  };
}
