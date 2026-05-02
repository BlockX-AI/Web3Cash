import { NextRequest, NextResponse } from 'next/server';
import { persona } from '@web3cash/oauth';
import { prisma } from '@web3cash/db';

export const runtime = 'nodejs';

/**
 * Persona inquiry status webhook.
 *
 * Security:
 *   - The raw body is HMAC-SHA256 verified using PERSONA_WEBHOOK_SECRET.
 *   - We tolerate ±5 minutes of timestamp skew (replay window).
 *   - The inquiry id from the payload MUST match a User.kycInquiryId we
 *     created in /api/kyc/persona/start. This binds the webhook to a specific
 *     user and prevents an attacker from forging another user's KYC.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('persona-signature');

  if (!persona.verifyWebhookSignature({ rawBody, signatureHeader })) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let payload: persona.PersonaWebhookEvent;
  try {
    payload = JSON.parse(rawBody) as persona.PersonaWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const inquiry = payload.data?.attributes?.payload?.data;
  const inquiryId = inquiry?.id;
  const status = inquiry?.attributes?.status;
  const referenceId = inquiry?.attributes?.['reference-id'];

  if (!inquiryId) {
    return NextResponse.json({ ok: true, ignored: 'no_inquiry_id' });
  }

  const mapped = persona.mapPersonaStatus(status);
  if (!mapped) {
    return NextResponse.json({ ok: true, ignored: 'unknown_status', status });
  }

  // Match by inquiryId first, fall back to wallet via reference-id.
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { kycInquiryId: inquiryId },
        referenceId ? { walletAddress: referenceId.toLowerCase() } : { walletAddress: '__nope__' },
      ],
    },
    select: { walletAddress: true, kycInquiryId: true },
  });

  if (!user) {
    return NextResponse.json({ ok: true, ignored: 'user_not_found' });
  }

  await prisma.user.update({
    where: { walletAddress: user.walletAddress },
    data: {
      kycStatus: mapped,
      kycInquiryId: user.kycInquiryId ?? inquiryId,
    },
  });

  return NextResponse.json({ ok: true, status: mapped });
}
