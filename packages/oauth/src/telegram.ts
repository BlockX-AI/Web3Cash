import { createHmac } from 'crypto';
import { prisma } from '@web3cash/db';

/**
 * Telegram Login Widget implementation.
 * 
 * Telegram uses a widget-based auth (not standard OAuth):
 * 1. User clicks Telegram login button on your site
 * 2. Telegram redirects back with signed data (id, username, etc.)
 * 3. Server validates the signature using HMAC-SHA256 with bot token
 * 
 * Required env:
 *   TELEGRAM_BOT_TOKEN - Your Telegram bot token from @BotFather
 * 
 * Docs: https://core.telegram.org/widgets/login
 */

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is required`);
  return v;
}

export interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Validate Telegram login widget data.
 * Telegram signs the data with HMAC-SHA256 using the bot token.
 */
export function validateTelegramAuthData(data: TelegramAuthData): boolean {
  const botToken = requireEnv('TELEGRAM_BOT_TOKEN');
  
  // Create the check string: sort keys and concatenate key=value pairs
  const { hash, ...dataToCheck } = data;
  const checkString = Object.keys(dataToCheck)
    .sort()
    .map(key => `${key}=${dataToCheck[key as keyof typeof dataToCheck]}`)
    .join('\n');
  
  // Create HMAC-SHA256 hash
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(checkString).digest('hex');
  
  // Compare hashes (constant-time comparison not needed for this use case)
  return computedHash === hash;
}

export interface TelegramMe {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Convert Telegram auth data to standardized user profile.
 */
export function parseTelegramMe(data: TelegramAuthData): TelegramMe {
  return {
    id: data.id,
    username: data.username,
    firstName: data.first_name,
    lastName: data.last_name,
  };
}

/**
 * Link Telegram identity to user wallet.
 * Unlike other OAuth providers, Telegram doesn't provide access tokens.
 * We store the Telegram user ID and username for quest verification.
 */
export async function linkIdentity(params: {
  userWallet: string;
  me: TelegramMe;
}) {
  const { userWallet, me } = params;
  const handle = me.username || me.firstName || me.id.toString();

  await prisma.socialIdentity.upsert({
    where: {
      one_account_per_platform_per_wallet: {
        userWallet: userWallet.toLowerCase(),
        platform: 'TELEGRAM',
      },
    },
    create: {
      userWallet: userWallet.toLowerCase(),
      platform: 'TELEGRAM',
      platformId: me.id.toString(),
      platformHandle: handle,
      accessToken: '', // Telegram doesn't use access tokens
      refreshToken: null,
      tokenExpiresAt: null,
    },
    update: {
      platformId: me.id.toString(),
      platformHandle: handle,
      accessToken: '',
      refreshToken: null,
      tokenExpiresAt: null,
    },
  });
}

/**
 * Get Telegram user ID from linked identity.
 */
export async function getTelegramUserId(userWallet: string): Promise<number | null> {
  const identity = await prisma.socialIdentity.findUnique({
    where: {
      one_account_per_platform_per_wallet: {
        userWallet: userWallet.toLowerCase(),
        platform: 'TELEGRAM',
      },
    },
  });
  
  if (!identity?.platformId) return null;
  return parseInt(identity.platformId, 10);
}
