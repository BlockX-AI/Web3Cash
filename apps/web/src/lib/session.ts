import { cookies } from 'next/headers';
import { verifySession } from '@web3cash/auth';

/** Returns the authenticated wallet (lowercase) or null. */
export async function getSessionWallet(): Promise<string | null> {
  const token = cookies().get('w3c_session')?.value;
  if (!token) return null;
  const claims = await verifySession(token);
  return claims?.sub?.toLowerCase() ?? null;
}
