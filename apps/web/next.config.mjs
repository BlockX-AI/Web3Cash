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
    // Workspace packages use ESM-style `.js` extensions that point at `.ts` sources.
    // Tell webpack to try TS extensions for any `.js`/`.jsx` import.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
