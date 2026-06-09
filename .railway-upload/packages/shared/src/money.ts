/**
 * USDC math. Stored in DB as NUMERIC(18,6) → represented in TS as string
 * to avoid floating-point loss. All arithmetic must go through these helpers.
 */

const DECIMALS = 6;
const SCALE = 10n ** BigInt(DECIMALS);

/** Parse a USDC string ("12.500000") into atomic bigint (12500000n). */
export function toAtomic(usdc: string | number): bigint {
  const s = typeof usdc === 'number' ? usdc.toFixed(DECIMALS) : usdc;
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid USDC amount: ${s}`);
  }
  const parts = s.split('.');
  const whole = parts[0] ?? '0';
  const frac = parts[1] ?? '';
  const fracPadded = (frac + '0'.repeat(DECIMALS)).slice(0, DECIMALS);
  return BigInt(whole) * SCALE + BigInt(fracPadded || '0');
}

/** Format atomic bigint to a USDC string ("12.500000"). */
export function fromAtomic(atomic: bigint): string {
  const negative = atomic < 0n;
  const abs = negative ? -atomic : atomic;
  const whole = abs / SCALE;
  const frac = abs % SCALE;
  const fracStr = frac.toString().padStart(DECIMALS, '0');
  return `${negative ? '-' : ''}${whole}.${fracStr}`;
}

/** Sum a list of USDC string amounts. */
export function sumUSDC(amounts: string[]): string {
  return fromAtomic(amounts.reduce((acc, a) => acc + toAtomic(a), 0n));
}

/** a >= b for USDC strings. */
export function gteUSDC(a: string, b: string): boolean {
  return toAtomic(a) >= toAtomic(b);
}

/** Compute the platform fee + user payout + L1 referral bonus from a project's per-completion spend. */
export function splitProjectSpend(perCompletionUSDC: string, hasReferrer: boolean): {
  userPayout: string;
  platformFee: string;
  referralL1: string;
} {
  const total = toAtomic(perCompletionUSDC);
  // platform: 15% of total
  const platformFee = (total * 15n) / 100n;
  // referrer: 10% of total (additive — paid from project's budget, not user's reward)
  const referralL1 = hasReferrer ? (total * 10n) / 100n : 0n;
  // user gets the remainder
  const userPayout = total - platformFee - referralL1;
  return {
    userPayout: fromAtomic(userPayout),
    platformFee: fromAtomic(platformFee),
    referralL1: fromAtomic(referralL1),
  };
}
