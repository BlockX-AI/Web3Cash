import { prisma } from '@web3cash/db';
import { normalizeAddress } from '@web3cash/shared';
import type { SessionUser } from '@web3cash/shared';
import { randomBytes } from 'node:crypto';

/** Generate a uniqueness-checked human-friendly referral code. */
async function generateReferralCode(): Promise<string> {
  // 8 chars from a 32-char alphabet (no confusing 0/O/1/I)
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += ALPHABET[bytes[i]! % ALPHABET.length];
    }
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  throw new Error('Could not generate unique referral code');
}

export interface UpsertUserInput {
  walletAddress: string;
  chainId: number;
  referredByCode?: string | null;
  offer18ClickId?: string | null;
  offer18AffId?: string | null;
  offer18OfferId?: string | null;
}

/**
 * Idempotent: if user exists, returns them; if not, creates with a referral code
 * and (optionally) records the referral relationship.
 *
 * Critical: referredByCode is ONLY written on creation, never on subsequent logins —
 * this prevents users from retroactively assigning themselves a referrer.
 */
export async function upsertUserOnLogin(
  input: UpsertUserInput,
): Promise<{ user: SessionUser; isNew: boolean }> {
  const wallet = normalizeAddress(input.walletAddress);

  const existing = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  if (existing) {
    return {
      user: {
        walletAddress: existing.walletAddress,
        chainId: existing.chainId,
        sybilScore: existing.sybilScore,
        kycStatus: existing.kycStatus,
      },
      isNew: false,
    };
  }

  let referrerWallet: string | null = null;
  if (input.referredByCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: input.referredByCode },
    });
    if (referrer && referrer.walletAddress !== wallet) {
      referrerWallet = referrer.walletAddress;
    }
  }

  const referralCode = await generateReferralCode();

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        walletAddress: wallet,
        chainId: input.chainId,
        referralCode,
        referredByWallet: referrerWallet,
        offer18ClickId: input.offer18ClickId ?? null,
        offer18AffId: input.offer18AffId ?? null,
        offer18OfferId: input.offer18OfferId ?? null,
      },
    });
    if (referrerWallet) {
      await tx.referral.create({
        data: {
          referrerWallet,
          refereeWallet: wallet,
          level: 1,
        },
      });
    }
    return user;
  });

  return {
    user: {
      walletAddress: created.walletAddress,
      chainId: created.chainId,
      sybilScore: created.sybilScore,
      kycStatus: created.kycStatus,
    },
    isNew: true,
  };
}
