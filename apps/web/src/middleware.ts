import { NextResponse, type NextRequest } from 'next/server';

/**
 * Two responsibilities:
 *   1. Capture ?ref=CODE on ANY landing-page request and set the w3c_ref cookie.
 *      This MUST happen at the edge before any redirect/OAuth flow can clear
 *      the URL params. This is the fix for the referral-attribution bug
 *      flagged in growstream-web3cash-extension.html bug #4.
 *   2. Gate /dashboard behind a session cookie (cheap presence check only —
 *      route handlers re-verify the JWT).
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const ref = url.searchParams.get('ref');

  let response: NextResponse | null = null;

  if (ref && /^[A-Z0-9]{6,12}$/.test(ref) && !req.cookies.get('w3c_ref')) {
    response = NextResponse.next();
    response.cookies.set('w3c_ref', ref, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
  }

  if (url.pathname.startsWith('/dashboard') && !req.cookies.get('w3c_session')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return response ?? NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
