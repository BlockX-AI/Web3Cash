import { ethers, network } from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Deploys Web3CashRegistry + Web3CashEscrow to the active network.
 *
 * Required env (read from monorepo .env via hardhat.config.ts):
 *   - CORE_WALLET_PRIVATE_KEY  → deployer (must be funded with ETH for gas)
 *   - ATTESTOR_ADDRESS          → optional; defaults to deployer
 *   - USDC_ADDRESS_OVERRIDE     → optional; defaults to chain's canonical USDC
 *
 * Writes deployments/<network>.json with addresses + tx hashes.
 */

const USDC_BY_CHAIN: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia (Circle test)
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const { chainId } = await ethers.provider.getNetwork();
  const cid = Number(chainId);

  const attestor = process.env.ATTESTOR_ADDRESS ?? deployer.address;
  const usdc = process.env.USDC_ADDRESS_OVERRIDE ?? USDC_BY_CHAIN[cid];

  console.log('Deploying with', deployer.address, 'on chainId', cid);
  console.log('  attestor:', attestor);
  console.log('  USDC:    ', usdc ?? '(none — deploying MockUSDC for local)');

  // Local hardhat / localhost: deploy a MockUSDC if no canonical address.
  let usdcAddress = usdc;
  if (!usdcAddress) {
    const Mock = await ethers.getContractFactory('MockUSDC');
    const mock = await Mock.deploy();
    await mock.waitForDeployment();
    usdcAddress = await mock.getAddress();
    console.log('  Deployed MockUSDC at', usdcAddress);
  }

  const Registry = await ethers.getContractFactory('Web3CashRegistry');
  const registry = await Registry.deploy(deployer.address, attestor);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log('  Registry →', registryAddr);

  const Escrow = await ethers.getContractFactory('Web3CashEscrow');
  const escrow = await Escrow.deploy(usdcAddress, deployer.address, attestor);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log('  Escrow   →', escrowAddr);

  const out = {
    network: network.name,
    chainId: cid,
    deployer: deployer.address,
    attestor,
    usdc: usdcAddress,
    registry: registryAddr,
    escrow: escrowAddr,
    deployedAt: new Date().toISOString(),
  };

  const dir = path.resolve(__dirname, '../deployments');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));
  console.log(`\nWrote deployments/${network.name}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
