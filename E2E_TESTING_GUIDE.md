# End-to-End Testing Guide

## Overview
This guide covers complete E2E testing from both **Quest Creator** and **Quest Completor** perspectives, ensuring all on-chain interactions work correctly.

---

## 🎯 Quest Creator Flow

### 1. Connect Wallet & Access Console
1. Go to `http://localhost:3000`
2. Click **Connect Wallet** (top right)
3. Connect your wallet (MetaMask/RainbowKit)
4. Go to `/console` (Menu → BUILD → Console)

### 2. Create Campaign
1. Click **"+ New Campaign"** or go to `/create`
2. **Step 1: Campaign Details**
   - Name: `Test Campaign E2E`
   - Budget: `100` USDC
   - Chain: `Sepolia (11155111)`
   - Click **"Next"**
3. **Step 2: Add Quest**
   - Quest Type: `GitHub Star`
   - Title: `Star Our Repo`
   - Description: `Star BlockX-AI/Web3Cash on GitHub`
   - Requirements:
     - Owner: `BlockX-AI`
     - Repo: `Web3Cash`
   - Reward: `5` USDC
   - Max Completions: `20`
   - Min Sybil Score: `0`
   - Click **"Create Campaign"**
4. **Verify**:
   - Should see "Campaign Created!" success message
   - Campaign ID displayed
   - Click **"View Live Quests"** or **"Go to Console"**

### 3. Fund Escrow Contract
1. Go to console page
2. Note the **Escrow Contract Address**: `0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7`
3. **Send USDC to escrow**:
   - Get Sepolia USDC from faucet: https://faucet.circle.com/
   - Or use existing USDC
   - Send to escrow address
   - USDC Token (Sepolia): `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
4. **Verify balance**:
   - Dashboard should show updated **Escrow Contract Balance**
   - Check on Etherscan: https://sepolia.etherscan.io/address/0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7

### 4. Monitor Campaign
1. Go to `/console`
2. View campaign stats:
   - Total campaigns
   - Active campaigns
   - Total quests
   - Completions
3. Click on campaign to see details:
   - Budget spent
   - Quest completions
   - Active quests

---

## 👤 Quest Completor Flow

### 1. Connect Wallet
1. Go to `http://localhost:3000`
2. Click **Connect Wallet**
3. Connect with MetaMask/RainbowKit
4. Go to `/dashboard`

### 2. Link Social Accounts
1. On dashboard, scroll to **"Connected accounts"**
2. Click **"Link Twitter"**
   - Authorize Twitter OAuth
   - Should redirect back with "✓" next to Twitter
3. Click **"Link Discord"** (if Discord quest exists)
   - Authorize Discord OAuth
   - Should show Discord username
4. Click **"Link GitHub"** (if GitHub quest exists)
   - Authorize GitHub OAuth
   - Should show GitHub username

### 3. View Available Quests
1. Scroll to **"Quests"** section on dashboard
2. Or go to `/quests` page
3. Each quest card shows:
   - Quest type badge (GITHUB_STAR, TWITTER_FOLLOW, etc.)
   - Title and description
   - **Action link** (e.g., "⭐ Star BlockX-AI/Web3Cash ↗")
   - **Link account button** (if not linked)
   - Reward amount
   - Slots remaining
   - Campaign budget progress bar
   - **Claim Reward** button

### 4. Complete Quest Action
**For GitHub Star Quest:**
1. Click **"⭐ Star BlockX-AI/Web3Cash ↗"** link
2. Opens GitHub repo in new tab
3. Click **"Star"** button on GitHub
4. Return to Web3Cash

**For Twitter Follow Quest:**
1. Click **"𝕏 Follow @giniedev ↗"** link
2. Opens Twitter profile
3. Click **"Follow"** button
4. Return to Web3Cash

**For Discord Join Quest:**
1. Click **"💬 Join Discord Server ↗"** link
2. Opens Discord invite
3. Click **"Accept Invite"**
4. Return to Web3Cash

### 5. Claim Reward
1. Click **"Claim Reward"** button on quest card
2. **Possible outcomes**:
   - ✅ **Success**: Shows "HOLDING" status with release time
   - ❌ **Error**: Shows error message (e.g., "Link Twitter first")
3. **If successful**:
   - Quest card shows **"HOLDING"** badge
   - Release time displayed (1 minute for MVP testing)
   - Pending USDC increases by reward amount

### 6. Wait for Verification (1 minute)
1. After 1 minute, quest status changes to **"VERIFIED"**
2. **Pending USDC** balance updated
3. **Total earned USDC** incremented
4. Quest card shows **"✓ VERIFIED"** and **"Done"** button

### 7. Withdraw USDC
1. On dashboard, **Withdrawable** section shows pending balance
2. Click **"Withdraw"** button
3. **Creates payout**:
   - Provider: `ESCROW_CONTRACT`
   - Status: `QUEUED`
   - Amount: Your pending balance
4. **Verify**:
   - Pending balance becomes `0`
   - **Withdrawals** section shows QUEUED payout

### 8. Submit Payout On-Chain (Admin/MVP Test)
1. Scroll to **"Run end-to-end pipeline (MVP test)"**
2. Click **"Run pipeline"** button
3. **Pipeline steps**:
   - `1_recheck_holding`: Force-rechecks any HOLDING quests
   - `2_create_withdrawal`: Creates withdrawal (already done)
   - `3_submit_onchain`: Submits to escrow contract
   - `4_confirm`: Confirms transaction
4. **Verify output**:
   - Should show `txHash` in step 3 or 4
   - Copy transaction hash

### 9. Verify On-Chain Transaction
1. Go to Sepolia Etherscan: `https://sepolia.etherscan.io/tx/[txHash]`
2. **Verify transaction**:
   - From: Escrow contract
   - To: Your wallet address
   - Token: USDC
   - Amount: Your reward (e.g., 5 USDC)
   - Status: Success ✓
3. **Check wallet balance**:
   - Dashboard **"Your Wallet Balance"** card should update
   - Or check on Etherscan: `https://sepolia.etherscan.io/token/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238?a=[your_address]`

### 10. Verify Payout History
1. Scroll to **"Withdrawals"** section on dashboard
2. Should show payout with:
   - Status: `CONFIRMED`
   - Amount: `$5 USDC` (or your reward)
   - Provider: `ESCROW_CONTRACT`
   - Chain: `11155111`
   - Transaction link (click to view on Etherscan)
   - Timestamp

---

## 🧪 Debug Tools (MVP Testing)

### Test Escrow Button
- **Purpose**: Tests escrow contract submission directly
- **Action**: Attempts to send 1 USDC to your wallet
- **Use case**: Verify escrow contract is funded and working
- **Expected**: Shows trace with tx hash or error

### Run Pipeline Button
- **Purpose**: Forces end-to-end payout flow
- **Action**: Rechecks HOLDING → creates withdrawal → submits on-chain
- **Use case**: Skip waiting for background jobs
- **Expected**: Returns tx hash for on-chain submission

### Sybil Override Buttons
- **Purpose**: Override sybil score for testing
- **Action**: Sets score to 100, 50, or 0
- **Use case**: Test quests with different min sybil requirements
- **Expected**: Score updates immediately

---

## ✅ E2E Test Checklist

### Quest Creator
- [ ] Connect wallet
- [ ] Create campaign with valid budget
- [ ] Add quest with correct requirements
- [ ] Fund escrow contract with USDC
- [ ] Verify escrow balance on dashboard
- [ ] Monitor campaign stats in console

### Quest Completor
- [ ] Connect wallet
- [ ] Link Twitter account (OAuth flow works)
- [ ] Link Discord account (OAuth flow works)
- [ ] Link GitHub account (OAuth flow works)
- [ ] View quests with action links
- [ ] Click action link (opens correct URL)
- [ ] Complete quest action (star repo, follow, join)
- [ ] Claim reward (shows HOLDING status)
- [ ] Wait 1 minute (status changes to VERIFIED)
- [ ] Pending balance increases
- [ ] Withdraw USDC (creates QUEUED payout)
- [ ] Run pipeline (submits on-chain)
- [ ] Verify tx hash on Etherscan
- [ ] Wallet balance increases
- [ ] Payout shows as CONFIRMED in history

### On-Chain Verification
- [ ] Escrow contract has USDC balance
- [ ] Transaction appears on Etherscan
- [ ] USDC transferred from escrow to user wallet
- [ ] Transaction status is Success
- [ ] Wallet balance reflects new USDC

---

## 🐛 Common Issues & Fixes

### "Nothing to withdraw yet" (but pending balance > 0)
- **Cause**: Quest completion has `paid_at` set
- **Fix**: Run SQL to clear `paid_at`:
  ```sql
  UPDATE quest_completions SET paid_at = NULL WHERE user_wallet = '[wallet]';
  ```

### "BELOW_MIN_WITHDRAWAL"
- **Cause**: Pending balance < minimum (usually $1)
- **Fix**: Complete more quests or lower minimum in code

### Quest shows "XXX" or broken link
- **Cause**: Invalid requirements in database
- **Fix**: Update quest requirements:
  ```sql
  UPDATE quests SET requirements = '{"owner": "BlockX-AI", "repo": "Web3Cash"}'::jsonb WHERE id = '[quest_id]';
  ```

### "VERIFY_FAIL" error
- **Cause**: Action not completed or account not linked
- **Fix**: 
  1. Complete the action (star repo, follow, join)
  2. Link the account on dashboard
  3. Try claiming again

### OAuth redirect error
- **Cause**: Localhost not in allowed redirects
- **Fix**: Add `http://localhost:3000/api/oauth/[provider]/callback` to OAuth app settings

### Escrow contract has no balance
- **Cause**: Contract not funded
- **Fix**: Send USDC to `0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7` on Sepolia

---

## 📊 Expected Results

### After Quest Completion
- Quest status: `HOLDING` → (1 min) → `VERIFIED`
- Pending balance: `+5 USDC`
- Total earned: `+5 USDC`
- Campaign budget spent: `+5 USDC`

### After Withdrawal
- Pending balance: `0`
- Payout created: `QUEUED`
- Provider: `ESCROW_CONTRACT`

### After Pipeline Run
- Payout status: `QUEUED` → `SUBMITTED` → `CONFIRMED`
- Transaction hash: `0x...`
- Wallet balance: `+5 USDC`
- Escrow balance: `-5 USDC`

---

## 🚀 Production Deployment

Before deploying to production:

1. **Change hold time** to 72 hours:
   ```typescript
   // packages/shared/src/constants.ts
   export const SOCIAL_QUEST_HOLD_MS = 72 * 60 * 60 * 1000;
   ```

2. **Update OAuth redirects** to production URLs:
   ```
   https://web3cash.app/api/oauth/twitter/callback
   https://web3cash.app/api/oauth/discord/callback
   https://web3cash.app/api/oauth/github/callback
   ```

3. **Fund escrow contract** on mainnet with real USDC

4. **Set minimum withdrawal** to production value (e.g., $10)

5. **Enable KYC** for withdrawals > $500

6. **Deploy to Railway** with all env vars

---

## 📝 Notes

- **Hold time**: Currently 1 minute for MVP testing
- **Min withdrawal**: Currently $1 (can be adjusted)
- **Escrow contract**: `0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7` (Sepolia)
- **USDC token**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (Sepolia)
- **Chain**: Sepolia testnet (11155111)
