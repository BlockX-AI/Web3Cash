import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

if (!projectId && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — WalletConnect disabled.');
}

const sepoliaRpc = alchemyKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
  : 'https://ethereum-sepolia-rpc.publicnode.com';

export const wagmiConfig = getDefaultConfig({
  appName: 'Web3Cash',
  projectId: projectId ?? 'placeholder-project-id',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(sepoliaRpc),
  },
  ssr: true,
});
