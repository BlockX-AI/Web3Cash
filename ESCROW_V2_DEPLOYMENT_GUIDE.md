# Web3CashEscrowV2 Deployment & Integration Guide

## Overview

EscrowV2 introduces **per-campaign balance tracking** with these key features:
- ✅ Campaign creators can fund their own campaigns
- ✅ Platform reserve for subsidizing campaigns
- ✅ Campaign creators can withdraw unused funds
- ✅ Transparent on-chain balance tracking
- ✅ Hybrid funding model (creator + platform)

---

## Step 1: Deploy the Contract

### Prerequisites
- Node.js and pnpm installed
- Wallet with Sepolia ETH for gas
- Private key with funds

### Compile the Contract

```bash
cd packages/contracts
pnpm install
pnpm compile
```

### Deploy to Sepolia

```bash
# Set environment variables
export PRIVATE_KEY="0x..."  # Deployer private key
export USDC_TOKEN_ADDRESS="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"  # Sepolia USDC
export ESCROW_ATTESTOR_ADDRESS="0x..."  # Attestor address (can be same as deployer for testing)

# Deploy
npx hardhat run scripts/deploy-escrow-v2.ts --network sepolia
```

**Expected output:**
```
Deploying Web3CashEscrowV2...

Deploying with account: 0x...
Account balance: 0.5 ETH

Configuration:
- USDC Address: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
- Attestor Address: 0x...

✅ Web3CashEscrowV2 deployed to: 0xABC...123

Verifying deployment...
- USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
- Attestor: 0x...
- Owner: 0x...

📝 Add to .env.local:
ESCROW_CONTRACT_ADDRESS_V2=0xABC...123
```

### Verify on Etherscan

```bash
npx hardhat verify --network sepolia 0xABC...123 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 0x...
```

---

## Step 2: Update Database Schema

### Run Migration

```bash
cd packages/db
npx prisma migrate dev --name add_escrow_v2_provider
npx prisma generate
```

This adds `ESCROW_CONTRACT_V2` to the `PayoutProvider` enum.

---

## Step 3: Configure Environment Variables

### Backend (.env.local in apps/web)

```bash
# EscrowV2 Configuration
ESCROW_CONTRACT_ADDRESS_V2=0xABC...123  # Deployed contract address
PAYOUT_PROVIDER=ESCROW_CONTRACT_V2      # Use V2 by default

# Existing variables (keep these)
ESCROW_CAMPAIGN_ID=0x6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b
ESCROW_ATTESTOR_PRIVATE_KEY=0x...
CORE_WALLET_PRIVATE_KEY=0x...
DEFAULT_CHAIN_ID=11155111
```

### Frontend (.env.local in apps/web)

```bash
# Public variables for frontend
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS_V2=0xABC...123
NEXT_PUBLIC_USDC_TOKEN_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

---

## Step 4: Fund the Platform Reserve (Optional)

The platform reserve allows you to subsidize campaigns that run out of funds.

### Using Etherscan

1. Go to the deployed contract on Etherscan
2. Connect your wallet
3. Call `fundPlatformReserve(uint256 amount)`
   - Amount: `100000000` (100 USDC with 6 decimals)
4. Approve USDC spending first if needed

### Using Script

```typescript
// scripts/fund-platform-reserve.ts
import { ethers } from 'hardhat';

async function main() {
  const escrowAddress = '0xABC...123';
  const usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
  const amount = ethers.parseUnits('100', 6); // 100 USDC

  const [signer] = await ethers.getSigners();
  
  // Approve USDC
  const usdc = await ethers.getContractAt('IERC20', usdcAddress);
  await usdc.approve(escrowAddress, amount);
  console.log('USDC approved');

  // Fund reserve
  const escrow = await ethers.getContractAt('Web3CashEscrowV2', escrowAddress);
  const tx = await escrow.fundPlatformReserve(amount);
  await tx.wait();
  
  console.log('Platform reserve funded:', ethers.formatUnits(amount, 6), 'USDC');
  console.log('Tx:', tx.hash);
}

main();
```

---

## Step 5: Create Campaign On-Chain (Optional)

Campaigns can be created on-chain for better transparency.

### Using the Contract

```typescript
import { keccak256, toHex } from 'viem';

// Convert campaign UUID to bytes32
const campaignUuid = '123e4567-e89b-12d3-a456-426614174000';
const campaignIdBytes32 = keccak256(toHex(campaignUuid));

// Call createCampaign on the contract
await escrow.createCampaign(campaignIdBytes32);
```

### Using the API

The `/create` page will automatically create campaigns on-chain when EscrowV2 is configured.

---

## Step 6: Integrate Frontend Components

### Add to Console Page

```typescript
// apps/web/src/app/console/page.tsx
import { CampaignBalanceCard } from '@/components/campaign-balance-card';
import { FundCampaignButton } from '@/components/fund-campaign-button';

export default function ConsolePage() {
  const campaign = await getCampaign(); // Your existing logic

  return (
    <div>
      {/* Existing campaign info */}
      
      {/* Add these new components */}
      <CampaignBalanceCard campaignId={campaign.id} />
      <FundCampaignButton 
        campaignId={campaign.id}
        onSuccess={() => {
          // Refresh campaign data
        }}
      />
    </div>
  );
}
```

---

## Step 7: Test the Flow

### Test 1: Fund a Campaign

1. Go to `/console` (your campaign dashboard)
2. Click "Fund Campaign"
3. Enter amount (e.g., 10 USDC)
4. Approve USDC transaction
5. Confirm funding transaction
6. Verify on-chain balance updates

### Test 2: Complete a Quest and Claim Reward

1. User completes a quest
2. Quest completion is verified
3. User clicks "Withdraw"
4. Admin clicks "Run pipeline"
5. Payout is submitted using EscrowV2
6. Verify campaign balance decreases
7. Verify user wallet balance increases

### Test 3: Withdraw Unused Funds

```typescript
// Call withdrawCampaignFunds on the contract
const campaignIdBytes32 = '0x...';
const amount = ethers.parseUnits('5', 6); // 5 USDC

await escrow.withdrawCampaignFunds(campaignIdBytes32, amount);
```

---

## Step 8: Monitor and Verify

### Check Campaign Balance

```bash
# Using cast (Foundry)
cast call 0xABC...123 "getCampaign(bytes32)(address,uint256,uint256,bool)" 0x... --rpc-url https://sepolia.infura.io/v3/YOUR_KEY
```

### Check Platform Reserve

```bash
cast call 0xABC...123 "platformReserve()(uint256)" --rpc-url https://sepolia.infura.io/v3/YOUR_KEY
```

### View Events

```bash
# CampaignFunded events
cast logs --address 0xABC...123 --from-block 0 "CampaignFunded(bytes32,address,uint256)" --rpc-url https://sepolia.infura.io/v3/YOUR_KEY

# Claimed events
cast logs --address 0xABC...123 --from-block 0 "Claimed(bytes32,address,uint256,bytes32)" --rpc-url https://sepolia.infura.io/v3/YOUR_KEY
```

---

## Migration from V1 to V2

### Option 1: Parallel Run (Recommended)

1. Deploy EscrowV2 alongside existing EscrowV1
2. New campaigns use V2
3. Existing campaigns continue using V1
4. Gradually migrate campaigns to V2

### Option 2: Full Migration

1. Deploy EscrowV2
2. Update `PAYOUT_PROVIDER=ESCROW_CONTRACT_V2`
3. Fund platform reserve with sufficient USDC
4. All new payouts use V2

### Database Migration

```sql
-- Update existing campaigns to use V2 (optional)
UPDATE campaigns
SET payout_provider = 'ESCROW_CONTRACT_V2'
WHERE payout_provider = 'ESCROW_CONTRACT';

-- Or create new campaigns with V2
INSERT INTO campaigns (...)
VALUES (..., 'ESCROW_CONTRACT_V2', ...);
```

---

## Troubleshooting

### Issue: "InsufficientFunds" error

**Cause**: Campaign balance + platform reserve < payout amount

**Solution**:
1. Fund the campaign: `fundCampaign(campaignId, amount)`
2. Or fund platform reserve: `fundPlatformReserve(amount)`

### Issue: "InvalidSignature" error

**Cause**: Attestor private key mismatch

**Solution**:
1. Verify `ESCROW_ATTESTOR_PRIVATE_KEY` matches contract's attestor
2. Check contract: `cast call 0xABC...123 "attestor()(address)"`
3. Update if needed: `cast send 0xABC...123 "setAttestor(address)" 0x... --private-key 0x...`

### Issue: Campaign balance not showing

**Cause**: Campaign not created on-chain

**Solution**:
1. Call `createCampaign(campaignIdBytes32)` on the contract
2. Or wait for first funding transaction (creates automatically)

### Issue: Frontend components not working

**Cause**: Missing environment variables

**Solution**:
1. Verify `NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS_V2` is set
2. Verify `NEXT_PUBLIC_USDC_TOKEN_ADDRESS` is set
3. Restart dev server: `pnpm --filter web dev`

---

## Security Considerations

### 1. Attestor Key Management

- ✅ Use a dedicated key for attestor (not the deployer key)
- ✅ Store in secure environment (AWS Secrets Manager, etc.)
- ✅ Rotate regularly
- ✅ Use `setAttestor()` to update if compromised

### 2. Platform Reserve

- ✅ Monitor reserve balance regularly
- ✅ Set up alerts for low balance
- ✅ Only fund with amount needed for near-term payouts
- ✅ Use multisig for large deposits

### 3. Campaign Funding

- ✅ Verify campaign creator before allowing funding
- ✅ Set reasonable limits per campaign
- ✅ Monitor for suspicious activity
- ✅ Implement withdrawal limits if needed

### 4. Emergency Procedures

- ✅ Owner can call `emergencyWithdraw()` if needed
- ✅ Campaign creators can `deactivateCampaign()` to pause
- ✅ Monitor contract events for anomalies
- ✅ Have incident response plan ready

---

## Production Checklist

- [ ] Contract deployed and verified on Etherscan
- [ ] Attestor key secured and backed up
- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] Platform reserve funded
- [ ] Frontend components integrated
- [ ] End-to-end testing completed
- [ ] Monitoring and alerts set up
- [ ] Documentation updated
- [ ] Team trained on new features
- [ ] Incident response plan documented
- [ ] Gradual rollout plan defined

---

## Support

For issues or questions:
1. Check contract on Etherscan for events
2. Review server logs for errors
3. Test with small amounts first
4. Contact team if issues persist

---

## Summary

EscrowV2 provides a robust, transparent, and flexible payout system with per-campaign balance tracking. Campaign creators can now fund their own campaigns, withdraw unused funds, and have full visibility into on-chain balances.

**Key Benefits:**
- 💰 Campaign creators control their own funds
- 📊 Transparent on-chain accounting
- 🔄 Flexible hybrid funding model
- 🛡️ Secure with fallback to platform reserve
- 📈 Scalable for multiple campaigns

**Next Steps:**
1. Deploy the contract
2. Configure environment
3. Test with small amounts
4. Gradually roll out to production
5. Monitor and optimize
