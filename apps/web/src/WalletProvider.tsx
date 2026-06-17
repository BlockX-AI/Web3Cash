import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider, useAccount, useSignMessage, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createSiweMessage } from 'viem/siwe';
import { authApi, setToken, getToken, type AuthUser } from './api';

/* ── wagmi config ───────────────────────────────────────────────────────── */

const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined;
const mainnetRpcUrl = alchemyKey ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}` : 'https://ethereum.publicnode.com';

const supportedChains = [
  {
    ...mainnet,
    rpcUrls: {
      ...mainnet.rpcUrls,
      default: { http: [mainnetRpcUrl] },
      public: { http: [mainnetRpcUrl] },
    },
  },
] as const;

const wagmiConfig = getDefaultConfig({
  appName: 'Web3Cash',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'web3cash-dev',
  chains: supportedChains,
  transports: {
    [mainnet.id]: http(mainnetRpcUrl),
  },
  ssr: false,
});

const queryClient = new QueryClient();

/* ── Auth context ───────────────────────────────────────────────────────── */

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: false,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  refreshUser: async () => null,
});

export const useAuth = () => useContext(AuthContext);

/* ── Inner provider (needs wagmi hooks) ─────────────────────────────────── */

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, chainId, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    if (!address || !chainId) return;
    setLoading(true);
    setError(null);
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
        if (result.token) setToken(result.token);
        const me = await authApi.me();
        setUser(me);
      }
    } catch (e) {
      console.error('SIWE sign-in failed:', e);
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [address, chainId, signMessageAsync]);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setError(null);
  }, []);

  // Fetch the current user using the stored token. Returns the user (or null).
  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }
    try {
      const me = await authApi.me();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // Restore session on mount from the stored Bearer token.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut, refreshUser }}>
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
