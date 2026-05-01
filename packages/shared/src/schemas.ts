import { z } from 'zod';

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export const ethAddressSchema = z
  .string()
  .regex(ETH_ADDRESS, 'Invalid Ethereum address')
  .transform((s) => s.toLowerCase());

export const chainIdSchema = z.number().int().positive();

export const usdcAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/, 'Invalid USDC amount (max 6 decimals)');

/* ── Auth ───────────────────────────────────────────────────────────────── */

export const siweNonceRequestSchema = z.object({
  walletAddress: ethAddressSchema,
});

export const siweVerifyRequestSchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature'),
});

export type SiweVerifyRequest = z.infer<typeof siweVerifyRequestSchema>;

/* ── Referrals ──────────────────────────────────────────────────────────── */

export const referralCodeSchema = z
  .string()
  .min(6)
  .max(12)
  .regex(/^[A-Z0-9]+$/, 'Referral code must be uppercase alphanumeric');
