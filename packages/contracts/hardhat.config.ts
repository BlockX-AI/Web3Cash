import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import { config as dotenv } from 'dotenv';
import path from 'node:path';
import type { HardhatUserConfig } from 'hardhat/config';

// Load the monorepo-root .env so secrets live in one place.
dotenv({ path: path.resolve(__dirname, '../../.env') });

const PRIVATE_KEY = process.env.CORE_WALLET_PRIVATE_KEY?.startsWith('0x')
  ? process.env.CORE_WALLET_PRIVATE_KEY
  : process.env.CORE_WALLET_PRIVATE_KEY
    ? `0x${process.env.CORE_WALLET_PRIVATE_KEY}`
    : undefined;

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? '';
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY ?? '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    sepolia: {
      url: ALCHEMY_KEY
        ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : 'https://rpc.sepolia.org',
      chainId: 11155111,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    baseSepolia: {
      url: ALCHEMY_KEY
        ? `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : 'https://sepolia.base.org',
      chainId: 84532,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_KEY,
      baseSepolia: ETHERSCAN_KEY,
    },
  },
  sourcify: {
    enabled: false,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};

export default config;
