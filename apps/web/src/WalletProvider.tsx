import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider, useAccount, useSignMessage, http } from 'wagmi';
import { mainnet, polygon, arbitrum } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createSiweMessage } from 'viem/siwe';
import { authApi, type AuthUser } from './api';

/* ── wagmi config ───────────────────────────────────────────────────────── */

const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined;

const wagmiConfig = getDefaultConfig({
  appName: 'Web3Cash',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'web3cash-dev',
  chains: [mainnet, polygon, arbitrum],
  transports: {
    [mainnet.id]: http(
      alchemyKey ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}` : 'https://eth.llamarpc.com',
    ),
    [polygon.id]: http(
      alchemyKey ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}` : 'https://polygon-rpc.com',
    ),
    [arbitrum.id]: http(
      alchemyKey ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}` : 'https://arb1.arbitrum.io/rpc',
    ),
  },
  ssr: false,
});

const queryClient = new QueryClient();

/* ── Auth context ───────────────────────────────────────────────────────── */

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: false,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/* ── Inner provider (needs wagmi hooks) ─────────────────────────────────── */

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, chainId, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const siweAttempted = useRef(false);

  const signIn = useCallback(async () => {
    if (!address || !chainId) return;
    setLoading(true);
    try {
      const { nonce } = await authApi.nonce();
      const message = createSiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Web3Cash. This will not trigger a transaction or cost any gas.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });
      const signature = await signMessageAsync({ message });
      const result = await authApi.verify(message, signature);
      if (result.success) {
        const me = await authApi.me();
        setUser(me);
      }
    } catch (e) {
      console.error('SIWE sign-in failed:', e);
    } finally {
      setLoading(false);
    }
  }, [address, chainId, signMessageAsync]);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  // Check for existing session on mount (cookie-based restore)
  useEffect(() => {
    authApi.me().then(setUser).catch(() => setUser(null)).finally(() => setSessionChecked(true));
  }, []);

  // Reset SIWE attempt flag when wallet address changes (new connection)
  useEffect(() => {
    siweAttempted.current = false;
  }, [address]);

  // Clear session when wallet disconnects
  useEffect(() => {
    if (!isConnected) { setUser(null); siweAttempted.current = false; }
  }, [isConnected]);

  // Auto-trigger SIWE once after wallet connects — only if no session exists and not already attempted
  useEffect(() => {
    if (sessionChecked && isConnected && address && chainId && !user && !loading && !siweAttempted.current) {
      siweAttempted.current = true;
      signIn();
    }
  }, [sessionChecked, isConnected, address]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ── Top-level provider ─────────────────────────────────────────────────── */

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <AuthProvider>{children}</AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
