# Campaign Funding & Escrow Contract Explained

## Overview

Web3Cash uses a **shared escrow contract** model where all campaigns draw from a single USDC pool. Campaign budgets are tracked in the database, not as separate on-chain balances.

---

## How It Works

### 1. Escrow Contract (On-Chain)
- **Address**: `0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7` (Sepolia)
- **Purpose**: Holds USDC for all payouts across all campaigns
- **Funding**: Platform operator sends USDC to this address
- **Balance**: Visible on dashboard as "Escrow Contract Balance"

### 2. Campaign Budget (Database)
- **Storage**: PostgreSQL database
- **Purpose**: Track how much each campaign can spend
- **Fields**:
  - `budget_usdc`: Total allocated (e.g., $1000)
  - `spent_usdc`: Amount reserved for completions (e.g., $10)
  - Remaining: `budget_usdc - spent_usdc`

### 3. Quest Completion Flow

**Step 1: User completes quest**
```
User stars repo → Backend verifies → Creates quest_completion
```
- Status: `HOLDING` (1 minute for MVP)
- Reward reserved from campaign budget
- Database: `campaign.spent_usdc += quest.reward_usdc`

**Step 2: Hold period expires**
```
Background job rechecks → Still valid → Status: VERIFIED
```
- User's pending balance increases
- Database: `user.pending_balance_usdc += quest.reward_usdc`
- Database: `quest_completion.status = 'VERIFIED'`

**Step 3: User withdraws**
```
User clicks "Withdraw" → Creates payout
```
- Pending balance → 0
- Creates payout row: `status = 'QUEUED'`
- Database: `quest_completion.paid_at = NOW()`

**Step 4: Payout submitted on-chain**
```
Admin clicks "Run pipeline" → Escrow contract transfers USDC
```
- Escrow contract sends USDC to user's wallet
- Payout status: `QUEUED` → `SUBMITTED` → `CONFIRMED`
- Escrow balance decreases
- User wallet balance increases

---

## Example: Growstreams Campaign

### Campaign Creation
```
Campaign: Growstreams
Budget: $5 USDC
Quest: Star repo
Reward: $1 USDC per completion
Max completions: 5
```

**Database state**:
```sql
campaigns:
  id: [uuid]
  name: 'Growstreams'
  budget_usdc: 5.00
  spent_usdc: 0.00
```

**Escrow contract**: No change (budget is database-only)

### First Quest Completion
User stars the repo and claims reward.

**Database changes**:
```sql
campaigns:
  spent_usdc: 0.00 → 1.00  (reserved)

quest_completions:
  INSERT: { user_wallet, quest_id, reward_usdc: 1.00, status: 'HOLDING' }

users:
  pending_balance_usdc: 0.00 (no change yet, still HOLDING)
```

**Escrow contract**: No change

### After 1 Minute (Hold Expires)
Background job rechecks and verifies.

**Database changes**:
```sql
quest_completions:
  status: 'HOLDING' → 'VERIFIED'

users:
  pending_balance_usdc: 0.00 → 1.00
  total_earned_usdc: 0.00 → 1.00
```

**Escrow contract**: No change

### User Withdraws
User clicks "Withdraw" button.

**Database changes**:
```sql
users:
  pending_balance_usdc: 1.00 → 0.00

payouts:
  INSERT: {
    user_wallet,
    amount_usdc: 1.00,
    provider: 'ESCROW_CONTRACT',
    status: 'QUEUED'
  }

quest_completions:
  paid_at: NULL → NOW()
```

**Escrow contract**: No change (not submitted yet)

### Run Pipeline (On-Chain Submission)
Admin clicks "Run pipeline" button.

**On-chain transaction**:
```
Escrow.claim(
  campaignId: 0x6b86...,
  recipient: user_wallet,
  amount: 1_000_000,  // 1 USDC (6 decimals)
  claimId: keccak256(...),
  deadline: timestamp + 1h,
  signature: attestor_signature
)
```

**Database changes**:
```sql
payouts:
  status: 'QUEUED' → 'SUBMITTED' → 'CONFIRMED'
  tx_hash: '0x...'
  submitted_at: NOW()
  confirmed_at: NOW()
```

**Escrow contract**:
- Balance: $15 → $14 (sent 1 USDC to user)

**User wallet**:
- Balance: $25 → $26 (received 1 USDC)

---

## Your Current Situation

### State
- **Escrow balance**: $15 USDC
- **Your wallet**: $25 USDC
- **Pending balance**: 0
- **QUEUED payout**: $11 USDC (from previous completions)
- **Growstreams campaign**: $5 budget, $5 spent (all 5 slots filled)

### What Happened
1. You completed 3 quests earlier (total: $11 USDC)
2. You clicked "Withdraw" → Created $11 USDC payout
3. Payout is QUEUED, waiting for on-chain submission
4. You created Growstreams campaign ($5 budget, database only)
5. Someone completed all 5 Growstreams quests ($5 spent)

### What to Do Next

**Option 1: Submit Your Payout**
1. Click **"Run pipeline"**
2. Submits $11 USDC to your wallet
3. Escrow balance: $15 → $4
4. Your wallet: $25 → $36

**Option 2: Complete Growstreams Quest**
- You can't - all 5 slots are filled
- Campaign budget: $5 / $5 USDC (fully spent)
- Need to create a new campaign or increase budget

---

## Campaign Budget vs Escrow Balance

### Campaign Budget (Database)
- **Purpose**: Limit spending per campaign
- **Tracks**: How much this campaign can pay out
- **Example**: Growstreams has $5 budget → can pay 5 users $1 each
- **Not on-chain**: Just a database number

### Escrow Balance (On-Chain)
- **Purpose**: Actual USDC available for payouts
- **Tracks**: Total USDC in escrow contract
- **Example**: $15 USDC in contract → can pay out up to $15 total
- **On-chain**: Real USDC tokens

### Relationship
```
Escrow Balance >= Sum of all pending payouts
```

If escrow balance is too low, payouts will fail on-chain even if campaign budget allows it.

**Example**:
- Campaign A: $1000 budget, $500 pending payouts
- Campaign B: $500 budget, $200 pending payouts
- **Total pending**: $700
- **Escrow balance needed**: At least $700 USDC

If escrow only has $400, the first $400 of payouts will succeed, then fail.

---

## How to Fund Campaigns

### Current MVP Model
1. **Fund escrow contract** with USDC:
   ```
   Send USDC to: 0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7
   Token: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 (Sepolia USDC)
   ```

2. **Create campaign** with database budget:
   ```
   Go to /create
   Set budget: $1000
   This is tracked in database only
   ```

3. **Monitor escrow balance**:
   - Dashboard shows "Escrow Contract Balance"
   - Ensure it's >= total pending payouts
   - Top up when low

### Future Production Model
- Each campaign could have its own on-chain escrow
- Or campaigns could pre-fund their allocation
- Or use a treasury system with per-campaign allowances

---

## FAQ

### Q: Why is escrow balance $15 but campaign budget $5?
**A**: They're separate concepts:
- Escrow balance = Total USDC available for ALL campaigns
- Campaign budget = Limit for THIS campaign only

### Q: I created a $5 campaign. Where do I send the $5?
**A**: You don't send it separately. The $5 is just a database limit. Make sure the escrow contract has enough USDC to cover all pending payouts.

### Q: What if escrow balance is 0?
**A**: Payouts will fail on-chain. You must fund the escrow contract with USDC first.

### Q: Can I withdraw my campaign budget?
**A**: No, campaign budgets are not on-chain funds. They're just database limits. If you want to reduce a campaign budget, update the database, but you can't "withdraw" it.

### Q: How do I increase escrow balance?
**A**: Send USDC to the escrow contract address:
```
To: 0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7
Token: USDC (Sepolia: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)
Amount: However much you want to add
```

### Q: Why are there 2 balances on the dashboard?
**A**: 
- **Your Wallet Balance**: USDC in YOUR wallet
- **Escrow Contract Balance**: USDC in the PLATFORM's escrow contract (used for payouts)

---

## Summary

1. **Escrow contract** = Shared USDC pool (on-chain)
2. **Campaign budget** = Per-campaign spending limit (database)
3. **Quest completion** → Reserves campaign budget, increases pending balance
4. **Withdrawal** → Creates QUEUED payout
5. **Run pipeline** → Submits payout on-chain, transfers USDC from escrow to user

**Your next step**: Click "Run pipeline" to submit your $11 USDC payout!
