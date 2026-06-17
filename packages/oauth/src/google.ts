import { prisma } from '@web3cash/db';
import { encrypt } from './crypto.js';

/**
 * Google OAuth 2.0 (OpenID Connect).
 * Docs: https://developers.google.com/identity/protocols/oauth2/web-server
 *
 * Required env:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REDIRECT_URI   — used for the Dashboard "Link Google" flow
 *                           (https://api.web3cash.xyz/api/oauth/google/callback)
 *
 * The registration flow (/api/auth/google/*) uses a dynamic redirectUri
 * passed at call time so no extra env var is needed.
 */

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ME_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const SCOPES = ['openid', 'email', 'profile'];

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is required`);
  return v;
}

export interface StartAuthResult {
  url: string;
  state: string;
}

export async function startAuth(params: {
  userWallet: string;
  returnTo?: string;
  state: string;
  redirectUri?: string;
}): Promise<StartAuthResult> {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const redirectUri = params.redirectUri ?? requireEnv('GOOGLE_REDIRECT_URI');

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', params.state);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');

  return { url: url.toString(), state: params.state };
}

export interface TokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

export async function exchangeCode(code: string, redirectUriOverride?: string): Promise<TokenResponse> {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri = redirectUriOverride ?? requireEnv('GOOGLE_REDIRECT_URI');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as TokenResponse & { error?: string };
  if (json.error) throw new Error(`Google OAuth: ${json.error}`);
  return json;
}

export interface GoogleMe {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export async function fetchMe(accessToken: string): Promise<GoogleMe> {
  const res = await fetch(ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  return (await res.json()) as GoogleMe;
}

export async function linkIdentity(params: {
  userWallet: string;
  me: GoogleMe;
  tokens: TokenResponse;
}) {
  const { userWallet, me, tokens } = params;
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.socialIdentity.upsert({
    where: {
      one_account_per_platform_per_wallet: {
        userWallet: userWallet.toLowerCase(),
        platform: 'GOOGLE' as any,
      },
    },
    create: {
      userWallet: userWallet.toLowerCase(),
      platform: 'GOOGLE' as any,
      platformId: me.sub,
      platformHandle: me.email,
      accessToken: encrypt(tokens.access_token),
      tokenExpiresAt: expiresAt,
    },
    update: {
      platformId: me.sub,
      platformHandle: me.email,
      accessToken: encrypt(tokens.access_token),
      tokenExpiresAt: expiresAt,
    },
  });

  await prisma.user.updateMany({
    where: { walletAddress: userWallet.toLowerCase(), email: null },
    data: { email: me.email },
  });
}
