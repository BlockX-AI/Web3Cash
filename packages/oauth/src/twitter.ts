import { prisma } from '@web3cash/db';
import { encrypt, pkceChallenge, randomUrlSafe } from './crypto.js';
import { issueState } from './state.js';

/**
 * Twitter OAuth 2.0 (Authorization Code + PKCE).
 * Docs: https://developer.twitter.com/en/docs/authentication/oauth-2-0
 *
 * Required env:
 *   TWITTER_CLIENT_ID
 *   TWITTER_CLIENT_SECRET  (only for confidential clients; sent on token exchange)
 *   TWITTER_REDIRECT_URI   (must exactly match the one registered in the app)
 *
 * Scopes requested:
 *   users.read     — read the authenticated user's profile (id + username)
 *   follows.read   — verify follow quests via GET /2/users/:id/following
 *   tweet.read     — read public tweets
 *   offline.access — refresh token
 */

const AUTHORIZE_URL = 'https://twitter.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const ME_URL = 'https://api.twitter.com/2/users/me';

const SCOPES = ['users.read', 'follows.read', 'tweet.read', 'offline.access'];

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is required`);
  return v;
}

export interface StartAuthResult {
  url: string;
  state: string;
}

/** Build the authorize URL and persist the PKCE verifier under a single-use state. */
export async function startAuth(params: {
  userWallet: string;
  returnTo?: string;
}): Promise<StartAuthResult> {
  const clientId = requireEnv('TWITTER_CLIENT_ID');
  const redirectUri = requireEnv('TWITTER_REDIRECT_URI');

  const codeVerifier = randomUrlSafe(48);
  const codeChallenge = pkceChallenge(codeVerifier);

  const state = await issueState({
    platform: 'TWITTER',
    userWallet: params.userWallet,
    codeVerifier,
    returnTo: params.returnTo,
  });

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return { url: url.toString(), state };
}

interface TokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
  scope: string;
}

export async function exchangeCode(params: {
  code: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const clientId = requireEnv('TWITTER_CLIENT_ID');
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const redirectUri = requireEnv('TWITTER_REDIRECT_URI');

  const body = new URLSearchParams({
    code: params.code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: params.codeVerifier,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (clientSecret) {
    headers['Authorization'] =
      'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  }

  const res = await fetch(TOKEN_URL, { method: 'POST', headers, body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitter token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshToken(refresh: string): Promise<TokenResponse> {
  const clientId = requireEnv('TWITTER_CLIENT_ID');
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refresh,
    client_id: clientId,
  });
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (clientSecret) {
    headers['Authorization'] =
      'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  }

  const res = await fetch(TOKEN_URL, { method: 'POST', headers, body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitter refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export interface TwitterMe {
  id: string;
  username: string;
  name: string;
}

export async function fetchMe(accessToken: string): Promise<TwitterMe> {
  const res = await fetch(ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitter /users/me failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { data: TwitterMe };
  return json.data;
}

/**
 * Persist the social identity after a successful token exchange.
 * Tokens are AES-256-GCM encrypted before hitting the DB.
 */
export async function linkIdentity(params: {
  userWallet: string;
  me: TwitterMe;
  tokens: TokenResponse;
}) {
  const { userWallet, me, tokens } = params;
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.socialIdentity.upsert({
    where: {
      one_account_per_platform_per_wallet: {
        userWallet: userWallet.toLowerCase(),
        platform: 'TWITTER',
      },
    },
    create: {
      userWallet: userWallet.toLowerCase(),
      platform: 'TWITTER',
      platformId: me.id,
      platformHandle: me.username,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
    },
    update: {
      platformId: me.id,
      platformHandle: me.username,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
    },
  });
}
