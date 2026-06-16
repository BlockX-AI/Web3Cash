import { prisma } from '@web3cash/db';
import type { QuestVerifier, VerifyInput, VerifyResult } from './types.js';

/**
 * Webhook-based verifiers for INSTALL, VISIT, and VIDEO quest types.
 *
 * These verifiers rely on server-side events emitted by the project's
 * integration layer (SDK pixel / video player) being persisted in
 * `VerificationEvent` rows by the /api/events ingest endpoint before
 * the user submits the quest.
 *
 * Requirements shape:
 *
 *  INSTALL: { appId: string, lookbackSeconds?: number }
 *    → Check VerificationEvent where workerName="install" and
 *      payload.appId matches, within the lookback window.
 *
 *  VISIT:   { pageUrl: string, lookbackSeconds?: number }
 *    → Check VerificationEvent where workerName="visit" and
 *      payload.pageUrl matches (domain-level), within lookback.
 *
 *  VIDEO:   { videoId: string, minWatchPercent?: number, lookbackSeconds?: number }
 *    → Check VerificationEvent where workerName="video" and
 *      payload.videoId matches AND payload.watchPercent >= minWatchPercent.
 */

function withinLookback(createdAt: Date, lookbackSeconds: number): boolean {
  return createdAt.getTime() >= Date.now() - lookbackSeconds * 1000;
}

/* ── INSTALL ──────────────────────────────────────────────────────────── */

class InstallVerifier implements QuestVerifier {
  readonly supports = ['INSTALL'] as const satisfies readonly ['INSTALL'];

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const start = Date.now();
    const { appId, lookbackSeconds = 7 * 86400 } = input.requirements as {
      appId?: string;
      lookbackSeconds?: number;
    };

    if (!appId || typeof appId !== 'string') {
      return { outcome: 'INVALID', latencyMs: Date.now() - start, payload: { reason: 'missing_app_id' } };
    }

    const events = await prisma.verificationEvent.findMany({
      where: {
        userWallet: input.userWallet.toLowerCase(),
        workerName: 'install',
        outcome: 'PASS',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const match = events.find((e: any) => {
      const p = e.payload as Record<string, unknown>;
      return p.appId === appId && withinLookback(e.createdAt, Number(lookbackSeconds));
    });

    return {
      outcome: match ? 'PASS' : 'FAIL',
      latencyMs: Date.now() - start,
      payload: { appId, found: !!match, eventId: match?.id ?? null },
    };
  }
}

/* ── VISIT ────────────────────────────────────────────────────────────── */

class VisitVerifier implements QuestVerifier {
  readonly supports = ['VISIT'] as const satisfies readonly ['VISIT'];

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const start = Date.now();
    const { pageUrl, lookbackSeconds = 86400 } = input.requirements as {
      pageUrl?: string;
      lookbackSeconds?: number;
    };

    if (!pageUrl || typeof pageUrl !== 'string') {
      return { outcome: 'INVALID', latencyMs: Date.now() - start, payload: { reason: 'missing_page_url' } };
    }

    let targetDomain: string;
    try {
      targetDomain = new URL(pageUrl).hostname.toLowerCase();
    } catch {
      return { outcome: 'INVALID', latencyMs: Date.now() - start, payload: { reason: 'invalid_page_url' } };
    }

    const events = await prisma.verificationEvent.findMany({
      where: {
        userWallet: input.userWallet.toLowerCase(),
        workerName: 'visit',
        outcome: 'PASS',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const match = events.find((e: any) => {
      const p = e.payload as Record<string, unknown>;
      if (!withinLookback(e.createdAt, Number(lookbackSeconds))) return false;
      try {
        const evtUrl = p.pageUrl as string | undefined;
        if (!evtUrl) return false;
        return new URL(evtUrl).hostname.toLowerCase() === targetDomain;
      } catch {
        return false;
      }
    });

    return {
      outcome: match ? 'PASS' : 'FAIL',
      latencyMs: Date.now() - start,
      payload: { pageUrl, targetDomain, found: !!match },
    };
  }
}

/* ── VIDEO ────────────────────────────────────────────────────────────── */

class VideoVerifier implements QuestVerifier {
  readonly supports = ['VIDEO'] as const satisfies readonly ['VIDEO'];

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const start = Date.now();
    const {
      videoId,
      minWatchPercent = 80,
      lookbackSeconds = 7 * 86400,
    } = input.requirements as {
      videoId?: string;
      minWatchPercent?: number;
      lookbackSeconds?: number;
    };

    if (!videoId || typeof videoId !== 'string') {
      return { outcome: 'INVALID', latencyMs: Date.now() - start, payload: { reason: 'missing_video_id' } };
    }

    const events = await prisma.verificationEvent.findMany({
      where: {
        userWallet: input.userWallet.toLowerCase(),
        workerName: 'video',
        outcome: 'PASS',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const match = events.find((e: any) => {
      const p = e.payload as Record<string, unknown>;
      if (!withinLookback(e.createdAt, Number(lookbackSeconds))) return false;
      if (p.videoId !== videoId) return false;
      const watchPct = Number(p.watchPercent ?? 0);
      return watchPct >= Number(minWatchPercent);
    });

    return {
      outcome: match ? 'PASS' : 'FAIL',
      latencyMs: Date.now() - start,
      payload: {
        videoId,
        minWatchPercent,
        found: !!match,
        actualWatchPercent: match
          ? (match.payload as Record<string, unknown>).watchPercent
          : null,
      },
    };
  }
}

export const installVerifier = new InstallVerifier();
export const visitVerifier = new VisitVerifier();
export const videoVerifier = new VideoVerifier();
