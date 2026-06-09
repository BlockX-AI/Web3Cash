import crypto from 'node:crypto';

/**
 * Persona KYC integration.
 * Docs: https://docs.withpersona.com/docs/inquiries
 *
 * Required env:
 *   PERSONA_API_KEY        — server-to-server bearer token
 *   PERSONA_TEMPLATE_ID    — inquiry template (itmpl_xxx)
 *   PERSONA_WEBHOOK_SECRET — HMAC secret used to verify inbound webhooks
 *
 * Flow:
 *   1. POST /api/v1/inquiries → returns inquiry id + one-time URL
 *   2. User completes KYC in their browser
 *   3. Persona POSTs to /api/kyc/persona/webhook with HMAC-signed body
 *   4. We update User.kycStatus based on inquiry.attributes.status
 */

const API_ROOT = 'https://api.withpersona.com/api/v1';

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is required`);
  return v;
}

interface CreateInquiryResponse {
  data: {
    id: string;
    type: 'inquiry';
    attributes: {
      'session-token'?: string;
      status: string;
    };
  };
  meta?: { 'one-time-link'?: string };
}

export async function createInquiry(params: {
  userWallet: string;
  email?: string;
}): Promise<{ inquiryId: string; oneTimeLink: string | null; sessionToken: string | null }> {
  const apiKey = requireEnv('PERSONA_API_KEY');
  const templateId = requireEnv('PERSONA_TEMPLATE_ID');

  const res = await fetch(`${API_ROOT}/inquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Persona-Version': '2023-01-05',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          'inquiry-template-id': templateId,
          // reference-id lets Persona echo a stable id back via webhook.
          'reference-id': params.userWallet.toLowerCase(),
          fields: params.email ? { 'email-address': params.email } : undefined,
        },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Persona inquiry create failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as CreateInquiryResponse;
  return {
    inquiryId: json.data.id,
    oneTimeLink: json.meta?.['one-time-link'] ?? null,
    sessionToken: json.data.attributes['session-token'] ?? null,
  };
}

/**
 * Verify an inbound webhook. Persona sends `Persona-Signature: t=<ts>,v1=<hmac>`.
 * We recompute HMAC-SHA256(`${ts}.${rawBody}`, webhookSecret) and constant-time
 * compare to v1.
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  toleranceSeconds?: number;
}): boolean {
  if (!params.signatureHeader) return false;
  const secret = process.env.PERSONA_WEBHOOK_SECRET;
  if (!secret) return false;

  const parts = Object.fromEntries(
    params.signatureHeader.split(',').map((p) => {
      const [k, v] = p.trim().split('=');
      return [k ?? '', v ?? ''];
    }),
  );
  const ts = parts.t;
  const sig = parts.v1;
  if (!ts || !sig) return false;

  const tolerance = params.toleranceSeconds ?? 300;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  if (Math.abs(Date.now() / 1000 - tsNum) > tolerance) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${params.rawBody}`)
    .digest('hex');

  if (expected.length !== sig.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

export interface PersonaWebhookEvent {
  data?: {
    type?: string;
    attributes?: {
      name?: string;
      payload?: {
        data?: {
          id?: string;
          attributes?: {
            status?: string;
            'reference-id'?: string;
          };
        };
      };
    };
  };
}

/** Map Persona inquiry status → our KycStatus enum. */
export function mapPersonaStatus(
  status: string | undefined,
): 'PENDING' | 'VERIFIED' | 'REJECTED' | null {
  if (!status) return null;
  switch (status.toLowerCase()) {
    case 'completed':
    case 'approved':
      return 'VERIFIED';
    case 'declined':
    case 'failed':
    case 'expired':
      return 'REJECTED';
    case 'created':
    case 'pending':
    case 'needs_review':
    case 'started':
      return 'PENDING';
    default:
      return null;
  }
}
