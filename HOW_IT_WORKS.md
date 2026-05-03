# 🎯 How Web3Cash Works - Simple Explanation

## The Big Picture

**Web3Cash is a platform where projects pay users in USDC for completing social tasks (quests).**

Everything happens **on-chain** using smart contracts on Sepolia testnet.

---

## 🔄 The Complete Flow (In Simple Words)

### 1. **Project Creates a Campaign**
- A crypto project (like "Web3Cash" or "Acme DeFi") wants users to follow them on Twitter
- They create a campaign in the Web3Cash dashboard
- **They fund the campaign** by sending USDC to the smart contract
  - Example: "Web3Cash Launch" campaign has **20 USDC** in the contract right now

### 2. **User Connects Wallet**
- You visit http://localhost:3000
- Click "Connect Wallet" and sign in with your Ethereum wallet
- The website shows you available quests

### 3. **User Completes a Quest**
- You see: "Follow @web3cash on Twitter - Earn $1 USDC"
- You click the quest and connect your Twitter account (OAuth)
- You follow @web3cash on Twitter
- Web3Cash backend **verifies** you actually followed them

### 4. **Backend Creates a Claim Signature** ⭐
- Backend says: "Yes, this user completed the quest"
- Backend creates a **cryptographic signature** (EIP-712) that says:
  - User wallet: `0xYourAddress`
  - Amount: `1 USDC`
  - Campaign: `Web3Cash Launch`
  - Claim ID: `unique-id-12345`
  - Deadline: `expires in 1 hour`
- This signature is like a **voucher** that can only be used once

### 5. **Backend Submits Transaction to Blockchain** 🚀
- Backend calls the smart contract's `claim()` function
- Smart contract **verifies the signature** is from the trusted attestor
- Smart contract **checks** the claim hasn't been used before
- Smart contract **transfers 1 USDC** from the campaign to your wallet
- **Transaction is recorded on Sepolia blockchain forever**

### 6. **You Get Paid!** 💰
- USDC appears in your wallet
- You can see the transaction on Etherscan
- The smart contract marks this claim as "used" so nobody can claim it twice

---

## 🏗️ The Smart Contracts

### **Web3CashEscrow** (Main Contract)
- **Address**: `0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7`
- **What it does**:
  - Holds USDC for all campaigns
  - Pays users when they complete quests
  - Prevents double-claiming
  - Lets projects withdraw unused funds after campaign ends

### **Web3CashRegistry** (Identity Contract)
- **Address**: `0x745006c263B74dF940F9571B16ef78edEAd9811A`
- **What it does**:
  - Links your wallet to your social accounts
  - Stores: `wallet → Twitter → @yourhandle`
  - Prevents Sybil attacks (one person, many accounts)

---

## 🔐 Security Features

### **EIP-712 Signatures**
- Like a digital voucher that can't be forged
- Only the backend (attestor) can create valid signatures
- Each signature is unique and can only be used once

### **Replay Protection**
- Each claim has a unique ID
- Smart contract remembers which claims were already paid
- Trying to use the same claim twice = rejected

### **Deadline Enforcement**
- Each claim expires after 1 hour
- Prevents old claims from being reused

### **Attestor Key**
- Backend has a "hot key" that signs claims
- If it leaks, project owner can rotate to a new key
- Keeps funds safe even if backend is compromised

---

## 💸 Current Status

### **Campaign Funded** ✅
- Campaign ID: `0x6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b`
- Balance: **20 USDC**
- Ends: June 1, 2026
- Ready to pay users!

### **Contracts Deployed** ✅
- Escrow: Live on Sepolia
- Registry: Live on Sepolia
- Backend: Configured to use contracts

### **What You Can Do Now**
1. Visit http://localhost:3000
2. Connect your wallet
3. Complete a quest (e.g., "Follow @web3cash")
4. Get paid 1 USDC instantly on-chain!

---

## 📊 Example Transaction Flow

```
User completes quest
       ↓
Backend verifies completion
       ↓
Backend generates EIP-712 signature:
  {
    campaignId: 0x6b86b273...,
    recipient: 0xYourWallet,
    amount: 1000000 (1 USDC in 6 decimals),
    claimId: 0xabc123...,
    deadline: 1735689600
  }
       ↓
Backend signs with attestor key
       ↓
Backend calls escrow.claim(signature)
       ↓
Smart contract verifies signature
       ↓
Smart contract checks:
  ✓ Signature is valid
  ✓ Claim not used before
  ✓ Deadline not expired
  ✓ Campaign has enough USDC
       ↓
Smart contract transfers 1 USDC to your wallet
       ↓
Transaction confirmed on Sepolia
       ↓
You receive USDC! 🎉
```

---

## 🎮 Testing the Full Workflow

### **Step 1: Check Campaign Status**
```bash
pnpm --filter @web3cash/contracts test-escrow
```
Output:
```
📊 Your USDC balance: 0.0 USDC
💰 Campaign balance: 20.0 USDC ✅
📅 Campaign ends at: 2026-06-01T19:01:45.000Z
```

### **Step 2: Start Local Server**
```bash
pnpm dev
```
Visit: http://localhost:3000

### **Step 3: Complete a Quest**
1. Connect wallet
2. Click "Follow @web3cash on Twitter"
3. Authorize Twitter OAuth
4. Follow the account
5. Wait for verification

### **Step 4: Get Paid**
- Backend automatically:
  - Generates claim signature
  - Submits transaction to Sepolia
  - USDC appears in your wallet
- Check on Etherscan:
  - https://sepolia.etherscan.io/address/0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7

---

## 🌐 Production (Railway)

### **Environment Variables Added** ✅
```
DISCORD_CLIENT_ID=1500206450432020737
DISCORD_CLIENT_SECRET=u828kNsNTSYvjVVD6XhYEO4LCu4InmdF
GITHUB_CLIENT_ID=Ov23liguqS4xJ2Bo9lzH
GITHUB_CLIENT_SECRET=b4a059c41d0d0b81e69375e1b3deb6ad76e14428
ESCROW_CONTRACT_ADDRESS=0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7
REGISTRY_CONTRACT_ADDRESS=0x745006c263B74dF940F9571B16ef78edEAd9811A
PAYOUT_PROVIDER=ESCROW_CONTRACT
```

### **Next Steps for Production**
1. Seed Railway database with quests
2. Fund production campaign with USDC
3. Test live deployment
4. Users can earn USDC on the live site!

---

## 🔗 Important Links

- **Escrow Contract**: https://sepolia.etherscan.io/address/0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7
- **Registry Contract**: https://sepolia.etherscan.io/address/0x745006c263B74dF940F9571B16ef78edEAd9811A
- **Local App**: http://localhost:3000
- **Get Sepolia USDC**: https://staging.aave.com/faucet/

---

**Summary**: Projects fund campaigns → Users complete quests → Backend verifies → Smart contract pays USDC → Everyone happy! 🎉
