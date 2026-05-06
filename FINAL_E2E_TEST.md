# Final E2E Test - Correct USDC Amounts

## Current State (Clean Slate)
- ✅ Pending balance: **11 USDC**
- ✅ Quest completions: 3 VERIFIED (5 + 1 + 5 = 11 USDC)
- ✅ All completions unpaid (`paid_at = NULL`)
- ✅ No queued payouts
- ✅ Payout provider: `ESCROW_CONTRACT`

## Test Steps

### 1. Refresh Dashboard
1. Go to `http://localhost:3000/dashboard`
2. **Verify displayed values**:
   - Pending USDC: `11`
   - Total earned USDC: `11`
   - Your Wallet Balance: `$24 USDC` (current balance)
   - Escrow Contract Balance: `$16 USDC`

### 2. Withdraw
1. Click **"Withdraw"** button
2. **Expected**: Creates payout with:
   - Amount: `11.000000` USDC
   - Provider: `ESCROW_CONTRACT`
   - Status: `QUEUED`
3. **Verify**:
   - Pending USDC becomes `0`
   - Withdrawals section shows: "QUEUED · ESCROW_CONTRACT · $11 USDC"

### 3. Run Pipeline
1. Click **"Run pipeline"** button
2. **Expected output**:
   ```json
   {
     "1_recheck_holding": { "count": 0 },
     "2_create_withdrawal": { "ok": false, "code": "NO_PENDING_BALANCE" },
     "3_submit_onchain": {
       "submitted": [
         {
           "payoutId": "[uuid]",
           "providerRef": "0x...",
           "txHash": "0x..."
         }
       ]
     },
     "4_confirm": {
       "confirmed": [
         {
           "payoutId": "[uuid]",
           "txHash": "0x...",
           "blockNumber": "..."
         }
       ]
     }
   }
   ```
3. **Copy the `txHash`** from step 3 or 4

### 4. Verify On-Chain
1. Go to Sepolia Etherscan: `https://sepolia.etherscan.io/tx/[txHash]`
2. **Verify transaction details**:
   - **Method**: `claim`
   - **From**: `0x0A67...9d47` (relayer wallet)
   - **To**: `0xA67F...9dd7` (escrow contract)
   - **Status**: Success ✓
3. **Check token transfer** (in "Tokens Transferred" section):
   - **Token**: USDC
   - **From**: `0xA67F...9dd7` (escrow contract)
   - **To**: `0x3564...5588` (your wallet)
   - **Amount**: **11 USDC** ✅

### 5. Verify Wallet Balance
1. Refresh dashboard
2. **Your Wallet Balance** should show: `$35 USDC` (24 + 11)
3. **Escrow Contract Balance** should show: `$5 USDC` (16 - 11)
4. Or check Etherscan:
   - Your wallet: `https://sepolia.etherscan.io/token/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238?a=0x356435901c4bf97e2f695a4377087670201e5588`
   - Should show balance: `35 USDC`

### 6. Verify Payout History
1. Scroll to **"Withdrawals"** section
2. Should show payout with:
   - Status: `CONFIRMED` ✓
   - Amount: `$11 USDC` ✅
   - Provider: `ESCROW_CONTRACT`
   - Chain: `11155111`
   - Transaction link (click to open Etherscan)
   - Timestamp

## Expected Database State After Test

### Payouts Table
```sql
SELECT id, amount_usdc, provider, status, tx_hash 
FROM payouts 
WHERE user_wallet = '0x356435901c4bf97e2f695a4377087670201e5588'
ORDER BY created_at DESC LIMIT 1;
```
**Expected**:
- amount_usdc: `11.000000`
- provider: `ESCROW_CONTRACT`
- status: `CONFIRMED`
- tx_hash: `0x...` (not null)

### Quest Completions Table
```sql
SELECT id, reward_usdc, status, paid_at 
FROM quest_completions 
WHERE user_wallet = '0x356435901c4bf97e2f695a4377087670201e5588';
```
**Expected**: All 3 completions should have:
- status: `VERIFIED`
- paid_at: `[timestamp]` (not null)

### Users Table
```sql
SELECT pending_balance_usdc, total_earned_usdc 
FROM users 
WHERE wallet_address = '0x356435901c4bf97e2f695a4377087670201e5588';
```
**Expected**:
- pending_balance_usdc: `0.000000`
- total_earned_usdc: `11.000000`

## Success Criteria

✅ **All amounts match**:
- Quest rewards: 5 + 1 + 5 = 11 USDC
- Payout amount: 11 USDC
- On-chain transfer: 11 USDC
- Wallet balance increase: 11 USDC

✅ **On-chain verification**:
- Transaction confirmed on Sepolia
- USDC transferred from escrow to user wallet
- Correct amount (11 USDC, not 1 USDC)

✅ **Database consistency**:
- All completions marked as paid
- Payout status is CONFIRMED
- Pending balance is 0
- Total earned is 11

## If Test Fails

### Amount is still 1 USDC on-chain
**Possible causes**:
1. Test Escrow button was used instead of Run Pipeline
2. Wrong payout was processed
3. Conversion error in `decimalToAtomic`

**Debug**:
```sql
-- Check what payout was created
SELECT id, amount_usdc, provider FROM payouts ORDER BY created_at DESC LIMIT 1;

-- Check if it's ESCROW_CONTRACT
-- If it's GNOSIS_SAFE, delete it and try again
```

### "BELOW_MIN_WITHDRAWAL" error
**Cause**: Pending balance is 0 (already withdrawn)

**Fix**: Check if payout already exists:
```sql
SELECT * FROM payouts WHERE user_wallet = '0x356435901c4bf97e2f695a4377087670201e5588' AND status = 'QUEUED';
```

If yes, skip step 2 and go directly to step 3 (Run Pipeline).

### Transaction reverts on-chain
**Possible causes**:
1. Escrow contract not funded
2. Invalid signature
3. Claim already processed

**Debug**: Check Etherscan revert reason

## Next Steps After Successful Test

1. ✅ Verify all quest types work (Twitter, Discord, GitHub)
2. ✅ Test with different reward amounts
3. ✅ Test multiple users
4. ✅ Deploy to Railway with production settings
5. ✅ Change hold time back to 72 hours
6. ✅ Set minimum withdrawal to $10
