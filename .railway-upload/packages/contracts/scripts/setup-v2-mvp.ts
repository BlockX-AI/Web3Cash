/**
 * Setup script for EscrowV2 MVP:
 * 1. Create the platform campaign (using ESCROW_CAMPAIGN_ID from env)
 * 2. Fund the platform reserve with USDC
 */
import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Setting up EscrowV2 with account:', deployer.address);

  // Hardcoded from .env.local for MVP
  const escrowAddress = '0x6726a4A8B149F59Db599FEBF450F279e82951560';
  const usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
  const campaignId = '0x6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b';

  console.log('EscrowV2:', escrowAddress);
  console.log('USDC:', usdcAddress);
  console.log('Campaign ID:', campaignId);

  const escrow = await ethers.getContractAt('Web3CashEscrowV2', escrowAddress);
  const usdc = await ethers.getContractAt(
    ['function approve(address spender, uint256 amount) returns (bool)', 'function balanceOf(address) view returns (uint256)'],
    usdcAddress
  );

  // Check if campaign already exists
  const campaign = await escrow.getCampaign(campaignId);
  const campaignExists = campaign[0] !== ethers.ZeroAddress;

  if (campaignExists) {
    console.log('Campaign already exists:', {
      creator: campaign[0],
      balance: ethers.formatUnits(campaign[1], 6),
      spent: ethers.formatUnits(campaign[2], 6),
      active: campaign[3],
    });
  } else {
    console.log('Campaign does not exist, creating...');
    const tx = await escrow.createCampaign(campaignId);
    await tx.wait();
    console.log('✓ Campaign created:', tx.hash);
  }

  // Fund platform reserve with 10 USDC (user has 19 USDC)
  const fundAmount = ethers.parseUnits('10', 6);
  const balance = await usdc.balanceOf(deployer.address);
  console.log('Your USDC balance:', ethers.formatUnits(balance, 6));

  if (balance < fundAmount) {
    console.log('⚠ Insufficient USDC balance to fund platform reserve');
    return;
  }

  console.log('Approving USDC...');
  const approveTx = await usdc.approve(escrowAddress, fundAmount);
  await approveTx.wait();
  console.log('✓ Approved');

  console.log('Funding platform reserve...');
  const fundTx = await escrow.fundPlatformReserve(fundAmount);
  await fundTx.wait();
  console.log('✓ Platform reserve funded:', fundTx.hash);

  const reserve = await escrow.platformReserve();
  console.log('Platform reserve balance:', ethers.formatUnits(reserve, 6), 'USDC');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
