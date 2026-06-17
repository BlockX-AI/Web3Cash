import { ArrowRight, Wallet, LogOut, Zap, Menu, X } from 'lucide-react';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import "./badge.css";
import EdelGlobeSection from './EdelGlobeSection';
import Footer from './Footer';
import FAQSection from './FAQSection';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useAuth } from './WalletProvider';
import { WaitlistModal } from './WaitlistModal';
import { questsApi, type Quest } from './api';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://webcash-production.up.railway.app';



const heroVideo =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4';

const useCasesVideo =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_183428_ab5e672a-f608-4dcb-b319-f3e040f02e2d.mp4';

const bloomImage =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260423_164207_f243351d-ed59-48ec-83a0-a5e996bdbe3c.png&w=1280&q=85';

type Brand = {
  name: string;
  style: React.CSSProperties;
  logo?: string;
};



function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M 128.005 191.173 C 128.448 156.208 156.93 128 192 128 L 192 64 L 128 64 C 128 99.346 99.346 128 64 128 L 64 192 L 128 192 Z M 192 256 L 64 256 C 28.654 256 0 227.346 0 192 L 0 64 L 64 64 L 64 0 L 192 0 C 227.346 0 256 28.654 256 64 L 256 192 L 192 192 Z" />
    </svg>
  );
}

function ArrowPill({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-3 rounded-full bg-black py-2 pl-8 pr-2 text-base font-medium text-white transition-colors duration-200 hover:bg-gray-800 md:text-lg"
    >
      <span>{children}</span>
      <span className="rounded-full bg-white p-2 transition-colors duration-200 hover:bg-white">
        <ArrowRight className="h-5 w-5 text-black" aria-hidden="true" />
      </span>
    </button>
  );
}

function Navbar({ onWaitlist }: { onWaitlist: () => void }) {
  const links = ['Platform', 'For Projects', 'Pricing', 'About'];
  const { user, signIn, signOut, loading, error } = useAuth();
  const { isConnected } = useAccount();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <nav className="absolute left-0 right-0 top-0 z-40 px-4 sm:px-6 md:px-8 py-5">
      <div className="mx-auto flex max-w-[88rem] items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-black">
          <LogoIcon className="h-7 w-7" />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <button
              key={link}
              onClick={onWaitlist}
              className="text-base font-medium text-gray-700 transition-colors duration-200 hover:text-black"
            >
              {link}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3 relative">
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
              const ready = mounted;
              const connected = ready && account && chain;
              return (
                <div {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                  {!connected ? (
                    <button
                      onClick={openConnectModal}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
                    >
                      <Wallet className="h-4 w-4" />
                      Sign In
                    </button>
                  ) : !user ? (
                    <button
                      onClick={signIn}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-full bg-[#564c8c] px-4 py-2 text-sm text-white hover:bg-[#3f3870] disabled:opacity-60"
                    >
                      Sign Message
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openAccountModal}
                        className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-gray-200 px-4 py-2 text-sm text-black hover:bg-gray-50"
                      >
                        {account.displayName}
                      </button>
                      <button
                        onClick={signOut}
                        className="rounded-full border border-gray-200 p-2 text-gray-500 hover:text-black"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>
          {!user && (
            <button
              type="button"
              onClick={onWaitlist}
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
            >
              Start Earning
            </button>
          )}
          {error && (
            <div className="absolute right-0 top-12 w-72 rounded-xl border border-red-100 bg-white p-3 text-xs text-red-600 shadow-lg">
              {error}
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          className="md:hidden inline-flex items-center justify-center rounded-full bg-black/90 p-2 text-white"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-white md:hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-5">
            <a href="/" className="flex items-center gap-2 text-black" onClick={() => setMobileOpen(false)}>
              <LogoIcon className="h-7 w-7" />
            </a>
            <button
              type="button"
              aria-label="Close menu"
              className="inline-flex items-center justify-center rounded-full bg-black/90 p-2 text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col gap-2 px-6 pt-8">
            {links.map((link) => (
              <button
                key={link}
                onClick={() => { setMobileOpen(false); onWaitlist(); }}
                className="border-b border-black/10 py-4 text-2xl font-medium text-black text-left"
              >
                {link}
              </button>
            ))}
          </div>
          <div className="mt-auto px-6 pb-10 flex flex-col gap-3">
            <ConnectButton.Custom>
              {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
                const ready = mounted;
                const connected = ready && account && chain;
                return (
                  <div {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                    {!connected ? (
                      <button
                        onClick={() => { setMobileOpen(false); openConnectModal(); }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-base text-white hover:bg-gray-800"
                      >
                        <Wallet className="h-4 w-4" />
                        Connect Wallet
                      </button>
                    ) : !user ? (
                      <button
                        onClick={() => { setMobileOpen(false); signIn(); }}
                        disabled={loading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#564c8c] px-4 py-3 text-base text-white"
                      >
                        {loading ? 'Signing in…' : 'Sign In with Wallet'}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setMobileOpen(false); openAccountModal(); }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white border border-gray-200 px-4 py-3 text-base text-black"
                      >
                        {account?.displayName}
                      </button>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
            {!user && (
              <button
                type="button"
                onClick={() => { setMobileOpen(false); onWaitlist(); }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-base text-white hover:bg-gray-800"
              >
                Start Earning
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}



function GoogleIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function HeroSection({ onWaitlist }: { onWaitlist: () => void }) {
  const { address, isConnected, chainId } = useAccount();
  const { signIn } = useAuth();
  const { signMessageAsync } = useSignMessage();
  const navigate = useNavigate();
  const [googleAuthed, setGoogleAuthed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user has Google auth (using localStorage for cross-domain reliability)
  useEffect(() => {
    const googleAuth = localStorage.getItem('w3c_google_auth');
    if (googleAuth === 'success') {
      setGoogleAuthed(true);
    }
  }, []);

  const handleGoogleSignIn = () => {
    window.location.href = `${API_URL}/api/auth/google/start`;
  };

  const handleConnectWallet = async () => {
    if (!isConnected || !address || !chainId) {
      alert('Please connect your wallet first');
      return;
    }
    setLoading(true);
    try {
      const nonceRes = await fetch(`${API_URL}/api/auth/nonce`, { credentials: 'include' });
      const { nonce } = await nonceRes.json();

      const siweMessage = [
        `${window.location.host} wants you to sign in with your Ethereum account:`,
        address,
        '',
        'Sign in to Web3Cash. This will not trigger a transaction or cost any gas.',
        '',
        `URI: ${window.location.origin}`,
        'Version: 1',
        `Chain ID: ${chainId}`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join('\n');

      const signature = await signMessageAsync({ message: siweMessage });

      const res = await fetch(`${API_URL}/api/auth/google/link-wallet`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: siweMessage,
          signature,
          offer18ClickId: localStorage.getItem('o18_click_id') ?? undefined,
          offer18AffId: localStorage.getItem('o18_aff_id') ?? undefined,
          offer18OfferId: localStorage.getItem('o18_offer_id') ?? undefined,
          referredByCode: localStorage.getItem('w3c_ref') ?? undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to link wallet');

      await signIn();
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      alert(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-1 items-end px-0 pb-6 pt-0 h-screen">
      <div
        className="fixed inset-0 w-full h-screen overflow-hidden z-0"
      >
        <video
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="relative z-10 mx-auto w-full max-w-[88rem] flex h-full flex-col items-start justify-start pr-6 pl-6 pt-28 sm:pt-36 md:pr-12 md:pl-8 md:pt-56 lg:pt-64 md:-translate-x-6 pointer-events-auto">
          <div className="network-badge mb-6 inline-flex items-center gap-2 rounded-full bg-white/40 backdrop-blur-sm px-3 py-1 text-sm font-medium text-black/70">
            <span className="text-sm text-black font-bold">Complete</span>
            <span className="text-[#564c8c] font-semibold">Quest Get Paid in USDC</span>
          </div>
          <h1
            className="mb-6 max-w-3xl text-3xl sm:text-4xl md:text-5xl lg:text-7xl leading-tight text-black"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Earn Real Cash
            <br />
           <span
             style={{
               color: '#564c8c',
               display: 'inline-block',
               textShadow:
                 '0 1px 0 rgba(255,255,255,0.02), 0 2px 0 rgba(0,0,0,0.06), 0 6px 18px rgba(0,0,0,0.12), 0 8px 24px rgba(110,68,255,0.08)',
               transform: 'translateY(-1px)',
             }}
           >
             From Web3
           </span>
          </h1>

          <div className="flex flex-col sm:flex-row items-start gap-3">
            {!googleAuthed ? (
              // Step 1: Google auth (mandatory)
              <button
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-3 rounded-full bg-white border border-gray-200 py-2.5 pl-5 pr-5 text-base font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-300 md:text-lg"
              >
                <GoogleIcon />
                <span>Sign in with Google</span>
              </button>
            ) : !isConnected ? (
              // Step 2: Connect wallet (after Google auth)
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="inline-flex items-center gap-3 rounded-full bg-black py-2.5 pl-5 pr-5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-gray-800 md:text-lg"
                  >
                    <span>Connect Wallet</span>
                  </button>
                )}
              </ConnectButton.Custom>
            ) : (
              // Step 3: Complete registration
              <button
                onClick={handleConnectWallet}
                disabled={loading}
                className="inline-flex items-center gap-3 rounded-full bg-[#564c8c] py-2.5 pl-5 pr-5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#3f3870] disabled:opacity-60 md:text-lg"
              >
                {loading ? 'Connecting...' : 'Complete Registration'}
              </button>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

function InfoSection() {
  const { user, signIn, loading } = useAuth();
  const { isConnected } = useAccount();

  return (
    <section className="bg-white px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24 rounded-t-3xl shadow-sm relative z-20">
      <div className="mx-auto max-w-[88rem]">
        <div className="mb-12 sm:mb-16 grid grid-cols-1 items-start gap-8 sm:gap-12 md:grid-cols-2">
          <div>
            <h2
              className="mb-8 text-3xl sm:text-4xl md:text-5xl font-medium leading-tight text-black"
              style={{ letterSpacing: '-0.03em' }}
            >
              Meet WEB 3 Cash
            </h2>
            {user ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-[#564c8c] py-2 pl-6 pr-2 text-base font-medium text-white">
                <span>Welcome, {user.walletAddress.slice(0, 6)}…{user.walletAddress.slice(-4)}</span>
                <span className="rounded-full bg-white p-2">
                  <Wallet className="h-5 w-5 text-[#564c8c]" />
                </span>
              </div>
            ) : isConnected ? (
              <button
                onClick={signIn}
                disabled={loading}
                className="inline-flex items-center gap-3 rounded-full bg-[#564c8c] py-2 pl-8 pr-2 text-base font-medium text-white transition-colors duration-200 hover:bg-[#3f3870] disabled:opacity-60 md:text-lg"
              >
                <span>{loading ? 'Signing in…' : 'Sign In with Wallet'}</span>
                <span className="rounded-full bg-white p-2">
                  <ArrowRight className="h-5 w-5 text-[#564c8c]" />
                </span>
              </button>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal: openModal }) => (
                  <button
                    onClick={openModal}
                    className="inline-flex items-center gap-3 rounded-full bg-black py-2 pl-8 pr-2 text-base font-medium text-white transition-colors duration-200 hover:bg-gray-800 md:text-lg"
                  >
                    <span>Connect Wallet</span>
                    <span className="rounded-full bg-white p-2">
                      <ArrowRight className="h-5 w-5 text-black" />
                    </span>
                  </button>
                )}
              </ConnectButton.Custom>
            )}
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-black/70">
           The performance <span className="font-bold">marketing network</span> for Web3 where users earn real USDC and projects pay only
for verified on-chain actions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 px-0">
          <article
            className="min-h-[18rem] sm:min-h-80 rounded-2xl bg-cover bg-center p-4 sm:p-7 sm:col-span-2 lg:col-span-2 overflow-hidden"
            style={{ backgroundImage: `url(${bloomImage})` }}
          >
            <div className="flex w-full h-full min-h-[18rem] sm:min-h-80 flex-col justify-between">
              <h3
                className="text-2xl font-medium leading-snug text-black"
                style={{ letterSpacing: '-0.02em' }}
              >
               Earn while exploring Web3
              </h3>
              <p className="max-w-xs text-base text-black/70">
               Discover new apps, complete simple on chain actions, and get rewarded in real USDC.
              </p>
            </div>
          </article>

          <InfoCard
            title={
              <>
                Proof 
                <br />
                over hype
              </>
            }
          >
           Every reward is tied to verified wallet activity not fake clicks or vanity engagement.
          </InfoCard>

          <InfoCard
            title={
              <>
                
            Trusted reward infrastructure
              </>
            }
          >
          Escrow-backed campaigns and anti-bot verification create a fairer system for users and projects.
          </InfoCard>
        </div>
      </div>
    </section>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="flex min-h-[18rem] sm:min-h-80 flex-col justify-between rounded-2xl bg-[#2B2644] p-6 sm:p-7">
      <h3 className="text-2xl font-medium leading-snug text-white">{title}</h3>
      <p className="text-base text-white/60">{children}</p>
    </article>
  );
}



function UseCasesSection() {
  const cardsData = [
    {
      title: 'Twitter Influencer',
      cost: '$80–$400',
      note: 'Avg cost per user',
      verified: { ok: false, text: 'On-chain verified: No' },
      image: '/why4.png',
    },
    {
      title: 'Airdrop Farmers',
      cost: '$2–$5',
      note: 'Avg cost per user',
      verified: { ok: false, text: 'On-chain verified: No (bots)' },
      image: '/why2.png',
    },
    {
      title: 'Web3Cash Campaign',
      cost: '$15–$25',
      note: 'Avg cost per user',
      verified: { ok: true, text: 'On-chain verified: ✓ 100% Verified' },
      image: '/why3.png',
    },
  ];

  const [activeCard, setActiveCard] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setActiveCard((a) => (a + 1) % cardsData.length), 3000);
    return () => clearInterval(id);
  }, []);

  function formatCompact(n: number) {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
    return `${n}`;
  }

  function CountUp({ end, duration = 1500, prefix = '', suffix = '' }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
    const ref = React.useRef<HTMLSpanElement | null>(null);
    const [value, setValue] = React.useState(0);
    const started = React.useRef(false);

    React.useEffect(() => {
      const el = ref.current?.closest('[data-usecases-stats]') as Element | null;
      if (!el) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const from = 0;
            const animate = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - t, 3);
              const current = Math.round(from + (end - from) * eased);
              setValue(current);
              if (t < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          }
        });
      }, { threshold: 0.2 });
      io.observe(el);
      return () => io.disconnect();
    }, [end, duration]);

    return (
      <span ref={ref}>
        {prefix}
        {formatCompact(value)}
        {suffix}
      </span>
    );
  }
  return (
    <section className="bg-[#f5f5f5] px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24 relative z-20">
      <div className="mx-auto grid max-w-[88rem] grid-cols-1 items-stretch gap-6 sm:gap-8 md:grid-cols-2">

        {/* LEFT — platform image (fallback) + video (production) + stats overlay */}
        <article className="relative min-h-[420px] sm:min-h-[560px] md:min-h-[720px] overflow-hidden rounded-3xl flex bg-[#f0eeff]">
          {/* Always-visible fallback image for localhost (video is CORS-blocked) */}
          <img
            src="/platform.png"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {/* Production video — loads on top of image when available */}
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={useCasesVideo}
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="relative z-10 p-6 sm:p-8 md:p-12 flex-1 h-full flex flex-col justify-start items-start" data-usecases-stats>
            <div className="w-full">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-[#564c8c]">The platform that pays for real</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 items-start w-full">
                <div className="flex flex-col items-start">
                  <div className="text-[28px] sm:text-[36px] md:text-[48px] lg:text-[56px] font-extrabold text-[#564c8c] leading-none whitespace-nowrap">
                    <CountUp end={2400000} /><span className="text-xl align-top">+</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">Total cashback paid</div>
                </div>
                <div className="flex flex-col items-start">
                  <div className="text-[28px] sm:text-[36px] md:text-[48px] lg:text-[56px] font-extrabold text-[#564c8c] leading-none whitespace-nowrap">
                    <CountUp end={38000} /><span className="text-xl align-top">+</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">Active earners globally</div>
                </div>
                <div className="flex flex-col items-start">
                  <div className="text-[28px] sm:text-[36px] md:text-[48px] lg:text-[56px] font-extrabold text-[#564c8c] leading-none whitespace-nowrap">
                    <CountUp end={240} /><span className="text-xl align-top">+</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">Web3 projects listed</div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* RIGHT — frosted-glass card + headline + cycling why*.png screenshots */}
        <article className="relative min-h-[420px] sm:min-h-[560px] md:min-h-[720px] overflow-hidden rounded-3xl flex">
          <div className="relative z-10 p-5 sm:p-8 md:p-10 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm flex-1 h-full flex flex-col justify-between">
            <div>
              <h2 className="mb-6 sm:mb-8 text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-black uppercase">
                <span className="block">
                  Web3 projects <span className="text-[#564c8c]">spent $4–6B</span> on marketing
                  in 2023 with less than 5% measurable ROI.
                  <span className="text-[#564c8c]">Web3Cash gives you real CPI infrastructure </span>
                </span>
                <span className="block">like Web2 has, but for dApps.</span>
              </h2>
            </div>
            {/* Full-width cycling campaign comparison screenshots */}
            <div className="relative w-full">
              <div className="relative w-full h-full overflow-hidden">
                {cardsData.map((c, i) => (
                  <div
                    key={c.title}
                    className={`w-full transition-opacity duration-700 ease-in-out ${
                      i === activeCard ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'
                    }`}
                  >
                    <div className="w-full">
                      <img
                        src={c.image}
                        alt={c.title}
                        className="w-full rounded-2xl object-cover shadow-md"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function CampaignCard({
  title,
  cost,
  note,
  verified,
  image,
}: {
  title: string;
  cost: string;
  note?: string;
  verified?: { ok: boolean; text: string };
  image?: string;
}) {
  const gradient = verified?.ok
    ? 'linear-gradient(135deg, #1a1033 0%, #2d1f5e 50%, #564c8c 100%)'
    : 'linear-gradient(135deg, #1a1a2e 0%, #2d2060 50%, #3d2a78 100%)';
  return (
    <div
      className="rounded-2xl overflow-hidden flex items-stretch min-h-[160px] sm:min-h-[200px]"
      style={{ background: gradient }}
    >
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="text-sm font-medium text-white/50">{title}</div>
          <div className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">{cost}</div>
          {note && <div className="mt-1 text-sm text-white/40">{note}</div>}
        </div>
        <div className={`text-sm font-semibold ${verified?.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {verified?.text}
        </div>
      </div>
      {image && (
        <div className="w-[120px] sm:w-[160px] flex-shrink-0 relative overflow-hidden">
          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        </div>
      )}
    </div>
  );
}

function LiveQuestsSection() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const draggedRef = useRef(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const goToDashboard = () => { window.location.href = '/dashboard'; };

  useEffect(() => {
    let attempts = 0;
    const MAX = 3;
    function tryFetch() {
      questsApi
        .list()
        .then((r) => { setQuests(r.quests); setLoading(false); })
        .catch(() => {
          attempts++;
          if (attempts < MAX) setTimeout(tryFetch, 1200 * attempts);
          else setLoading(false);
        });
    }
    tryFetch();
  }, []);

  // Mouse drag scroll for desktop
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !carouselRef.current) return;
      e.preventDefault();
      const x = e.pageX - carouselRef.current.getBoundingClientRect().left;
      const walk = (x - startX.current) * 1.5;
      carouselRef.current.scrollLeft = startScrollLeft.current - walk;
      draggedRef.current = true;
    };
    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (carouselRef.current) carouselRef.current.style.cursor = 'grab';
      setTimeout(() => { draggedRef.current = false; }, 50);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.pageX - el.getBoundingClientRect().left;
    startScrollLeft.current = el.scrollLeft;
    el.style.cursor = 'grabbing';
  };

  /* ── render ─────────────────────────────────────────────────────────────── */

  const QUEST_LOGO: Record<string, string> = {
    visit: 'https://runner.now/favicon.ico',
    download: 'https://runner.now/favicon.ico',
    wallet_connect: 'https://avatars.githubusercontent.com/u/37784886?s=48&v=4',
    telegram_join: 'https://telegram.org/favicon.ico',
    github_star: 'https://github.com/favicon.ico',
    twitter_follow: 'https://abs.twimg.com/favicons/twitter.2.ico',
    discord_join: 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0b5493894cf60b300587_full_logo_white_RGB.svg',
  };

  const QUEST_GRADIENT: Record<string, string> = {
    download: 'linear-gradient(135deg, #1a1033 0%, #2d1f5e 50%, #3d2a78 100%)',
    visit: 'linear-gradient(135deg, #1a1033 0%, #2d1f5e 50%, #3d2a78 100%)',
    twitter_follow: 'linear-gradient(135deg, #00172d 0%, #003a6b 50%, #1da1f2 100%)',
    discord_join: 'linear-gradient(135deg, #0d0f1a 0%, #1a1d3a 50%, #5865f2 100%)',
    telegram_join: 'linear-gradient(135deg, #001a2c 0%, #00345e 50%, #229ed9 100%)',
    github_star: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #58a6ff 100%)',
    wallet_connect: 'linear-gradient(135deg, #0a1628 0%, #1a2f5e 50%, #3b82f6 100%)',
  };

  function getQuestLogo(type: string, title: string): string | null {
    const t = type.toLowerCase().replace(/ /g, '_');
    if (title.toLowerCase().includes('runner')) return 'https://runner.now/favicon.ico';
    return QUEST_LOGO[t] ?? null;
  }

  function getQuestGradient(type: string): string {
    const t = type.toLowerCase().replace(/ /g, '_');
    return QUEST_GRADIENT[t] ?? 'linear-gradient(135deg, #1a1033 0%, #2d1f5e 50%, #564c8c 100%)';
  }

  return (
    <section className="bg-[#F5F5F5] relative z-20 w-full py-4 lg:py-8 border-y-[2px] border-[#DDDDDD]">
      <div className="relative min-h-[480px]">
        {/* Vertical "LIVE QUESTS" heading — matches New-project-master 2 exactly */}
        <div className="absolute left-6 top-[100%] -translate-y-1/2 hidden md:flex items-center pointer-events-none">
          <h2
            aria-hidden
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight bg-gradient-to-r from-[#564c8b] to-[#0f0f0f] text-transparent bg-clip-text transform -rotate-90 origin-left px-2 drop-shadow-sm whitespace-nowrap"
          >
            Live Quests
          </h2>
        </div>

        <div className="pl-0 md:pl-20">
          {/* Mobile heading + More Quests button */}
          <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
            <h2 className="text-2xl font-bold text-black md:hidden">Live Quests</h2>
            <div className="ml-auto">
              <button
                type="button"
                className="launch-btn"
                aria-label="See more quests"
                onClick={() => { goToDashboard(); }}
              >
                More Quests
              </button>
            </div>
          </div>

          {/* Scroll carousel */}
          {loading ? (
            <div className="flex gap-4 px-4 sm:px-6 pb-4 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden flex-shrink-0 w-[85vw] sm:w-[380px] md:w-[560px] max-w-[560px] p-2">
                  <div className="relative h-[220px] sm:h-[280px] md:h-[380px] overflow-hidden rounded-lg bg-gray-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : quests.length === 0 ? (
            <div className="flex gap-4 px-4 sm:px-6 pb-4 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden flex-shrink-0 w-[85vw] sm:w-[380px] md:w-[560px] max-w-[560px] p-2">
                  <div className="relative h-[220px] sm:h-[280px] md:h-[380px] overflow-hidden rounded-lg bg-gray-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div
              ref={carouselRef}
              className="overflow-x-auto no-scrollbar pl-4 sm:pl-6 cursor-grab select-none"
              style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
              onMouseDown={handleMouseDown}
            >
              <div className="flex flex-nowrap gap-4 py-4 pr-4 sm:pr-6">
                {quests.map((q) => {
                  const isRunner = q.title.toLowerCase().includes('runner');
                  const logo = getQuestLogo(q.type, q.title);
                  const gradient = getQuestGradient(q.type);
                  const progress = Math.min(100, Math.round((q.completionsCount / q.maxCompletions) * 100));

                  const req = q.requirements as Record<string, string>;

                  const getExternalLink = (): string | null => {
                    if (q.type === 'GITHUB_STAR' && req.owner && req.repo)
                      return `https://github.com/${req.owner}/${req.repo}`;
                    if (q.type === 'TWITTER_FOLLOW' && req.targetHandle)
                      return `https://x.com/${req.targetHandle}`;
                    if (q.type === 'TELEGRAM_JOIN')
                      return req.inviteLink ?? `https://t.me/c/${req.chatId?.replace('-100', '')}`;
                    if (q.type === 'DISCORD_JOIN' && req.inviteUrl)
                      return req.inviteUrl;
                    return null;
                  };

                  const getButtonLabel = (): string => {
                    if (isRunner) return 'Download';
                    if (q.type === 'GITHUB_STAR') return 'Star on GitHub';
                    if (q.type === 'TWITTER_FOLLOW') return 'Follow on X';
                    if (q.type === 'TELEGRAM_JOIN') return 'Join Telegram';
                    if (q.type === 'DISCORD_JOIN') return 'Join Discord';
                    return 'Start';
                  };

                  const handleClick = () => {
                    if (draggedRef.current) return;
                    if (isRunner) {
                      const baseUrl = 'https://runner.now/download/runalex';
                      const clickId = localStorage.getItem('o18_click_id');
                      const affId = localStorage.getItem('o18_aff_id');
                      const offerId = localStorage.getItem('o18_offer_id');
                      const url = new URL(baseUrl);
                      if (clickId) url.searchParams.set('click_id', clickId);
                      if (affId) url.searchParams.set('aff_id', affId);
                      if (offerId) url.searchParams.set('offer_id', offerId);
                      window.open(url.toString(), '_blank', 'noopener,noreferrer');
                    } else {
                      const link = getExternalLink();
                      if (link) window.open(link, '_blank', 'noopener,noreferrer');
                    }
                  };

                  return (
                    <div
                      key={q.id}
                      onClick={handleClick}
                      className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer flex-shrink-0 w-[85vw] sm:w-[380px] md:w-[560px] max-w-[560px] p-2 hover:shadow-xl transition-shadow select-none"
                    >
                      {/* Top gradient hero area */}
                      <div
                        className="relative rounded-lg overflow-hidden h-[220px] sm:h-[280px] md:h-[360px] flex flex-col justify-between p-4 sm:p-5"
                        style={{ background: gradient }}
                      >
                        {/* Type badge top-left */}
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 w-fit">
                          <Zap className="h-3 w-3 text-white/80" />
                          <span className="text-[10px] sm:text-xs font-semibold text-white/90 uppercase tracking-wider">
                            {q.type.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Title + logo bottom */}
                        <div className="flex items-end justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight truncate">
                              {q.title}
                            </h3>
                            {q.description && (
                              <p className="text-xs text-white/55 mt-0.5 line-clamp-1">{q.description}</p>
                            )}
                          </div>
                          {logo ? (
                            <img
                              src={logo}
                              alt={q.title}
                              className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl object-contain bg-white/10 border border-white/25 p-1.5 flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                              <Zap className="h-5 w-5 text-white/70" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom: reward + progress + CTA */}
                      <div className="px-3 pt-3 pb-1 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-xl sm:text-2xl font-extrabold text-[#564c8c]">
                            ${q.rewardUsdc} USDC
                          </span>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                              <span>{q.completionsCount} done</span>
                              <span>{q.maxCompletions} total</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#564c8c] to-[#8b6bff] transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClick}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#564c8c] px-4 py-2 text-xs font-semibold text-white flex-shrink-0 hover:bg-[#3f3870] transition-colors"
                        >
                          {getButtonLabel()}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const { address } = useAccount();
  const { user } = useAuth();

  // Detect Google auth success from URL param and set localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_auth') === 'success') {
      localStorage.setItem('w3c_google_auth', 'success');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <Routes>
      {/* Admin route */}
      <Route path="/admin" element={<AdminDashboard />} />

      {/* User dashboard route — auth handled inside Dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Landing page */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <main className="flex flex-col bg-[#F5F5F5]">
              <WaitlistModal
                open={waitlistOpen}
                onClose={() => setWaitlistOpen(false)}
                prefillWallet={address}
              />
              <div className="flex h-screen flex-col overflow-hidden bg-[#F5F5F5]">
                <Navbar onWaitlist={() => setWaitlistOpen(true)} />
                <HeroSection onWaitlist={() => setWaitlistOpen(true)} />
              </div>
              <InfoSection />
              <EdelGlobeSection />
              <UseCasesSection />
              <LiveQuestsSection />
              <FAQSection />
              <Footer />
            </main>
          )
        }
      />
    </Routes>
  );
}
