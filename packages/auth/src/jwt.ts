import { SignJWT, jwtVerify } from 'jose';
import { SESSION_TTL_SECONDS } from '@web3cash/shared';

const ALG = 'HS256';
const ISSUER = 'web3cash';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export interface JwtClaims {
  sub: string; // walletAddress (lowercase)
  chainId: number;
}

/** Mint a session JWT. Default TTL = 7 days. */
export async function signSession(claims: JwtClaims): Promise<string> {
  return new SignJWT({ chainId: claims.chainId })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISSUER)
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/** Verify and decode a session JWT. Returns null on any failure. */
export async function verifySession(token: string): Promise<JwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: ISSUER });
    if (typeof payload.sub !== 'string' || typeof payload.chainId !== 'number') return null;
    return { sub: payload.sub, chainId: payload.chainId };
  } catch {
    return null;
  }
}
