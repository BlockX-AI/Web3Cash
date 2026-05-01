import { issueNonce } from '@web3cash/auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Prisma cannot run on edge

export async function POST() {
  try {
    const nonce = await issueNonce();
    return NextResponse.json({ nonce });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ code: 'NONCE_ERROR', message }, { status: 500 });
  }
}
