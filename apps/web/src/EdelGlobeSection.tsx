import React from 'react';
import CobeGlobe from './CobeGlobe';

export default function EdelGlobeSection() {
  return (
    <section className="bg-white py-16 sm:py-20 md:py-32 px-4 sm:px-6 md:px-8 relative z-30">
      <div className="mx-auto max-w-[88rem] text-center">
        <div className="network-badge mb-6 inline-flex items-center gap-2 rounded-full bg-white/40 backdrop-blur-sm px-3 py-1 text-sm font-medium text-black/70 justify-center">
          <span className="text-[#564c8c] font-semibold">How Web3Cash Works</span>
        </div>

        <h2
          className="relative z-[1] text-3xl sm:text-4xl md:text-5xl xl:text-[56px] text-edel-text mb-12 sm:mb-24 text-center max-w-[792px] mx-auto text-balance font-semibold"
          style={{ opacity: 1, transform: 'none' }}
        >
          Four Steps to Real Earnings
        </h2>
      </div>

      <div className="relative sm:mt-0 content max-w-[996px] mx-auto">
        {/* Animated globe — hidden on mobile, visible sm+ */}
        <div
          className="globe relative aspect-square w-full sm:w-[474px] md:w-[574px] mx-auto hidden sm:block"
          style={{ transform: 'none' }}
        >
          <CobeGlobe />
        </div>

        {/* Cards grid — stacked on mobile, 2-col overlay on sm+ */}
        <div className="cards sm:absolute px-0 sm:px-2 sm:inset-0 grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-4">
          <div className="card w-full max-w-none sm:max-w-[224px] md:max-w-[364px] space-y-3 text-[#111111]">
            <img src="/steps1.png" alt="step 1" className="box-icon" />
            <h2 className="text-2xl sm:text-3xl globe-h2" style={{ opacity: 1, transform: 'none' }}>
              Browse Live Quests
            </h2>
            <p className="card-desc text-sm font-light max-w-none sm:max-w-[172px] opacity-70" style={{ opacity: 1, transform: 'none' }}>
              Projects deposit real USDC and publish quests — install an app, make a deposit, follow a social account. Every task has a verified payout you can see upfront.
            </p>
            <div className="line w-full h-px bg-[#B6B6B6]" style={{ transformOrigin: 'left center', opacity: 1, transform: 'none' }} />
          </div>

          <div className="card w-full max-w-none sm:max-w-[224px] md:max-w-[364px] space-y-3 text-[#111111] sm:ml-auto sm:text-right">
            <img src="/steps2.png" alt="step 2" className="box-icon" />
            <h2 className="text-2xl sm:text-3xl globe-h2" style={{ opacity: 1, transform: 'none' }}>
              Get Verified
            </h2>
            <p className="card-desc text-sm font-light max-w-none sm:max-w-[172px] opacity-70 sm:ml-auto sm:text-right" style={{ opacity: 1, transform: 'none' }}>
              Our on-chain verification engine checks your wallet history, transaction timestamps, and action depth. No bots. No fake clicks. Real users get paid instantly.
            </p>
            <div className="line w-full h-px bg-[#B6B6B6]" style={{ transformOrigin: 'left center', opacity: 1, transform: 'none' }} />
          </div>

          <div className="card w-full max-w-none sm:max-w-[224px] md:max-w-[364px] space-y-3 text-[#111111] content-center">
            <img src="/steps3.png" alt="step 3" className="box-icon" />
            <h2 className="text-2xl sm:text-3xl globe-h2" style={{ opacity: 1, transform: 'none' }}>
              Withdraw Earnings
            </h2>
            <p className="card-desc text-sm font-light max-w-none sm:max-w-[172px] opacity-70" style={{ opacity: 1, transform: 'none' }}>
              Your earnings land in your Web3Cash balance instantly. Withdraw to any wallet on Ethereum, BNB Chain, or Polygon — no minimums, no delays, no fees.
            </p>
            <div className="line w-full h-px bg-[#B6B6B6]" style={{ transformOrigin: 'left center', opacity: 1, transform: 'none' }} />
          </div>

          <div className="card w-full max-w-none sm:max-w-[224px] md:max-w-[364px] space-y-3 text-[#111111] sm:ml-auto sm:text-right content-center">
            <img src="/steps4.png" alt="step 4" className="box-icon" />
            <h2 className="text-2xl sm:text-3xl globe-h2" style={{ opacity: 1, transform: 'none' }}>
              Refer and Earn
            </h2>
            <p className="card-desc text-sm font-light max-w-none sm:max-w-[172px] opacity-70 sm:ml-auto sm:text-right" style={{ opacity: 1, transform: 'none' }}>
              Share your referral link. You earn 10% of every dollar your referrals earn forever. Real passive income. The more you recruit, the more you earn without lifting a finger.
            </p>
            <div className="line w-full h-px bg-[#B6B6B6]" style={{ transformOrigin: 'left center', opacity: 1, transform: 'none' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
