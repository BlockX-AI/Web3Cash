import { prisma } from '@web3cash/db';
import { encrypt, randomUrlSafe } from './crypto.js';
import { issueState } from './state.js';

/**
 * Discord OAuth 2.0 (Authorization Code).
 * Docs: https://discord.com/developers/docs/topics/oauth2
 *
 * Required env:
 *   DISCORD_CLIENT_ID
 *   DISCORD_CLIENT_SECRET
 *   DISCORD_REDIRECT_URI
 *
 * Scopes: identify (profile id+username), guilds (list guild memberships).
 */

const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const ME_URL = 'https://discord.com/api/users/@me';

const SCOPES = ['identify', 'guilds'];

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
}): Promise<StartAuthResult> {
  const clientId = requireEnv('DISCORD_CLIENT_ID');
  const redirectUri = requireEnv('DISCORD_REDIRECT_URI');

  const state = await issueState({
    platform: 'DISCORD',
    userWallet: params.userWallet,
    // Discord OAuth is plain Authorization Code (no PKCE) so verifier is unused.
    codeVerifier: randomUrlSafe(24),
    returnTo: params.returnTo,
  });

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'none');

  return { url: url.toString(), state };
}

interface TokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
  scope: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const clientId = requireEnv('DISCORD_CLIENT_ID');
  const clientSecret = requireEnv('DISCORD_CLIENT_SECRET');
  const redirectUri = requireEnv('DISCORD_REDIRECT_URI');

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export interface DiscordMe {
  id: string;
  username: string;
  global_name?: string;
}

export async function fetchMe(accessToken: string): Promise<DiscordMe> {
  const res = await fetch(ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Discord /users/@me failed: ${res.status}`);
  }
  return (await res.json()) as DiscordMe;
}

export async function linkIdentity(params: {
  userWallet: string;
  me: DiscordMe;
  tokens: TokenResponse;
}) {
  const { userWallet, me, tokens } = params;
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const handle = me.global_name ?? me.username;

  await prisma.socialIdentity.upsert({
    where: {
      one_account_per_platform_per_wallet: {
        userWallet: userWallet.toLowerCase(),
        platform: 'DISCORD',
      },
    },
    create: {
      userWallet: userWallet.toLowerCase(),
      platform: 'DISCORD',
      platformId: me.id,
      platformHandle: handle,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
    },
    update: {
      platformId: me.id,
      platformHandle: handle,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
    },
  });
}
