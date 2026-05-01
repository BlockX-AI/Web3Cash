import { signSession, upsertUserOnLogin, verifySiwe } from '@web3cash/auth';
import { siweVerifyRequestSchema, SESSION_TTL_SECONDS } from '@web3cash/shared';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'w3c_session';
const REFERRAL_COOKIE = 'w3c_ref';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = siweVerifyRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const verified = await verifySiwe(parsed.data.message, parsed.data.signature);

    // Pull referral code from cookie set on landing — must be done BEFORE OAuth
    // (Phase 2) so it survives all redirects. This is the bug-list #4 fix.
    const cookieStore = cookies();
    const referredByCode = cookieStore.get(REFERRAL_COOKIE)?.value ?? null;

    const sessionUser = await upsertUserOnLogin({
      walletAddress: verified.walletAddress,
      chainId: verified.chainId,
      referredByCode,
    });

    const token = await signSession({
      sub: sessionUser.walletAddress,
      chainId: sessionUser.chainId,
    });

    const res = NextResponse.json({ user: sessionUser });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    // Burn the referral cookie now that it's been consumed.
    res.cookies.delete(REFERRAL_COOKIE);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized';
    return NextResponse.json({ code: 'UNAUTHORIZED', message }, { status: 401 });
  }
}
