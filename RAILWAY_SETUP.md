# Railway Environment Variables - Complete Setup

## 🔴 Critical: Add These Variables to Railway NOW

Go to Railway → Your Project → Variables tab and add **ALL** of these:

### Database (Auto-injected by Railway Postgres)
```bash
DATABASE_URL={{Postgres.DATABASE_URL}}
DATABASE_PUBLIC_URL={{Postgres.DATABASE_PUBLIC_URL}}
```

### Blockchain & Network
```bash
DEFAULT_CHAIN_ID=11155111
ALCHEMY_API_KEY=YLzwTt4civKkUzVKrAe0h
ALCHEMY_NETWORK=eth-sepolia
```

### Smart Contracts (Sepolia)
```bash
ESCROW_CONTRACT_ADDRESS=0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7
REGISTRY_CONTRACT_ADDRESS=0x745006c263B74dF940F9571B16ef78edEAd9811A
ESCROW_CAMPAIGN_ID=0x6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b
```

### 🚨 CRITICAL: Private Keys (MUST include 0x prefix)
```bash
ESCROW_ATTESTOR_PRIVATE_KEY=0x0ce04145050d9746a52aa61763387e78c87de32f75507b2c37255d8f31bdc269
CORE_WALLET_PRIVATE_KEY=0x0ce04145050d9746a52aa61763387e78c87de32f75507b2c37255d8f31bdc269
```
⚠️ **Important**: Both keys MUST start with `0x`. Without it, viem will fail.

### Payout Provider
```bash
PAYOUT_PROVIDER=ESCROW_CONTRACT
```

### JWT & Auth
```bash
JWT_SECRET=cFqHQw99oT7YsGiXdJiEPR8PmunOLSnDKQiU5d/RR9B4aav8RP5/DyLtBKGjers+
SIWE_DOMAIN=web3cashweb-production.up.railway.app
```

### OAuth Encryption
```bash
OAUTH_ENC_KEY=9QHX6vdYaGOF1hojEw2rNveDx9fo3ZTvsDM4DWOD8f8=
```

### Discord OAuth
```bash
DISCORD_CLIENT_ID=1500206450432020737
DISCORD_CLIENT_SECRET=u828kNsNTSYvjVVD6XhYEO4LCu4InmdF
DISCORD_REDIRECT_URI=https://web3cashweb-production.up.railway.app/api/oauth/discord/callback
```

### GitHub OAuth
```bash
GITHUB_CLIENT_ID=Ov23liguqS4xJ2Bo9lzH
GITHUB_CLIENT_SECRET=b4a059c41d0d0b81e69375e1b3deb6ad76e14428
GITHUB_REDIRECT_URI=https://web3cashweb-production.up.railway.app/api/oauth/github/callback
```

### Frontend (Next.js)
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=8b7d0a01dd31460360b4200661ade5f1
NEXT_PUBLIC_APP_URL=https://web3cashweb-production.up.railway.app
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
NEXT_PUBLIC_ALCHEMY_API_KEY=YLzwTt4civKkUzVKrAe0h
```

---

## ✅ Verification Checklist

After adding all variables:

1. **Railway will auto-redeploy** (~2 minutes)
2. **Check deployment logs** for errors
3. **Visit dashboard** → click "Test" button
4. **Should see**:
   - ✅ All env vars = true
   - ✅ Provider initialized
   - ✅ Transaction hash returned
   - ✅ Etherscan link

---

## 🔧 Troubleshooting

### Error: "ESCROW_ATTESTOR_PRIVATE_KEY is required"
- Variable is missing or empty in Railway
- Add it with the `0x` prefix

### Error: "Cannot read properties of undefined (reading 'getAddress')"
- Private key is malformed (missing `0x` prefix)
- Fix: Ensure both `ESCROW_ATTESTOR_PRIVATE_KEY` and `CORE_WALLET_PRIVATE_KEY` start with `0x`

### Error: "insufficient funds for gas"
- Relayer wallet (0x356435901c4bF97E2f695a4377087670201e5588) has no Sepolia ETH
- Get Sepolia ETH from: https://sepoliafaucet.com/

### Error: "campaign not found" or "insufficient budget"
- Campaign not created on-chain yet
- Run: `$env:ACTION="2"; pnpm --filter @web3cash/contracts test-escrow`

---

## 📊 Expected On-Chain Flow

1. **User completes quest** → status = HOLDING (1 min hold)
2. **After 1 min** → recheck worker promotes to VERIFIED, credits pendingBalance
3. **User clicks "Run pipeline"** → drains pendingBalance into QUEUED Payout
4. **Backend calls escrow.claim()** → on-chain transaction
5. **Transaction confirms** → USDC transferred to user's wallet
6. **Payout status** = PAID, txHash saved
7. **User sees**:
   - Pending balance = $0 (drained)
   - Withdrawals table shows tx with Etherscan link
   - Wallet balance increases by $2 USDC

---

## 🎯 Current Status

- ✅ Escrow contract deployed: `0xA67F9b4a122Ef009Ef45eA4fd3C3c250C94F9dd7`
- ✅ Campaign funded: 20 USDC
- ✅ Quest completions: 2x HOLDING (Discord + GitHub)
- ❌ **Blocking issue**: Missing/malformed private keys in Railway
- 🔧 **Fix**: Add all variables above with correct `0x` prefix

Once fixed, the entire pipeline will work end-to-end with on-chain proof.
