import { Hono } from 'hono';
import { persona } from '@web3cash/oauth';
import { prisma } from '@web3cash/db';
import { requireAuth, getSessionUser } from '../middleware.js';

const kyc = new Hono();

/**
 * POST /api/kyc/start
 * Authenticated user requests a KYC inquiry.
 * Returns the Persona one-time link or session token for the embedded flow.
 */
kyc.post('/start', requireAuth, async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  if (user.kycStatus === 'VERIFIED') {
    return c.json({ error: 'Already verified' }, 409);
  }

  try {
    const body = await c.req.json().catch(() => ({})) as { email?: string };
    const result = await persona.createInquiry({
      userWallet: user.walletAddress,
      email: body.email,
    });

    await prisma.user.update({
      where: { walletAddress: user.walletAddress },
      data: { kycStatus: 'PENDING' },
    });

    return c.json({
      inquiryId: result.inquiryId,
      oneTimeLink: result.oneTimeLink,
      sessionToken: result.sessionToken,
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'KYC start failed' }, 500);
  }
});

/**
 * POST /api/kyc/webhook
 * Persona posts to this endpoint on inquiry state changes.
 * Verifies HMAC signature before processing.
 */
kyc.post('/webhook', async (c) => {
  const rawBody = await c.req.text();
  const signatureHeader = c.req.header('Persona-Signature') ?? null;

  const valid = persona.verifyWebhookSignature({ rawBody, signatureHeader });
  if (!valid) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  let event: persona.PersonaWebhookEvent;
  try {
    event = JSON.parse(rawBody) as persona.PersonaWebhookEvent;
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const inquiryStatus = event.data?.attributes?.payload?.data?.attributes?.status;
  const referenceId = event.data?.attributes?.payload?.data?.attributes?.['reference-id'];
  const eventName = event.data?.attributes?.name;

  if (!referenceId || !inquiryStatus) {
    return c.json({ ok: true, skipped: 'missing_fields' });
  }

  // Only process final status events
  if (!eventName?.startsWith('inquiry.')) {
    return c.json({ ok: true, skipped: 'irrelevant_event' });
  }

  const kycStatus = persona.mapPersonaStatus(inquiryStatus);
  if (!kycStatus) {
    return c.json({ ok: true, skipped: 'unmapped_status' });
  }

  await prisma.user.updateMany({
    where: { walletAddress: referenceId.toLowerCase() },
    data: { kycStatus },
  });

  return c.json({ ok: true, walletAddress: referenceId, kycStatus });
});

/**
 * GET /api/kyc/status
 * Returns the current KYC status of the authenticated user.
 */
kyc.get('/status', requireAuth, async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ kycStatus: user.kycStatus });
});

export default kyc;
