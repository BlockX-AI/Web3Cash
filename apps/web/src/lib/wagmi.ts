import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — WalletConnect disabled.');
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Web3Cash',
  projectId: projectId ?? 'placeholder-project-id',
  chains: [mainnet, sepolia],
  ssr: true,
});
