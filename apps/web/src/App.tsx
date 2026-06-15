import { ArrowRight, Wallet, LogOut, Menu, X } from 'lucide-react';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import React, { useState } from "react";
import { Routes, Route, Navigate } from 'react-router-dom';
import "./badge.css";
import EdelGlobeSection from './EdelGlobeSection';
import Footer from './Footer';
import FAQSection from './FAQSection';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useAuth } from './WalletProvider';
import { WaitlistModal } from './WaitlistModal';



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
  const { user, signIn, signOut, loading } = useAuth();
  const { isConnected } = useAccount();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
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

        <div className="hidden md:flex items-center gap-3">
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
                      Connect Wallet
                    </button>
                  ) : !user ? (
                    <button
                      onClick={signIn}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-full bg-[#564c8c] px-4 py-2 text-sm text-white hover:bg-[#3f3870] disabled:opacity-60"
                    >
                      Sign In
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

      {/* Mobile full-screen overlay */}
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
                  <div className="w-full" {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
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
                        Sign In
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



function HeroSection({ onWaitlist }: { onWaitlist: () => void }) {
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
        <div className="relative z-10 mx-auto w-full max-w-[88rem] flex h-full flex-col items-start justify-start pr-8 pl-0 pt-56 md:pr-12 md:pl-4 md:pt-64 transform -translate-x-2 md:-translate-x-6 pointer-events-auto">
          <div className="network-badge mb-6 inline-flex items-center gap-2 rounded-full bg-white/40 backdrop-blur-sm px-3 py-1 text-sm font-medium text-black/70">
            <span className="text-sm text-black font-bold">Complete</span>
            <span className="text-[#564c8c] font-semibold">Quest Get Paid in USDC</span>
          </div>
          <h1
            className="mb-4 max-w-3xl text-6xl leading-tight text-black md:text-6xl lg:text-8xl"
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
         
          <button
            onClick={onWaitlist}
            className="inline-flex items-center gap-3 rounded-full bg-black py-2 pl-8 pr-2 text-base font-medium text-white transition-colors duration-200 hover:bg-gray-800 md:text-lg"
          >
            <span>Join us</span>
            <span className="rounded-full bg-white p-2">
              <ArrowRight className="h-5 w-5 text-black" aria-hidden="true" />
            </span>
          </button>
          
        </div>
      </div>
    </section>
  );
}

function InfoSection() {
  const { user, signIn, loading } = useAuth();
  const { isConnected } = useAccount();

  return (
    <section className="bg-white px-0 py-24 rounded-t-3xl shadow-sm relative z-20">
      <div className="mx-auto max-w-[88rem]">
        <div className="mb-16 grid grid-cols-1 items-start gap-12 md:grid-cols-2">
          <div>
            <h2
              className="mb-8 text-4xl font-medium leading-tight text-black md:text-5xl"
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
          <p className="text-2xl leading-relaxed text-black/70 md:text-3xl">
           The performance <span className="font-bold">marketing network</span> for Web3 where users earn real USDC and projects pay only
for verified on-chain actions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article
            className="min-h-80 rounded-2xl bg-cover bg-center p-7 lg:col-span-2"
            style={{ backgroundImage: `url(${bloomImage})` }}
          >
            <div className="flex min-h-80 flex-col justify-between">
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
    <article className="flex min-h-80 flex-col justify-between rounded-2xl bg-[#2B2644] p-7">
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
    <section className="bg-[#f5f5f5] px-0 py-24 relative z-20">
      <div className="mx-auto grid max-w-[88rem] grid-cols-1 items-stretch gap-8 md:grid-cols-2">
        <article className="relative min-h-[720px] overflow-hidden rounded-3xl flex">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={useCasesVideo}
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="relative z-10 p-10 md:p-12 flex-1 h-full flex flex-col justify-start items-start" data-usecases-stats>
            <div className="w-full">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-[#564c8c]">The platform that pays for real</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 items-start w-full">
                <div className="flex flex-col items-start">
                  <div className="text-[36px] md:text-[48px] lg:text-[56px] font-extrabold text-[#564c8c] leading-none whitespace-nowrap"><CountUp end={2400000} /><span className="text-xl align-top">+</span></div>
                  <div className="mt-2 text-sm text-gray-700">Total cashback paid</div>
                </div>

                <div className="flex flex-col items-start">
                  <div className="text-[36px] md:text-[48px] lg:text-[56px] font-extrabold text-[#564c8c] leading-none whitespace-nowrap"><CountUp end={38000} /><span className="text-xl align-top">+</span></div>
                  <div className="mt-2 text-sm text-gray-700">Active earners globally</div>
                </div>

                <div className="flex flex-col items-start">
                  <div className="text-[36px] md:text-[48px] lg:text-[56px] font-extrabold text-[#564c8c] leading-none whitespace-nowrap"><CountUp end={240} /><span className="text-xl align-top">+</span></div>
                  <div className="mt-2 text-sm text-gray-700">Web3 projects listed</div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-sm font-semibold text-white/90 mb-3">The platform that pays for real</h4>
            </div>

          </div>
        </article>

        <article className="relative min-h-[720px] overflow-hidden rounded-3xl flex">
          <div className="relative z-10 p-12 md:p-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm flex-1 h-full flex flex-col justify-between">
            <div>
              <h2 className="mb-8 text-4xl md:text-4xl font-extrabold leading-tight text-black uppercase">
                <span className="block">Web3 projects <span className="text-[#564c8c]">spent $4–6B</span> on marketing in 2023 with less than 5% measurable ROI.<span className="text-[#564c8c]">Web3Cash gives you real CPI infrastructure </span></span>
                <span className="block">like Web2 has, but for dApps.</span>
            
              </h2>
            </div>

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
                      <img src={c.image} alt={c.title} className="w-full rounded-2xl object-cover shadow-md" />
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
}: {
  title: string;
  cost: string;
  note?: string;
  verified?: { ok: boolean; text: string };
}) {
  return (
    <div className="rounded-2xl p-6 bg-[#0b0b0b] border border-red-700/10 shadow-sm">
      <div className="text-sm font-medium text-gray-400">{title}</div>
      <div className="mt-3 text-4xl md:text-5xl font-extrabold text-white leading-tight">{cost}</div>
      {note && <div className="mt-2 text-sm text-gray-400">{note}</div>}
      <div className={`mt-4 text-sm font-medium ${verified?.ok ? 'text-emerald-400' : 'text-red-500'}`}>
        {verified?.text}
      </div>
    </div>
  );
}

export default function App() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const { address } = useAccount();
  const { user } = useAuth();

  return (
    <Routes>
      {/* Admin route */}
      <Route path="/admin" element={<AdminDashboard />} />

      {/* User dashboard route */}
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" replace />} />

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
              <FAQSection />
              <Footer />
            </main>
          )
        }
      />
    </Routes>
  );
}
