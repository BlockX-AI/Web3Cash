import { prisma } from '@web3cash/db';
import { encrypt, randomUrlSafe } from './crypto.js';
import { issueState } from './state.js';

/**
 * GitHub OAuth (web flow).
 * Docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 *
 * Required env:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *   GITHUB_REDIRECT_URI
 *
 * Scopes: read:user, user:email, public_repo (for star check).
 */

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const ME_URL = 'https://api.github.com/user';

const SCOPES = ['read:user', 'user:email', 'public_repo'];

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
  const clientId = requireEnv('GITHUB_CLIENT_ID');
  const redirectUri = requireEnv('GITHUB_REDIRECT_URI');

  const state = await issueState({
    platform: 'GITHUB',
    userWallet: params.userWallet,
    codeVerifier: randomUrlSafe(24),
    returnTo: params.returnTo,
  });

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('allow_signup', 'true');

  return { url: url.toString(), state };
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const clientId = requireEnv('GITHUB_CLIENT_ID');
  const clientSecret = requireEnv('GITHUB_CLIENT_SECRET');
  const redirectUri = requireEnv('GITHUB_REDIRECT_URI');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub token exchange failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as TokenResponse & { error?: string };
  if (json.error) throw new Error(`GitHub OAuth: ${json.error}`);
  return json;
}

export interface GithubMe {
  id: number;
  login: string;
  name: string | null;
}

export async function fetchMe(accessToken: string): Promise<GithubMe> {
  const res = await fetch(ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'web3cash',
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub /user failed: ${res.status}`);
  }
  return (await res.json()) as GithubMe;
}

export async function linkIdentity(params: {
  userWallet: string;
  me: GithubMe;
  tokens: TokenResponse;
}) {
  const { userWallet, me, tokens } = params;
  // GitHub OAuth tokens don't expire; we set a far-future expiresAt for consistency.
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await prisma.socialIdentity.upsert({
    where: {
      one_account_per_platform_per_wallet: {
        userWallet: userWallet.toLowerCase(),
        platform: 'GITHUB',
      },
    },
    create: {
      userWallet: userWallet.toLowerCase(),
      platform: 'GITHUB',
      platformId: String(me.id),
      platformHandle: me.login,
      accessToken: encrypt(tokens.access_token),
      tokenExpiresAt: expiresAt,
    },
    update: {
      platformId: String(me.id),
      platformHandle: me.login,
      accessToken: encrypt(tokens.access_token),
      tokenExpiresAt: expiresAt,
    },
  });
}
