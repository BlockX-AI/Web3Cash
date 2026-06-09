/**
 * Interactive test script for Web3CashEscrow on Sepolia.
 * 
 * This script helps you:
 * 1. Check your USDC balance
 * 2. Approve USDC for the escrow contract
 * 3. Create a campaign on-chain
 * 4. Top up a campaign with USDC
 * 5. Check campaign balance
 * 
 * Usage: pnpm --filter @web3cash/contracts test-escrow
 */
import { ethers } from 'hardhat';
import { config as dotenv } from 'dotenv';
import path from 'node:path';

dotenv({ path: path.resolve(__dirname, '../../../.env') });

const SEPOLIA_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS!;
const CAMPAIGN_ID = process.env.ESCROW_CAMPAIGN_ID!;

// Minimal USDC ABI
const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Testing with account:', signer.address);
  console.log('Escrow contract:', ESCROW_ADDRESS);
  console.log('Campaign ID:', CAMPAIGN_ID);
  console.log();

  // Connect to contracts
  const usdc = await ethers.getContractAt(USDC_ABI, SEPOLIA_USDC, signer);
  const escrow = await ethers.getContractAt('Web3CashEscrow', ESCROW_ADDRESS, signer);

  // 1. Check USDC balance
  const balance = await usdc.balanceOf(signer.address);
  const decimals = await usdc.decimals();
  console.log(`📊 Your USDC balance: ${ethers.formatUnits(balance, decimals)} USDC`);

  if (balance === 0n) {
    console.log('\n⚠️  You need Sepolia USDC to test!');
    console.log('Get it from:');
    console.log('  - https://staging.aave.com/faucet/ (select Sepolia, mint USDC)');
    console.log('  - https://faucet.circle.com/');
    return;
  }

  // 2. Check allowance
  const allowance = await usdc.allowance(signer.address, ESCROW_ADDRESS);
  console.log(`📝 Current allowance: ${ethers.formatUnits(allowance, decimals)} USDC`);

  // 3. Check if campaign exists
  const campaign = await escrow.campaigns(CAMPAIGN_ID);
  const campaignExists = campaign.exists;
  
  if (campaignExists) {
    const remaining = await escrow.remainingOf(CAMPAIGN_ID);
    console.log(`💰 Campaign balance: ${ethers.formatUnits(remaining, decimals)} USDC`);
    console.log(`📅 Campaign ends at: ${campaign.endsAt > 0 ? new Date(Number(campaign.endsAt) * 1000).toISOString() : 'Never (open-ended)'}`);
    console.log(`✅ Campaign exists on-chain`);
  } else {
    console.log(`❌ Campaign does not exist yet`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('INTERACTIVE ACTIONS');
  console.log('='.repeat(60));

  // Prompt for actions
  console.log('\nWhat would you like to do?');
  console.log('1. Approve 20 USDC for escrow');
  if (campaignExists) {
    console.log('2. Top up campaign with 10 USDC');
  } else {
    console.log('2. Create campaign with 10 USDC (30 days)');
  }
  console.log('3. Just check status (no transactions)');
  console.log('\nSet ACTION environment variable to execute, e.g.:');
  console.log('  $env:ACTION="1"; pnpm --filter @web3cash/contracts test-escrow');

  const action = process.env.ACTION;
  
  if (action === '1') {
    console.log('\n🔄 Approving 20 USDC...');
    const amount = ethers.parseUnits('20', decimals);
    const tx = await usdc.approve(ESCROW_ADDRESS, amount);
    console.log('Transaction:', tx.hash);
    await tx.wait();
    console.log('✅ Approved!');
  } else if (action === '2') {
    const amount = ethers.parseUnits('10', decimals);
    
    if (campaignExists) {
      console.log('\n🔄 Topping up campaign with 10 USDC...');
      const tx = await escrow.topUp(CAMPAIGN_ID, amount);
      console.log('Transaction:', tx.hash);
      await tx.wait();
      console.log('✅ Topped up!');
    } else {
      console.log('\n🔄 Creating campaign with 10 USDC...');
      const endsAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
      const tx = await escrow.createCampaign(CAMPAIGN_ID, amount, endsAt);
      console.log('Transaction:', tx.hash);
      await tx.wait();
      console.log('✅ Campaign created!');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
