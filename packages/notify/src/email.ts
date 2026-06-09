/**
 * Email notification service via Resend.
 * https://resend.com/docs/api-reference/emails/send-email
 *
 * Required env:
 *   RESEND_API_KEY  — from https://resend.com
 *   NOTIFY_FROM     — sender address (default: noreply@web3cash.xyz)
 */

const FROM = process.env.NOTIFY_FROM ?? 'Web3Cash <noreply@web3cash.xyz>';
const BASE = 'https://api.resend.com';

function apiKey(): string {
  const k = process.env.RESEND_API_KEY;
  if (!k) throw new Error('RESEND_API_KEY not set');
  return k;
}

async function send(payload: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const res = await fetch(`${BASE}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, ...payload }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed ${res.status}: ${body}`);
  }
}

/* ── Typed email senders ───────────────────────────────────────────────── */

export async function sendQuestVerified(params: {
  to: string;
  walletAddress: string;
  questTitle: string;
  rewardUsdc: string;
  releaseAt: Date;
}): Promise<void> {
  const shortWallet = `${params.walletAddress.slice(0, 6)}…${params.walletAddress.slice(-4)}`;
  const releaseDate = params.releaseAt.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  await send({
    to: params.to,
    subject: `Quest verified — $${params.rewardUsdc} USDC incoming`,
    html: `
      <h2>Quest Verified ✅</h2>
      <p>Your completion of <strong>${params.questTitle}</strong> has been verified.</p>
      <p><strong>Reward:</strong> $${params.rewardUsdc} USDC</p>
      <p><strong>Releases on:</strong> ${releaseDate}</p>
      <p><em>Wallet: ${shortWallet}</em></p>
      <hr/>
      <p><a href="${process.env.FRONTEND_URL ?? 'https://app.web3cash.xyz'}/dashboard">View your dashboard →</a></p>
    `,
    text: `Quest verified! Your $${params.rewardUsdc} USDC reward releases on ${releaseDate}.`,
  });
}

export async function sendPayoutConfirmed(params: {
  to: string;
  walletAddress: string;
  amountUsdc: string;
  txHash: string;
}): Promise<void> {
  const shortWallet = `${params.walletAddress.slice(0, 6)}…${params.walletAddress.slice(-4)}`;
  await send({
    to: params.to,
    subject: `$${params.amountUsdc} USDC sent to your wallet`,
    html: `
      <h2>Payment Confirmed 💸</h2>
      <p><strong>Amount:</strong> $${params.amountUsdc} USDC</p>
      <p><strong>Wallet:</strong> ${shortWallet}</p>
      <p><strong>Transaction:</strong> <a href="https://etherscan.io/tx/${params.txHash}">${params.txHash.slice(0, 18)}…</a></p>
      <hr/>
      <p><a href="${process.env.FRONTEND_URL ?? 'https://app.web3cash.xyz'}/dashboard">View your dashboard →</a></p>
    `,
    text: `$${params.amountUsdc} USDC has been sent to your wallet. TX: ${params.txHash}`,
  });
}

export async function sendPayoutFailed(params: {
  to: string;
  walletAddress: string;
  amountUsdc: string;
  reason?: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `Payout failed — $${params.amountUsdc} USDC restored to balance`,
    html: `
      <h2>Payout Failed ⚠️</h2>
      <p>Your withdrawal of <strong>$${params.amountUsdc} USDC</strong> could not be processed.</p>
      <p>Your balance has been restored. Please try withdrawing again from your dashboard.</p>
      ${params.reason ? `<p><em>Reason: ${params.reason}</em></p>` : ''}
      <hr/>
      <p><a href="${process.env.FRONTEND_URL ?? 'https://app.web3cash.xyz'}/dashboard">Retry withdrawal →</a></p>
    `,
    text: `Payout of $${params.amountUsdc} USDC failed. Balance restored. Please retry.`,
  });
}

export async function sendKycApproved(params: {
  to: string;
  walletAddress: string;
}): Promise<void> {
  const shortWallet = `${params.walletAddress.slice(0, 6)}…${params.walletAddress.slice(-4)}`;
  await send({
    to: params.to,
    subject: 'KYC Verified — withdrawals unlocked',
    html: `
      <h2>Identity Verified ✅</h2>
      <p>Your KYC for wallet <strong>${shortWallet}</strong> has been approved.</p>
      <p>You can now withdraw more than $500 USDC without restrictions.</p>
      <hr/>
      <p><a href="${process.env.FRONTEND_URL ?? 'https://app.web3cash.xyz'}/dashboard">Go to dashboard →</a></p>
    `,
    text: 'Your KYC has been verified. Withdrawals above $500 USDC are now unlocked.',
  });
}

export async function sendReferralEarning(params: {
  to: string;
  refereeWallet: string;
  amountUsdc: string;
  level: number;
}): Promise<void> {
  const shortReferee = `${params.refereeWallet.slice(0, 6)}…${params.refereeWallet.slice(-4)}`;
  await send({
    to: params.to,
    subject: `Referral bonus — $${params.amountUsdc} USDC earned`,
    html: `
      <h2>Referral Bonus Earned 🎉</h2>
      <p>Your Level ${params.level} referral <strong>${shortReferee}</strong> completed a quest.</p>
      <p><strong>Bonus:</strong> $${params.amountUsdc} USDC added to your pending balance.</p>
      <hr/>
      <p><a href="${process.env.FRONTEND_URL ?? 'https://app.web3cash.xyz'}/dashboard">View earnings →</a></p>
    `,
    text: `Referral bonus: $${params.amountUsdc} USDC from level ${params.level} referral.`,
  });
}
