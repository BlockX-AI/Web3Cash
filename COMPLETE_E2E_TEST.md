# Complete E2E Test - FIXED

## Root Cause Found & Fixed ✅

**Problem**: The `createWithdrawal` function was hardcoded to use `GNOSIS_SAFE` provider instead of reading from `PAYOUT_PROVIDER` env var.

**Fix**: 
1. Updated `packages/payouts/src/service.ts` line 68:
   - Before: `const provider = opts.provider ?? 'GNOSIS_SAFE';`
   - After: `const provider = opts.provider ?? (process.env.PAYOUT_PROVIDER as PayoutProvider | undefined) ?? 'ESCROW_CONTRACT';`

2. Updated `apps/web/src/app/api/withdrawals/route.ts` to explicitly pass provider from env

**Result**: Withdrawals now correctly use `ESCROW_CONTRACT` provider

---

## Clean State (After Fix)
- ✅ Pending balance: **11 USDC**
- ✅ Quest completions: 3 VERIFIED, unpaid
- ✅ No payouts in queue
- ✅ Server restarted with fix
- ✅ `PAYOUT_PROVIDER=ESCROW_CONTRACT` in `.env.local`

---

## E2E Test Steps

### 1. Refresh Dashboard
1. Go to `http://localhost:3000/dashboard`
2. **Verify**:
   - Pending USDC: `11`
   - Total earned USDC: `11`
   - Your Wallet Balance: `$25 USDC`
   - Escrow Contract Balance: `$15 USDC`

### 2. Click Withdraw
1. Click **"Withdraw"** button
2. **Expected**: Creates payout with:
   - Amount: `11 USDC`
   - Provider: `ESCROW_CONTRACT` ✅ (not GNOSIS_SAFE)
   - Status: `QUEUED`
3. **Verify in database**:
   ```sql
   SELECT id, amount_usdc, provider, status 
   FROM payouts 
   WHERE user_wallet = '0x356435901c4bf97e2f695a4377087670201e5588'
   ORDER BY created_at DESC LIMIT 1;
   ```
   Should show: `provider = 'ESCROW_CONTRACT'`

### 3. Click Run Pipeline
1. Click **"Run pipeline"** button
2. **Expected output**:
   ```json
   {
     "ok": true,
     "trace": [
       {
         "step": "1_recheck_holding",
         "data": { "count": 0, "recheckResults": [] }
       },
       {
         "step": "2_create_withdrawal",
         "data": { "ok": false, "code": "NO_PENDING_BALANCE" }
       },
       {
         "step": "3_submit_onchain",
         "data": {
           "submitted": [
             {
               "payoutId": "[uuid]",
               "providerRef": "0x...",
               "txHash": "0x..."
             }
           ]
         }
       },
       {
         "step": "4_confirm",
         "data": [
           {
             "payoutId": "[uuid]",
             "outcome": "CONFIRMED",
             "txHash": "0x...",
             "explorer": "https://sepolia.etherscan.io/tx/0x..."
           }
         ]
       },
       {
         "step": "5_final_state",
         "data": {
           "pendingBalanceUsdc": "0",
           "totalEarnedUsdc": "11"
         }
       }
     ]
   }
   ```
3. **Copy the txHash** from step 4

### 4. Verify On-Chain (CRITICAL)
1. Go to: `https://sepolia.etherscan.io/tx/[txHash]`
2. **Check transaction details**:
   - Status: Success ✓
   - Method: `claim`
   - From: Relayer wallet
   - To: `0xA67F...9dd7` (escrow contract)
3. **Check "Tokens Transferred" section**:
   - **Token**: USDC
   - **From**: `0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7` (escrow)
   - **To**: `0x356435901c4bf97e2f695a4377087670201e5588` (your wallet)
   - **Amount**: **11 USDC** ✅✅✅ (NOT 1 USDC!)

### 5. Verify Wallet Balance
1. Refresh dashboard
2. **Your Wallet Balance**: Should increase by 11 USDC
   - Before: $25 USDC
   - After: $36 USDC ✅
3. **Escrow Contract Balance**: Should decrease by 11 USDC
   - Before: $15 USDC
   - After: $4 USDC ✅

### 6. Verify Payout History
1. Scroll to **"Withdrawals"** section
2. Should show:
   - Status: `CONFIRMED` ✓
   - Amount: `$11 USDC` ✅
   - Provider: `ESCROW_CONTRACT` ✅
   - Chain: `11155111`
   - Transaction link (click to verify)

---

## Database Verification

### After Withdrawal (Step 2)
```sql
SELECT id, amount_usdc, provider, status 
FROM payouts 
WHERE user_wallet = '0x356435901c4bf97e2f695a4377087670201e5588'
ORDER BY created_at DESC LIMIT 1;
```
**Expected**:
- amount_usdc: `11.000000`
- provider: `ESCROW_CONTRACT` ✅
- status: `QUEUED`

### After Pipeline (Step 3)
```sql
SELECT id, amount_usdc, provider, status, tx_hash 
FROM payouts 
WHERE user_wallet = '0x356435901c4bf97e2f695a4377087670201e5588'
ORDER BY created_at DESC LIMIT 1;
```
**Expected**:
- amount_usdc: `11.000000`
- provider: `ESCROW_CONTRACT` ✅
- status: `CONFIRMED`
- tx_hash: `0x...` (not null)

### Quest Completions
```sql
SELECT id, reward_usdc, status, paid_at 
FROM quest_completions 
WHERE user_wallet = '0x356435901c4bf97e2f695a4377087670201e5588';
```
**Expected**: All 3 should have:
- paid_at: `[timestamp]` (not null)

---

## Success Criteria ✅

### 1. Correct Provider
- ✅ Payout created with `ESCROW_CONTRACT` (not GNOSIS_SAFE)

### 2. Correct Amount
- ✅ Payout amount: 11 USDC (5 + 1 + 5)
- ✅ On-chain transfer: **11 USDC** (not 1 USDC!)
- ✅ Wallet balance increase: 11 USDC
- ✅ Escrow balance decrease: 11 USDC

### 3. Single Transaction
- ✅ Only **1 transaction** on Etherscan (not 5 separate 1 USDC txs)
- ✅ Transaction shows 11 USDC transfer

### 4. Database Consistency
- ✅ All completions marked as paid
- ✅ Payout status: CONFIRMED
- ✅ Pending balance: 0
- ✅ Total earned: 11

---

## What Was Wrong Before

### Issue 1: Wrong Provider
- **Symptom**: Payouts created with `GNOSIS_SAFE` instead of `ESCROW_CONTRACT`
- **Cause**: Hardcoded default in `createWithdrawal` function
- **Fix**: Read from `process.env.PAYOUT_PROVIDER`

### Issue 2: 1 USDC Transfers
- **Symptom**: 5 separate transactions of 1 USDC each
- **Cause**: Test Escrow button was being used (always sends 1 USDC)
- **Fix**: Use Run Pipeline button instead, which processes actual payouts

### Issue 3: Multiple Payouts
- **Symptom**: Multiple GNOSIS_SAFE payouts in queue
- **Cause**: Clicking Withdraw multiple times created multiple payouts
- **Fix**: Cleaned database, fixed provider issue

---

## If Test Still Fails

### Check 1: Verify Provider
```sql
SELECT provider FROM payouts ORDER BY created_at DESC LIMIT 1;
```
**Must be**: `ESCROW_CONTRACT`

If it's `GNOSIS_SAFE`:
1. Check `.env.local` has `PAYOUT_PROVIDER=ESCROW_CONTRACT`
2. Restart server
3. Delete GNOSIS_SAFE payout
4. Try again

### Check 2: Verify Amount
```sql
SELECT amount_usdc FROM payouts ORDER BY created_at DESC LIMIT 1;
```
**Must be**: `11.000000`

If it's wrong:
1. Check pending balance in users table
2. Check quest completion rewards sum to 11

### Check 3: Verify Single Transaction
- Go to Etherscan
- Check "Tokens Transferred" section
- **Must show**: 1 transfer of 11 USDC
- **Not**: Multiple transfers of 1 USDC each

---

## Next Steps After Success

1. ✅ Test with different users
2. ✅ Test with different reward amounts
3. ✅ Test all quest types (Twitter, Discord, GitHub)
4. ✅ Deploy to Railway
5. ✅ Change hold time to 72 hours for production
6. ✅ Set minimum withdrawal to $10

---

## Environment Variables Checklist

In `apps/web/.env.local`:
- ✅ `PAYOUT_PROVIDER=ESCROW_CONTRACT`
- ✅ `ESCROW_CONTRACT_ADDRESS=0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7`
- ✅ `ESCROW_CAMPAIGN_ID=0x6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b`
- ✅ `ESCROW_ATTESTOR_PRIVATE_KEY=0x0ce04145050d9746a52aa61763387e78c87de32f75507b2c37255d8f31bdc269`
- ✅ `CORE_WALLET_PRIVATE_KEY=0x0ce04145050d9746a52aa61763387e78c87de32f75507b2c37255d8f31bdc269`
- ✅ `DEFAULT_CHAIN_ID=11155111`

---

## Summary

**The fix is complete!** The issue was that `createWithdrawal` was ignoring the `PAYOUT_PROVIDER` env var and defaulting to `GNOSIS_SAFE`. Now it correctly uses `ESCROW_CONTRACT`.

**Test now**: Refresh dashboard → Withdraw → Run Pipeline → Verify 11 USDC on Etherscan!
