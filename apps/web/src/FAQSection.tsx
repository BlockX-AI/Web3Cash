import React, { useState, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';

const FAQ_ITEMS = [
    {
        q: 'Is the USDC real? Can I actually withdraw it?',
        a: "Yes. 100%. The USDC comes from real Web3 projects depositing into a smart contract escrow. When you earn, it's a real on-chain transaction to your wallet. You can withdraw from $5 minimum to any EVM wallet (MetaMask, Coinbase, any hardware wallet). The tx hash is verifiable on Etherscan by anyone.",
    },
    {
        q: "What's the catch? Why is the reward so high?",
        a: "No catch. Web3 projects pay $20–$50 per verified user — comparable to what they'd pay for influencer promotions but with zero proof. Web3Cash gives 85% of that directly to you and keeps 15% as the platform fee. The project gets a verified user. You get real money. Everyone wins.",
    },
    {
        q: 'Why do I need to connect my Twitter / wallet?',
        a: "Web3Cash's entire value to projects is verified, real users. Connecting your Twitter lets us check you actually followed (not just claimed). Connecting your wallet lets us check your on-chain history for Sybil scoring. The more history your wallet has, the higher your score, the more quests you can access.",
    },
    {
        q: 'What is a Sybil score and why does it matter for me?',
        a: "It's a 0–100 trust score for your wallet based on 8 on-chain signals — wallet age, transaction count, DeFi interactions, gas spend, etc. Score 70+: full quest access. Score 40–69: starter quests only. Below 40: manual review. If you're a real Web3 user with any on-chain history, you'll likely score well immediately.",
    },
    {
        q: "My referral bonus — does it reduce my friend's reward?",
        a: "No. Your referral bonus comes from the project's marketing budget — not from your friend's reward. Your friend earns the same $17 whether they were referred or not. You get a bonus on top of that, funded by the project. Both of you win with zero conflict.",
    },
    {
        q: 'Can I do multiple quests? Is there a daily limit?',
        a: "Yes to multiple quests — you can complete every active quest you're eligible for. There's a velocity limit of 5 quest claims per hour per wallet — this is purely anti-fraud, not an earning cap. If you're completing real quests across different projects, you'll never hit it in practice.",
    },
];

function useLayoutEffectWhenOpen(open: boolean, ref: React.RefObject<HTMLElement | null>, setHeight: (h: number) => void) {
    useLayoutEffect(() => {
        function update() {
            if (ref.current) {
                setHeight((ref.current as HTMLElement).scrollHeight);
            }
        }

        update();

        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && ref.current) {
            ro = new ResizeObserver(() => update());
            try { ro.observe(ref.current); } catch (e) { }
        }

        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('resize', update);
            if (ro) ro.disconnect();
        };
    }, [open, ref, setHeight]);
}

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="bg-[#F5F5F5] w-full px-0 py-12 relative z-20 faq-section">
            {/* Approach full-width */}
            <div id="Approach" className="w-full overflow-hidden flex flex-col gap-8 h-auto px-4 sm:px-5 md:px-6 mb-16 sm:mb-24">
                <div className="mx-auto max-w-[1440px] lg:w-6xl w-full">
                    <div className="network-badge inline-flex items-center gap-2 mb-4 rounded-full bg-white/40 backdrop-blur-sm px-3 py-1 text-sm font-medium text-black/70">
                        <span className="text-[#564c8c] font-semibold">Built for Scale</span>
                    </div>
                    <h1 data-cursor-hover-area="true" className="text-3xl sm:text-4xl md:text-[48px] lg:text-[56px] text-left font-semibold mb-4">The IronSource for Web3</h1>
                    <div className="grid bg-white p-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 h-auto rounded-3xl">
                        <div className="min-w-0 w-full p-6 rounded-2xl flex flex-col justify-between items-start gap-3 bg-neutral-100 hover:bg-neutral-300 transition-colors">
                            <img alt="Pay Per Verified Action" loading="lazy" width={25} height={25} decoding="async" src="https://www.baggystudio.com/Approach/icon%2001.svg" />
                            <h1 className="font-bold text-[18px]">Pay Per Verified Action</h1>
                            <p className="w-full text-[16px] leading-[20px] text-[#616161]">Only pay for real, on-chain verified user completions. CPI, CPA, CPL choose your pricing model. No impressions, no clicks, no waste.</p>
                        </div>

                        <div className="min-w-0 w-full p-6 rounded-2xl flex flex-col justify-between items-start gap-3 bg-neutral-100 hover:bg-neutral-300 transition-colors">
                            <img alt="Anti-Sybil by Design" loading="lazy" width={25} height={25} decoding="async" src="https://www.baggystudio.com/Approach/icon%2002.svg" />
                            <h1 className="font-bold text-[18px]">Anti-Sybil by Design</h1>
                            <p className="w-full text-[16px] leading-[20px] text-[#616161]">Every user completing your quest is scored against our proprietary Sybil detection engine. Wallet age, transaction depth, behavioral signals. Bot farms get blocked instantly.</p>
                        </div>

                        <div className="min-w-0 w-full p-6 rounded-2xl flex flex-col justify-between items-start gap-3 bg-neutral-100 hover:bg-neutral-300 transition-colors">
                            <img alt="Real-Time Analytics" loading="lazy" width={25} height={25} decoding="async" src="https://www.baggystudio.com/Approach/icon%2003.svg" />
                            <h1 className="font-bold text-[18px]">Real-Time Analytics</h1>
                            <p className="w-full text-[16px] leading-[20px] text-[#616161]">See live completion rates, wallet addresses, chain activity, and cohort retention for every user acquired. Export raw data. Connect to your analytics stack.</p>
                        </div>

                        <div className="min-w-0 w-full p-6 rounded-2xl flex flex-col justify-between items-start gap-3 bg-neutral-100 hover:bg-neutral-300 transition-colors">
                            <img alt="Multi-Chain Coverage" loading="lazy" width={25} height={25} decoding="async" src="https://www.baggystudio.com/Approach/icon%2004.svg" />
                            <h1 className="font-bold text-[18px]">Multi-Chain Coverage</h1>
                            <p className="w-full text-[16px] leading-[20px] text-[#616161]">Reach users on Ethereum, BNB Chain, Polygon, Arbitrum, and Solana from a single campaign dashboard. Chain-specific targeting available.</p>
                        </div>

                        <div className="min-w-0 w-full p-6 rounded-2xl flex flex-col justify-between items-start gap-3 sm:col-span-2 lg:col-span-2 bg-[#2B2644] hover:bg-[#FF6400] transition-colors text-white">
                            <img alt="Budget Stays in Escrow" loading="lazy" width={25} height={25} decoding="async" src="https://www.baggystudio.com/Approach/icon%2005.svg" />
                            <h1 className="font-bold text-[18px] text-white">Budget Stays in Escrow</h1>
                            <p className="w-full text-[16px] leading-[20px] text-white">Your USDC sits in a verified smart contract never in our custody. Unused budget returns automatically when a campaign ends. Full transparency, always.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-4 sm:px-6">
                <div className="network-badge inline-flex items-center gap-2 rounded-full bg-white/40 backdrop-blur-sm px-3 py-1 text-sm font-medium text-black/70">
                    <span className="text-[#564c8c] font-semibold">Some Questions and Answers</span>
                </div>

                <h1 data-cursor-hover-area="true" className="text-3xl sm:text-4xl md:text-[48px] text-left font-semibold mb-4 mt-2">FAQ's</h1>
                <div className="faq-accordion">
                    {FAQ_ITEMS.map((item, i) => {
                        const open = openIndex === i;

                        function AccordionItem({
                            children,
                            open,
                            onToggle,
                        }: {
                            children: React.ReactNode;
                            open: boolean;
                            onToggle: () => void;
                        }) {
                            const contentRef = useRef<HTMLDivElement | null>(null);
                            const [height, setHeight] = useState<number>(0);

                            useLayoutEffectWhenOpen(open, contentRef, setHeight);

                            const measuredRef = useRef<number>(0);

                            function handleToggle() {
                                if (open && contentRef.current) {
                                    // capture current height immediately before closing
                                    measuredRef.current = contentRef.current.scrollHeight;
                                    setHeight(measuredRef.current);
                                }
                                onToggle();
                            }

                            return (
                                <motion.div layout transition={{ layout: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }} className={`faq-item mb-3 rounded-lg bg-white p-3`}>
                                    <button
                                        type="button"
                                        className="faq-question w-full flex items-center justify-between gap-4 text-left"
                                        onClick={handleToggle}
                                        aria-expanded={open}
                                    >
                                        <span className="faq-q-text text-base font-medium text-black/90">{item.q}</span>
                                        <span className={`faq-dot ${open ? 'open' : ''}`} aria-hidden="true" />
                                    </button>

                                    <motion.div
                                        initial={false}
                                        animate={{ height: open ? height : measuredRef.current || 0, opacity: open ? 1 : 0 }}
                                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div ref={contentRef} className="faq-answer mt-3 text-sm text-black/80">
                                            {item.a}
                                        </div>
                                    </motion.div>
                                </motion.div>
                            );
                        }

                        return (
                            <AccordionItem key={i} open={open} onToggle={() => setOpenIndex(open ? null : i)}>
                                {item.a}
                            </AccordionItem>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
