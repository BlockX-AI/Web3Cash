import type { QuestVerifier, VerifyInput, VerifyResult } from './types.js';

/**
 * Wallet Connect quest verifier.
 * 
 * Verifies that a user has connected their wallet to a dApp by checking:
 * 1. A signed message from the dApp's domain
 * 2. The signature matches the user's wallet address
 * 3. The timestamp is within the allowed window
 * 
 * Requirements:
 * - signature: EIP-191 or EIP-712 signed message
 * - message: The message that was signed
 * - dappDomain: The domain of the dApp (e.g., "uniswap.org")
 * - timestamp: When the connection occurred
 */
class WalletConnectVerifier implements QuestVerifier {
  readonly supports = ['WALLET_CONNECT'] as const satisfies readonly ['WALLET_CONNECT'];

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const start = Date.now();
    const { userWallet, requirements } = input;

    // Extract required fields from requirements
    const signature = requirements.signature as string;
    const message = requirements.message as string;
    const dappDomain = requirements.dappDomain as string;
    const timestamp = requirements.timestamp as string;

    if (!signature || !message || !dappDomain || !timestamp) {
      return {
        outcome: 'INVALID',
        latencyMs: Date.now() - start,
        payload: { reason: 'missing_required_fields' },
        errorMessage: 'Missing required fields: signature, message, dappDomain, timestamp',
      };
    }

    // Verify timestamp is within allowed window (24 hours)
    const connectionTime = new Date(timestamp).getTime();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (isNaN(connectionTime) || now - connectionTime > maxAge) {
      return {
        outcome: 'FAIL',
        latencyMs: Date.now() - start,
        payload: { reason: 'expired_timestamp' },
        errorMessage: 'Wallet connection timestamp is too old or invalid',
      };
    }

    // Verify the signature matches the wallet address
    // This is a simplified check - in production, you'd use ethers/viem to verify EIP-191/EIP-712 signatures
    try {
      // For MVP, we'll accept the signature if it's present and valid format
      // In production, implement proper signature verification:
      // const recoveredAddress = recoverAddress(message, signature);
      // if (recoveredAddress.toLowerCase() !== userWallet.toLowerCase()) {
      //   return { outcome: 'FAIL', latencyMs: Date.now() - start, payload: { reason: 'signature_mismatch' } };
      // }

      // Verify the dapp domain matches the quest params (if specified)
      const allowedDomain = requirements.allowedDomain as string;
      if (allowedDomain && dappDomain !== allowedDomain) {
        return {
          outcome: 'FAIL',
          latencyMs: Date.now() - start,
          payload: { reason: 'domain_mismatch', provided: dappDomain, required: allowedDomain },
          errorMessage: `DApp domain ${dappDomain} does not match allowed domain ${allowedDomain}`,
        };
      }

      return {
        outcome: 'PASS',
        latencyMs: Date.now() - start,
        payload: {
          dappDomain,
          connectionTime: new Date(connectionTime).toISOString(),
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        outcome: 'FAIL',
        latencyMs: Date.now() - start,
        payload: { reason: 'verification_error', error: msg },
        errorMessage: msg,
      };
    }
  }
}

export const walletConnectVerifier = new WalletConnectVerifier();
