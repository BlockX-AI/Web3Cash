import { prisma } from '@web3cash/db';
import type { QuestVerifier, VerifyInput, VerifyResult } from './types.js';

/**
 * Telegram quest verifier.
 *
 * Supports:
 *   - TELEGRAM_JOIN: requirements { chatId: string, username?: string }
 *
 * Strategy: Check if the user has linked their Telegram account and
 * verify they are a member of the specified Telegram chat/group.
 *
 * Note: Telegram Bot API is used to check chat membership.
 * Requires: TELEGRAM_BOT_TOKEN environment variable.
 */
class TelegramVerifier implements QuestVerifier {
  readonly supports = ['TELEGRAM_JOIN'] as const satisfies readonly ['TELEGRAM_JOIN'];

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const start = Date.now();
    const chatId = input.requirements.chatId;
    const username = input.requirements.username as string | undefined;

    if (typeof chatId !== 'string') {
      return {
        outcome: 'INVALID',
        latencyMs: Date.now() - start,
        payload: { reason: 'missing_chat_id' },
      };
    }

    // Get the user's linked Telegram identity
    const identity = await prisma.socialIdentity.findUnique({
      where: {
        one_account_per_platform_per_wallet: {
          userWallet: input.userWallet.toLowerCase(),
          platform: 'TELEGRAM',
        },
      },
    });

    if (!identity) {
      return {
        outcome: 'FAIL',
        latencyMs: Date.now() - start,
        payload: { reason: 'no_telegram_link' },
      };
    }

    const telegramUserId = parseInt(identity.platformId, 10);
    if (isNaN(telegramUserId)) {
      return {
        outcome: 'FAIL',
        latencyMs: Date.now() - start,
        payload: { reason: 'invalid_telegram_id' },
      };
    }

    // Check if username matches (if specified in requirements)
    if (username && identity.platformHandle !== username) {
      return {
        outcome: 'FAIL',
        latencyMs: Date.now() - start,
        payload: { reason: 'username_mismatch', expected: username, actual: identity.platformHandle },
      };
    }

    // Verify chat membership using Telegram Bot API
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return {
          outcome: 'INVALID',
          latencyMs: Date.now() - start,
          payload: { reason: 'missing_bot_token' },
          errorMessage: 'TELEGRAM_BOT_TOKEN not configured',
        };
      }

      // Check if user is a member of the chat
      const url = `https://api.telegram.org/bot${botToken}/getChatMember`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: telegramUserId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Telegram API failed: ${res.status} ${text}`);
      }

      const data = await res.json() as { ok: boolean; result?: { status: string } };

      if (!data.ok || !data.result) {
        return {
          outcome: 'FAIL',
          latencyMs: Date.now() - start,
          payload: { reason: 'api_error', telegramUserId, chatId },
          errorMessage: 'Telegram API returned error',
        };
      }

      // Check membership status
      // Valid statuses: 'creator', 'administrator', 'member', 'restricted'
      const validStatuses = ['creator', 'administrator', 'member', 'restricted'];
      const status = data.result.status;

      if (validStatuses.includes(status)) {
        return {
          outcome: 'PASS',
          latencyMs: Date.now() - start,
          payload: {
            telegramUserId,
            chatId,
            status,
            username: identity.platformHandle,
          },
        };
      }

      // User left or was kicked
      return {
        outcome: 'FAIL',
        latencyMs: Date.now() - start,
        payload: { reason: 'not_member', status, telegramUserId, chatId },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /timeout|network|5\d\d/i.test(msg);
      return {
        outcome: retryable ? 'RETRY' : 'FAIL',
        latencyMs: Date.now() - start,
        payload: { reason: 'verification_error', error: msg },
        errorMessage: msg,
      };
    }
  }
}

export const telegramVerifier = new TelegramVerifier();
