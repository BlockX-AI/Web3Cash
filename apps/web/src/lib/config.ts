/**
 * Site Configuration
 *
 * Central configuration file for easy customization.
 * Update these values to personalize your template.
 */

export const siteConfig = {
  name: "Web3Cash",
  tagline: "Earn Real USDC for Web3 Actions",
  description: "The first on-chain quest platform where projects pay users directly via smart contracts. No middlemen. Just instant USDC rewards.",
  url: "https://web3cash.app",
  social: {
    twitter: "@web3cash",
    github: "https://github.com/web3cash",
  },
  nav: {
    cta: {
      text: "Get Started",
      href: "/quests",
    },
    signIn: {
      text: "Sign in",
      href: "/dashboard",
    },
  },
} as const;

export const heroConfig = {
  headline: {
    prefix: "Earn",
    accent: "USDC",
    suffix: "for Web3 Actions",
  },
  description: "Complete quests, earn real USDC rewards — paid directly via smart contracts on-chain.",
  cta: {
    primary: {
      text: "Browse Quests",
      href: "/quests",
    },
    secondary: {
      text: "See How It Works",
      href: "#how-it-works",
    },
  },
  carousel: [
    "Twitter Follow",
    "Retweet Quest",
    "Like Quest",
    "Discord Join",
    "GitHub Star",
    "Smart Contracts",
    "USDC Rewards",
    "On-Chain Payouts",
    "Referral Bonus",
    "Sybil Protection",
    "Quest Builder",
  ],
} as const;

export const howItWorksConfig = {
  title: "Three steps to earning",
  description: "Complete quests and earn USDC rewards in minutes.",
  cta: {
    text: "Start Earning",
    href: "/quests",
  },
} as const;

export const featuresConfig = {
  title: "Everything you need",
  description: "Powerful features for both quest completers and quest creators.",
} as const;

export const statsConfig = {
  title: "Trusted by the Web3 Community",
  description: "Join the growing community of earners and builders.",
} as const;

export const testimonialsConfig = {
  title: "What People Are Saying",
} as const;

export const pricingConfig = {
  title: "Plans",
  description: "Start earning for free. Create quests with a project account.",
  cta: {
    primary: {
      text: "Create Campaign",
      href: "/console",
    },
    secondary: {
      text: "Start Earning",
      href: "/quests",
    },
  },
} as const;

export const faqConfig = {
  title: "Common Questions",
  contact: {
    text: "Still have questions? We're here to help.",
    cta: {
      text: "Get in Touch",
      href: "mailto:hello@web3cash.app",
    },
  },
} as const;

export const finalCtaConfig = {
  headline: "Ready to earn USDC today?",
  description: "Join thousands earning real crypto rewards. Connect your wallet and start completing quests in seconds.",
  cta: {
    text: "Browse Quests",
    href: "/quests",
  },
} as const;

export const footerConfig = {
  description: "Web3Cash is the first on-chain quest platform where projects pay users directly via smart contracts. No middlemen. Just instant USDC rewards.",
  cta: {
    text: "Get Started",
    href: "/quests",
  },
  links: {
    product: [
      { label: "Browse Quests", href: "/quests" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Create Campaign", href: "/console" },
      { label: "Documentation", href: "#" },
    ],
    company: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  contact: {
    location: "Remote-First",
    address: "Building the future of\non-chain rewards",
    hours: "24/7 Smart Contract Availability",
    email: "hello@web3cash.app",
  },
  copyright: `© ${new Date().getFullYear()} Web3Cash.`,
} as const;

/**
 * Feature Flags
 */
export const features = {
  smoothScroll: true,
  darkMode: true,
  ditherCursor: true,
  statsSection: true,
} as const;
