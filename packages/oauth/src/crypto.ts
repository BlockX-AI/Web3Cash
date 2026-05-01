import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

/**
 * AES-256-GCM authenticated encryption for OAuth tokens at rest.
 *
 * Format of returned ciphertext (base64):
 *   [12-byte IV][16-byte auth tag][ciphertext]
 *
 * Key is derived from OAUTH_ENC_KEY env var via SHA-256 so operators can
 * use any length secret and we always end up with exactly 32 bytes.
 */

const ALGO = 'aes-256-gcm';

function deriveKey(): Buffer {
  const secret = process.env.OAUTH_ENC_KEY;
  if (!secret || secret.length < 16) {
    throw new Error('OAUTH_ENC_KEY is required (≥16 chars)');
  }
  return createHash('sha256').update(secret).digest();
}

export function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(ciphertext: string): string {
  const key = deriveKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

/** Returns a URL-safe base64 string of `bytes` bytes of entropy. */
export function randomUrlSafe(bytes = 32): string {
  return randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/** PKCE S256: code_challenge = base64url(sha256(code_verifier)). */
export function pkceChallenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
