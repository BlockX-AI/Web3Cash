import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying Web3CashEscrowV2...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Configuration
  const USDC_ADDRESS = process.env.USDC_TOKEN_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
  const ATTESTOR_ADDRESS = process.env.ESCROW_ATTESTOR_ADDRESS || deployer.address;

  console.log('Configuration:');
  console.log('- USDC Address:', USDC_ADDRESS);
  console.log('- Attestor Address:', ATTESTOR_ADDRESS);
  console.log('');

  // Deploy contract
  const Web3CashEscrowV2 = await ethers.getContractFactory('Web3CashEscrowV2');
  const escrow = await Web3CashEscrowV2.deploy(USDC_ADDRESS, ATTESTOR_ADDRESS);

  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();

  console.log('✅ Web3CashEscrowV2 deployed to:', escrowAddress);
  console.log('');

  // Verify deployment
  console.log('Verifying deployment...');
  const usdcAddr = await escrow.USDC();
  const attestorAddr = await escrow.attestor();
  const owner = await escrow.owner();

  console.log('- USDC:', usdcAddr);
  console.log('- Attestor:', attestorAddr);
  console.log('- Owner:', owner);
  console.log('');

  console.log('📝 Add to .env.local:');
  console.log(`ESCROW_CONTRACT_ADDRESS_V2=${escrowAddress}`);
  console.log('');

  console.log('🔍 Verify on Etherscan:');
  console.log(`npx hardhat verify --network sepolia ${escrowAddress} ${USDC_ADDRESS} ${ATTESTOR_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
