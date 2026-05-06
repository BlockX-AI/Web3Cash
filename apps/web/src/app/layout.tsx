import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SkipToContent } from '@/components/skip-to-content';
import { ThemeSwitch } from '@/components/theme-switch';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

export const dynamic = 'force-dynamic';

const sans = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Web3Cash — Earn Real USDC for Web3 Actions',
  description: 'The first on-chain quest platform where projects pay users directly via smart contracts. No middlemen. No delays. Just instant USDC rewards.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} relative min-h-screen bg-background font-sans text-foreground antialiased`}>
        <Providers>
          <SkipToContent />
          <Header />
          <ThemeSwitch />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
