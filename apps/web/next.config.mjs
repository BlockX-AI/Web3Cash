/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages must be transpiled because they ship raw .ts.
  transpilePackages: [
    '@web3cash/shared',
    '@web3cash/db',
    '@web3cash/auth',
    '@web3cash/sybil',
    '@web3cash/oauth',
    '@web3cash/payouts',
    '@web3cash/verifiers',
  ],
  experimental: {
    // Prisma + Next 14 — keep the Prisma client out of the edge runtime bundle.
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  webpack: (config) => {
    // RainbowKit / wagmi rely on WalletConnect which is ESM-only.
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
