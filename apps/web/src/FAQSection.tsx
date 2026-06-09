import React, { useState, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';

const FAQ_ITEMS = [
    {
        q: 'How is Web3Cash different from Galxe or Layer3?',
        a: "Web3Cash pays real USDC directly to your wallet not points, not NFTs, not platform credit. You can withdraw to any wallet on any supported chain immediately. We also offer a 10% lifetime referral bonus, so you earn passively from every user you bring in forever. Galxe and Layer3 are credential-focused; we're a performance marketing network for real cashback.",
    },
    {
        q: 'How do I know quest rewards are real?',
        a: "Every campaign on Web3Cash is pre-funded. Projects deposit USDC into a smart contract escrow before their quest goes live. If the campaign ends or funds run out, no new quests appear. You can view on-chain escrow balances for any active campaign in real time.",
    },
    {
        q: 'How does on-chain verification work?',
        a: "Our verification engine indexes your wallet's transaction history across supported chains. It checks that the required action (e.g., a swap, deposit, or mint) actually occurred at or after your quest start time, meets the minimum amount criteria, and wasn't triggered by a known bot address. Passing users get credited instantly — usually within 60 seconds of the transaction confirming.",
    },
    {
        q: 'Can I get banned for farming quests?',
        a: "Only if you're actively gaming the system using multiple wallets, bots, or circular transactions. Legitimate users who complete real actions with their primary wallet are never at risk. Our anti-Sybil system scores wallets by age, activity history, and behavioral patterns. Real users score 90+. Bot farms score under 40 and get permanently blocked.",
    },
    {
        q: 'What chains are supported for withdrawal?',
        a: "You can currently withdraw USDC on Ethereum Mainnet, BNB Chain, and Polygon. We're adding Solana, Arbitrum, and TON in Q2 2025. Withdrawals are instant with no minimum amount and we cover gas for Polygon withdrawals up to $100/week.",
    },
    {
        q: 'My referral earned $500 this month. How much do I get?',
        a: "You automatically receive 10% of their total earnings so $50 in this case credited to your balance instantly as they complete quests. This 10% applies forever, for every user you've referred, for as long as they're active on the platform. There is no cap.",
    },
    {
        q: "I'm a project founder. How do I list a campaign?",
        a: "Click 'Launch Campaign', connect your wallet, deposit at least $500 in USDC, define your quest requirements (what action, what minimum amount, which chains), and set your payout per verified user. Campaigns go live within 2 hours of review. We charge 10% of total campaign spend as our platform fee — no monthly fees, no setup costs.",
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

    // Showcase carousel component implemented inline using Framer Motion drag
    function ShowcaseCarousel() {
        const carouselRef = useRef<HTMLDivElement | null>(null);
        const trackRef = useRef<HTMLDivElement | null>(null);
        const [maxDrag, setMaxDrag] = useState<number>(0);
        const [isDragging, setIsDragging] = useState(false);

        useLayoutEffect(() => {
            function update() {
                const el = carouselRef.current;
                const track = trackRef.current;
                if (!el || !track) return;
                const max = Math.max(0, track.scrollWidth - el.clientWidth);
                setMaxDrag(max);
            }

            update();

            let ro: ResizeObserver | null = null;
            if (typeof ResizeObserver !== 'undefined') {
                try {
                    ro = new ResizeObserver(update);
                    if (carouselRef.current) ro.observe(carouselRef.current);
                    if (trackRef.current) ro.observe(trackRef.current);
                } catch (e) {
                    /* ignore */
                }
            }

            window.addEventListener('resize', update);
            return () => {
                window.removeEventListener('resize', update);
                if (ro) ro.disconnect();
            };
        }, []);

        const projects = [
            { src: '/Project/project-10/01.jpg', alt: 'Quest' },
            { src: '/Project/project-11/01.png', alt: 'Quest' },
            { src: '/Project/project-01/1.png', alt: 'Quest' },
            { src: '/Project/project-02/1.png', alt: 'Quest' },
            { src: '/Project/project-03/1.png', alt: 'Quest' },
            { src: '/Project/project-05/01.png', alt: 'Quest' },
            { src: '/Project/project-06/01.png', alt: 'Quest' },
        ];

        return (
            <div className="overflow-hidden no-scrollbar pl-4 sm:pl-6 lg:pl-8" ref={carouselRef}>
                <motion.div
                    ref={trackRef as any}
                    className="flex flex-nowrap gap-4 py-4 cursor-grab"
                    drag="x"
                    dragConstraints={{ left: -maxDrag, right: 0 }}
                    dragElastic={0.12}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                    {projects.map((p, idx) => (
                        <div key={idx} className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer flex-shrink-0 w-[480px] sm:w-[380px] md:w-[650px] p-2">
                            <div className="relative h-[310px] md:h-[400px] overflow-hidden">
                                <img src={p.src} alt={p.alt} className="object-cover rounded-lg w-full h-full" />
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        );
    }

    return (
        <section className="bg-[#F5F5F5] w-full px-0 py-12 relative z-20 faq-section">
            {/* Approach full-width */}
            <div id="Approach" className="w-full overflow-hidden flex flex-col gap-8 h-auto px-5 mb-24">
                <div className="mx-auto max-w-[1440px] lg:w-6xl">
                    {/* Showcase carousel - horizontal scroll of project cards */}
                    <section className="py-4 relative lg:py-8 border-y-[2px] border-[#DDDDDD] w-full mb-6">
                        <div className="relative">
                            {/* Vertical heading for Projects (rotated) */}
                            <div className="absolute left-6 top-[100%] -translate-y-1/2 hidden md:flex items-center pointer-events-none">
                                <h2 aria-hidden className="text-4xl md:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight bg-gradient-to-r from-[#564c8b] to-[#0f0f0f] text-transparent bg-clip-text transform -rotate-90 origin-left px-2 drop-shadow-sm">Live Quests</h2>
                            </div>

                            <div className="pl-0 lg:pl-20">
                                <div className="flex justify-end mb-4">
                                    <button
                                        type="button"
                                        className="launch-btn"
                                        aria-label="See more quests"
                                    >
                                        More Quests
                                    </button>
                                </div>
                                <ShowcaseCarousel />
                            </div>
                        </div>
                    </section>
                    <div className="network-badge inline-flex items-center gap-2rounded-full bg-white/40 backdrop-blur-sm px-3 py-1 text-sm font-medium text-black/70">

                        <span className="text-[#564c8c] font-semibold">Built for Scale</span>
                    </div>
                    <h1 data-cursor-hover-area="true" className="text-[48px] lg:text-[56px] text-left font-albertsans font-semibold mb-4">The IronSource for Web3</h1>
                    <div className="grid bg-white p-2 grid-cols-3 gap-2 h-auto rounded-3xl">
                        <div data-cursor-hover-area-custom="false" className="p-6 rounded-2xl flex flex-col justify-between items-start gap-3 lg:col-span-1 col-span-3 bg-neutral-100 hover:bg-neutral-300" style={{ opacity: 1, transform: 'none' }}>
                            <img alt="Pay Per Verified Action" loading="lazy" width={25} height={25} decoding="async" style={{ color: 'transparent' }} src="https://www.baggystudio.com/Approach/icon%2001.svg" />
                            <h1 className="font-bold text-[18px] font-satoshi">Pay Per Verified Action</h1>
                            <p className="text-[16px] leading-[20px] font-satoshi text-[#616161]">Only pay for real, on-chain verified user completions. CPI, CPA, CPL choose your pricing model. No impressions, no clicks, no waste.</p>
                        </div>

                        <div data-cursor-hover-area-custom="false" className="p-6 rounded-2xl flex flex-col justify-between items-start gap-3 lg:col-span-1 col-span-3 bg-neutral-100 hover:bg-neutral-300" style={{ opacity: 1, transform: 'none' }}>
                            <img alt="Anti-Sybil by Design" loading="lazy" width={25} height={25} decoding="async" style={{ color: 'transparent' }} src="https://www.baggystudio.com/Approach/icon%2002.svg" />
                            <h1 className="font-bold text-[18px] font-satoshi">Anti-Sybil by Design</h1>
                            <p className="text-[16px] leading-[20px] font-satoshi text-[#616161]">Every user completing your quest is scored against our proprietary Sybil detection engine. Wallet age, transaction depth, behavioral signals. Bot farms get blocked instantly.</p>
                        </div>

                        <div data-cursor-hover-area-custom="false" className="p-6 rounded-2xl flex flex-col justify-between items-start gap-3 lg:col-span-1 col-span-3 bg-neutral-100 hover:bg-neutral-300" style={{ opacity: 1, transform: 'none' }}>
                            <img alt="Real-Time Analytics" loading="lazy" width={25} height={25} decoding="async" style={{ color: 'transparent' }} src="https://www.baggystudio.com/Approach/icon%2003.svg" />
                            <h1 className="font-bold text-[18px] font-satoshi">Real-Time Analytics</h1>
                            <p className="text-[16px] leading-[20px] font-satoshi text-[#616161]">See live completion rates, wallet addresses, chain activity, and cohort retention for every user acquired. Export raw data. Connect to your analytics stack.</p>
                        </div>

                        <div data-cursor-hover-area-custom="false" className="p-6 rounded-2xl flex flex-col justify-between items-start gap-3 lg:col-span-1 col-span-3 bg-neutral-100 hover:bg-neutral-300" style={{ opacity: 1, transform: 'none' }}>
                            <img alt="Multi-Chain Coverage" loading="lazy" width={25} height={25} decoding="async" style={{ color: 'transparent' }} src="https://www.baggystudio.com/Approach/icon%2004.svg" />
                            <h1 className="font-bold text-[18px] font-satoshi">Multi-Chain Coverage</h1>
                            <p className="text-[16px] leading-[20px] font-satoshi text-[#616161]">Reach users on Ethereum, BNB Chain, Polygon, Arbitrum, and Solana from a single campaign dashboard. Chain-specific targeting available.</p>
                        </div>

                        <div data-cursor-hover-area-custom="true" className="p-6 rounded-2xl flex flex-col justify-between items-start gap-3 lg:col-span-2 col-span-3 bg-[#2B2644] hover:bg-[#FF6400] text-white" style={{ opacity: 1, transform: 'none' }}>
                            <img alt="Budget Stays in Escrow" loading="lazy" width={25} height={25} decoding="async" style={{ color: 'transparent' }} src="https://www.baggystudio.com/Approach/icon%2005.svg" />
                            <h1 className="font-bold text-[18px] text-white font-satoshi">Budget Stays in Escrow</h1>
                            <p className="text-[16px] leading-[20px] font-satoshi text-white">Your USDC sits in a verified smart contract never in our custody. Unused budget returns automatically when a campaign ends. Full transparency, always.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-6">
                <div className="network-badge inline-flex items-center gap-2 rounded-full bg-white/40 backdrop-blur-sm px-3 py-1 text-sm font-medium text-black/70 justify-center">
                    <span className="text-[#564c8c] font-semibold">Some Questions and Answers</span>

                </div>

                <h1 data-cursor-hover-area="true" className="text-[48px] lg:text-[48px] text-left font-albertsans font-semibold mb-4">FAQ's</h1>
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
