"use client";

import { ChevronRightIcon, Mail, MapPin, Clock } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";

const easeOut = [0.16, 1, 0.3, 1] as const;

const fadeInUp = {
  initial: { opacity: 0, y: 30 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, amount: 0.3 } as const,
  transition: { duration: 0.8, ease: easeOut } as const,
};

const productLinks = [
  { label: "Browse Quests", href: "/quests" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Create Campaign", href: "/console" },
  { label: "Documentation", href: "#" },
];

const companyLinks = [
  { label: "About", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Careers", href: "#" },
  { label: "Contact", href: "#" },
];

function TwitterIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function Footer(): ReactNode {
  return (
    <footer className="bg-accent px-6 py-16 text-black md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Description + CTA */}
          <motion.div className="lg:col-span-1" {...fadeInUp}>
            <p className="text-base leading-relaxed text-black/80">
              Web3Cash is the first on-chain quest platform where projects pay
              users directly via smart contracts. No middlemen. Just instant USDC
              rewards.
            </p>
            <Link
              href="/quests"
              className="group mt-8 inline-flex items-center gap-3 rounded-md bg-white py-3 pl-5 pr-3 font-medium text-black shadow-lg shadow-black/10 transition-all duration-500 ease-out hover:rounded-[50px]"
            >
              <span>Get Started</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-black transition-all duration-300 group-hover:scale-110">
                <ChevronRightIcon className="h-4 w-4 relative left-px" />
              </span>
            </Link>
          </motion.div>

          {/* Product links */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.1 }}>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-black/50">
              Product
            </h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-block text-black/80 transition-all duration-300 hover:translate-x-1 hover:text-black"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company links */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.2 }}>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-black/50">
              Company
            </h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-block text-black/80 transition-all duration-300 hover:translate-x-1 hover:text-black"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.3 }}>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-black/50">
              Contact
            </h4>
            <ul className="space-y-4 text-sm text-black/80">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Remote-First<br />Building the future of on-chain rewards</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>24/7 Smart Contract Availability</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <a href="mailto:hello@web3cash.app" className="transition-colors hover:text-black">
                  hello@web3cash.app
                </a>
              </li>
            </ul>
          </motion.div>
        </div>

        <div className="my-16 h-px bg-black/10" />

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <motion.div {...fadeInUp}>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-black" />
              <span className="text-2xl font-extrabold tracking-tight">
                Web3Cash
              </span>
            </div>
            <p className="mt-2 text-sm text-black/50">
              © {new Date().getFullYear()} Web3Cash.
            </p>
          </motion.div>

          <motion.div
            className="flex items-center gap-3"
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.1 }}
          >
            <a
              href="#"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-black transition-all duration-300 hover:scale-110 hover:bg-black/20"
              aria-label="Twitter"
            >
              <TwitterIcon className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-black transition-all duration-300 hover:scale-110 hover:bg-black/20"
              aria-label="GitHub"
            >
              <GitHubIcon className="h-4 w-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
