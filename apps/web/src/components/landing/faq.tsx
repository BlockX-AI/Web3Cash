'use client';

import { ChevronDown, ChevronRightIcon } from 'lucide-react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { useRef, useState } from 'react';

const easeOut = [0.16, 1, 0.3, 1] as const;

const faqs = [
  {
    question: 'How does Web3Cash pay users?',
    answer:
      'Web3Cash uses an on-chain escrow smart contract on Sepolia. When a quest creator funds a campaign, USDC is locked in the contract. After quest verification, users can claim their USDC directly from the smart contract — fully trustless and transparent.',
  },
  {
    question: 'What types of quests are available?',
    answer:
      'Currently Web3Cash supports social verification quests: follow on Twitter/X, join a Discord server, star a GitHub repository, and more. On-chain action quests are coming soon.',
  },
  {
    question: 'Do I need to pay gas to claim rewards?',
    answer:
      'No. Web3Cash uses a relayer wallet to submit claim transactions on your behalf. You receive USDC without paying any gas fees.',
  },
  {
    question: 'How do I create a campaign as a project?',
    answer:
      'Connect your wallet, go to the Create page, fill in your campaign details and quest requirements, then fund the campaign with USDC. Your quests go live immediately for users to discover and complete.',
  },
  {
    question: 'Is Web3Cash audited and safe?',
    answer:
      'The escrow smart contract is deployed on Sepolia testnet. All payouts are verifiable on-chain. Sybil protection prevents abuse, and campaign budgets are locked in the contract until claimed by verified users or withdrawn by the creator.',
  },
];

function FAQItem({
  faq,
  index,
  isOpen,
  onToggle,
}: {
  faq: (typeof faqs)[0];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      className="border-b border-foreground/10 last:border-b-0"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: easeOut }}
    >
      <button
        onClick={onToggle}
        className="group flex w-full items-center justify-between py-6 text-left"
      >
        <span className="pr-8 text-lg font-medium text-foreground md:text-xl">
          {faq.question}
        </span>
        <motion.div
          className="shrink-0 text-foreground/50"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: easeOut }}
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-base leading-relaxed text-muted-foreground">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.5 });

  return (
    <section className="rounded-4xl bg-foreground px-6 py-16 md:py-32">
      <div className="mx-auto max-w-3xl">
        <motion.div
          ref={headerRef}
          className="mb-12 text-center md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <h2 className="text-3xl font-medium tracking-tight text-background md:text-4xl lg:text-5xl">
            Common Questions
          </h2>
        </motion.div>

        <motion.div
          className="rounded-2xl bg-background px-6 py-2 md:px-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={faq.question}
              faq={faq}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </motion.div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
        >
          <p className="text-background/60 mb-6 text-base">
            Still have questions? We&apos;re here to help.
          </p>
          <a
            href="mailto:hello@web3cash.app"
            className="group inline-flex items-center gap-3 rounded-md bg-background py-3 pl-5 pr-3 font-medium text-foreground shadow-lg transition-all duration-500 ease-out hover:rounded-[50px]"
          >
            <span>Get in Touch</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-all duration-300 group-hover:scale-110">
              <ChevronRightIcon className="h-4 w-4 relative left-px" />
            </span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
