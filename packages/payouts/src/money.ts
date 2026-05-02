import { Prisma } from '@web3cash/db';
import { USDC_DECIMALS } from './chains.js';

/**
 * USDC math is exact 6-decimal fixed-point. We use Prisma.Decimal in the DB
 * and bigint atomic units (1 USDC = 1_000_000) on the wire / chain.
 */

export function decimalToAtomic(d: Prisma.Decimal | string | number): bigint {
  const dec = typeof d === 'object' ? d : new Prisma.Decimal(d);
  // Decimal.js: mul(10^6) then floor. Decimal stores arbitrary precision,
  // so multiplying by 10^6 and taking the integer part is exact for ≤6 dp.
  return BigInt(dec.mul(10 ** USDC_DECIMALS).toFixed(0, Prisma.Decimal.ROUND_DOWN));
}

export function atomicToDecimal(atomic: bigint): Prisma.Decimal {
  return new Prisma.Decimal(atomic.toString()).div(10 ** USDC_DECIMALS);
}

export function sumAtomic(values: bigint[]): bigint {
  return values.reduce((acc, v) => acc + v, 0n);
}
