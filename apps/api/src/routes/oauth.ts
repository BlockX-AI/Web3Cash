import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { twitter, discord, github, telegram, consumeState } from '@web3cash/oauth';
import { prisma } from '@web3cash/db';
import { requireAuth, getSessionUser } from '../middleware.js';

const oauth = new Hono();

/* ────────────────────────────────────────────────────────────
   TWITTER
   ──────────────────────────────────────────────────────────── */

oauth.get('/twitter/start', requireAuth, async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const returnTo = c.req.query('returnTo') ?? '/dashboard';
    const { url } = await twitter.startAuth({ userWallet: user.walletAddress, returnTo });
    return c.redirect(url);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Failed to start Twitter auth' }, 500);
  }
});

oauth.get('/twitter/callback', async (c) => {
  const code = c.req.query('code');
  const stateParam = c.req.query('state');
  const errorParam = c.req.query('error');

  if (errorParam) return c.redirect(`/dashboard?error=twitter_denied`);
  if (!code || !stateParam) return c.redirect(`/dashboard?error=twitter_invalid`);

  const stateRow = await consumeState(stateParam);
  if (!stateRow) return c.redirect(`/dashboard?error=twitter_state_expired`);

  try {
    const tokens = await twitter.exchangeCode({ code, codeVerifier: stateRow.codeVerifier });
    const me = await twitter.fetchMe(tokens.access_token);
    await twitter.linkIdentity({ userWallet: stateRow.userWallet, me, tokens });
    const returnTo = stateRow.returnTo ?? '/dashboard';
    return c.redirect(`${returnTo}?linked=twitter`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return c.redirect(`/dashboard?error=twitter_link_failed&detail=${encodeURIComponent(msg)}`);
  }
});

/* ────────────────────────────────────────────────────────────
   DISCORD
   ──────────────────────────────────────────────────────────── */

oauth.get('/discord/start', requireAuth, async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const returnTo = c.req.query('returnTo') ?? '/dashboard';
    const { url } = await discord.startAuth({ userWallet: user.walletAddress, returnTo });
    return c.redirect(url);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Failed to start Discord auth' }, 500);
  }
});

oauth.get('/discord/callback', async (c) => {
  const code = c.req.query('code');
  const stateParam = c.req.query('state');
  const errorParam = c.req.query('error');

  if (errorParam) return c.redirect(`/dashboard?error=discord_denied`);
  if (!code || !stateParam) return c.redirect(`/dashboard?error=discord_invalid`);

  const stateRow = await consumeState(stateParam);
  if (!stateRow) return c.redirect(`/dashboard?error=discord_state_expired`);

  try {
    const tokens = await discord.exchangeCode(code);
    const me = await discord.fetchMe(tokens.access_token);
    await discord.linkIdentity({ userWallet: stateRow.userWallet, me, tokens });
    const returnTo = stateRow.returnTo ?? '/dashboard';
    return c.redirect(`${returnTo}?linked=discord`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return c.redirect(`/dashboard?error=discord_link_failed&detail=${encodeURIComponent(msg)}`);
  }
});

/* ────────────────────────────────────────────────────────────
   GITHUB
   ──────────────────────────────────────────────────────────── */

oauth.get('/github/start', requireAuth, async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const returnTo = c.req.query('returnTo') ?? '/dashboard';
    const { url } = await github.startAuth({ userWallet: user.walletAddress, returnTo });
    return c.redirect(url);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Failed to start GitHub auth' }, 500);
  }
});

oauth.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const stateParam = c.req.query('state');
  const errorParam = c.req.query('error');

  if (errorParam) return c.redirect(`/dashboard?error=github_denied`);
  if (!code || !stateParam) return c.redirect(`/dashboard?error=github_invalid`);

  const stateRow = await consumeState(stateParam);
  if (!stateRow) return c.redirect(`/dashboard?error=github_state_expired`);

  try {
    const tokens = await github.exchangeCode(code);
    const me = await github.fetchMe(tokens.access_token);
    await github.linkIdentity({ userWallet: stateRow.userWallet, me, tokens });
    const returnTo = stateRow.returnTo ?? '/dashboard';
    return c.redirect(`${returnTo}?linked=github`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return c.redirect(`/dashboard?error=github_link_failed&detail=${encodeURIComponent(msg)}`);
  }
});

/* ────────────────────────────────────────────────────────────
   TELEGRAM
   ──────────────────────────────────────────────────────────── */

oauth.post('/telegram/link', requireAuth, async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const authData = body as telegram.TelegramAuthData;

    // Validate Telegram signature
    const isValid = telegram.validateTelegramAuthData(authData);
    if (!isValid) {
      return c.json({ error: 'Invalid Telegram signature' }, 400);
    }

    // Parse user data
    const me = telegram.parseTelegramMe(authData);

    // Link identity
    await telegram.linkIdentity({ userWallet: user.walletAddress, me });

    const returnTo = body.returnTo ?? '/dashboard';
    return c.json({ success: true, username: me.username, returnTo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return c.json({ error: `Telegram link failed: ${msg}` }, 500);
  }
});

/* ────────────────────────────────────────────────────────────
   LINKED IDENTITIES: GET /api/oauth/identities
   Returns which platforms the signed-in user has linked.
   ──────────────────────────────────────────────────────────── */

oauth.get('/identities', requireAuth, async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const identities = await prisma.socialIdentity.findMany({
    where: { userWallet: user.walletAddress },
    select: {
      platform: true,
      platformHandle: true,
      createdAt: true,
    },
  });

  return c.json({ identities });
});

/* ────────────────────────────────────────────────────────────
   UNLINK: DELETE /api/oauth/:platform
   ──────────────────────────────────────────────────────────── */

oauth.delete('/:platform', requireAuth, async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const platformParam = c.req.param('platform');
  if (!platformParam) return c.json({ error: 'Unknown platform' }, 400);
  const platform = platformParam.toUpperCase() as 'TWITTER' | 'DISCORD' | 'GITHUB' | 'TELEGRAM';
  if (!['TWITTER', 'DISCORD', 'GITHUB', 'TELEGRAM'].includes(platform)) {
    return c.json({ error: 'Unknown platform' }, 400);
  }

  await prisma.socialIdentity.deleteMany({
    where: { userWallet: user.walletAddress, platform },
  });

  return c.json({ success: true, platform });
});

export default oauth;
