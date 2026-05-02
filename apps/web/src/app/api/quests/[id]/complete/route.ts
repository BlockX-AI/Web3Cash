import { NextRequest, NextResponse } from 'next/server';
import { attemptCompletion } from '@web3cash/verifiers';
import { getSessionWallet } from '@/lib/session';
import { scheduleRecheck } from '@/lib/queues';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const wallet = await getSessionWallet();
  if (!wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = enforceRateLimit(`claim:${wallet}`, RATE_LIMITS.QUEST_CLAIM);
  if (limited) return limited;

  const result = await attemptCompletion({
    userWallet: wallet,
    questId: params.id,
  });

  if (!result.ok) {
    const statusByCode: Record<string, number> = {
      QUEST_NOT_FOUND: 404,
      QUEST_INACTIVE: 410,
      CAMPAIGN_NOT_ACTIVE: 410,
      ALREADY_CLAIMED: 409,
      BUDGET_EXHAUSTED: 409,
      SYBIL_TOO_LOW: 403,
      VERIFY_FAIL: 422,
      VERIFY_INVALID: 422,
      VERIFY_RETRY: 503,
      VERIFIER_MISSING: 500,
    };
    return NextResponse.json(
      { error: result.code, message: result.message ?? null },
      { status: statusByCode[result.code] ?? 400 },
    );
  }

  // Schedule the 72h re-check. Fire-and-forget — if Redis is temporarily down
  // we log but don't fail the user's claim; a cron sweeper (Phase 5) catches orphans.
  try {
    await scheduleRecheck(result.completionId, result.releaseAt);
  } catch (err) {
    console.error('scheduleRecheck failed', err);
  }

  return NextResponse.json({
    ok: true,
    completionId: result.completionId,
    status: result.status,
    releaseAt: result.releaseAt.toISOString(),
  });
}
