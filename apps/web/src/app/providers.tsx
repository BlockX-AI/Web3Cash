'use client';

import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { useState, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';
import { ReducedMotionProvider } from '@/lib/motion';
import { SmoothScroll } from '@/components/smooth-scroll';

function RainbowKitThemed({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const rkTheme = resolvedTheme === 'dark'
    ? darkTheme({ accentColor: '#ffd900', accentColorForeground: 'black', borderRadius: 'medium' })
    : lightTheme({ accentColor: '#ffd900', accentColorForeground: 'black', borderRadius: 'medium' });

  return (
    <RainbowKitProvider theme={rkTheme} modalSize="compact">
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ReducedMotionProvider>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitThemed>
              <SmoothScroll>{children}</SmoothScroll>
            </RainbowKitThemed>
          </QueryClientProvider>
        </WagmiProvider>
      </ReducedMotionProvider>
    </ThemeProvider>
  );
}
