# 🧪 Web3Cash Testing Guide

## Current Status

### ✅ What's Working
- **Frontend**: Black & golden theme deployed to Railway
- **Database**: Seeded with 5 live quests
- **Smart Contracts**: Deployed to Sepolia with 20 USDC funded
- **Wallet Connection**: SIWE authentication working

### ⚠️ Current Issues
1. **$0 USDC Balance**: Dashboard shows $0 pending/earned
2. **No OAuth Connected**: Twitter/Discord/GitHub not linked yet

---

## 🔍 Implemented Quest Verifiers

Based on the codebase, here are the **3 working verifiers**:

| Quest Type | Verifier Status | Requirements | OAuth Needed |
|------------|----------------|--------------|--------------|
| **TWITTER_FOLLOW** | ✅ Fully Implemented | `targetHandle` (e.g., "elonmusk") | Twitter OAuth |
| **DISCORD_JOIN** | ✅ Fully Implemented | `guildId` (Discord server ID) | Discord OAuth |
| **GITHUB_STAR** | ✅ Fully Implemented | `owner` + `repo` (e.g., "vercel/next.js") | GitHub OAuth |
| VISIT | ❌ No Verifier | `url` | None |
| ON_CHAIN_DEPOSIT | ❌ Not Implemented | - | None |
| INSTALL | ❌ Not Implemented | - | None |
| VIDEO | ❌ Not Implemented | - | None |

---

## 📋 Current Seeded Quests

| Quest | Type | Reward | Target | Can Test? |
|-------|------|--------|--------|-----------|
| Follow @web3cash on Twitter | TWITTER_FOLLOW | $1.00 USDC | @web3cash | ⚠️ Need Twitter OAuth |
| Follow @acmedefi | TWITTER_FOLLOW | $0.50 USDC | @acmedefi | ⚠️ Need Twitter OAuth |
| Visit acme.fi | VISIT | $0.25 USDC | https://acme.fi | ❌ No verifier |
| Follow @noderunners | TWITTER_FOLLOW | $2.00 USDC | @noderunners | ⚠️ Need Twitter OAuth |
| Star noderunners/runner-cli | GITHUB_STAR | $1.00 USDC | noderunners/runner-cli | ⚠️ Need GitHub OAuth |

---

## 🎯 Recommended Test Plan

### **Option 1: Test with YOUR Credentials (Recommended)**

Since you have Discord and GitHub credentials configured, let's create testable quests:

#### **Step 1: Create a Discord Quest**
```bash
# You need:
# 1. Your Discord Server ID (Guild ID)
# 2. Users must join your Discord server to claim
```

**How to get Discord Guild ID:**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your server → Copy Server ID
3. Example: `1234567890123456789`

#### **Step 2: Create a GitHub Quest**
```bash
# You need:
# 1. A public GitHub repo (owner/repo)
# 2. Users must star the repo to claim
```

**Example repos to use:**
- Your own repo: `BlockX-AI/Web3Cash`
- Or create a test repo: `yourusername/web3cash-test`

---

### **Option 2: Fix OAuth and Test Twitter**

The Twitter quests are already seeded but require Twitter OAuth to be configured.

**Current Twitter OAuth Status:**
```env
TWITTER_CLIENT_ID=          # ❌ Empty
TWITTER_CLIENT_SECRET=      # ❌ Empty
```

**To enable Twitter quests:**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new app with OAuth 2.0
3. Add callback URL: `https://web3cashweb-production.up.railway.app/api/oauth/twitter/callback`
4. Copy Client ID and Client Secret
5. Add to Railway environment variables
6. Redeploy

---

## 🚀 Recommended Action: Create Testable Quests NOW

Let me create 2 new quests you can test immediately:

### **Quest 1: Join Web3Cash Discord** (if you have a Discord server)
- **Type**: DISCORD_JOIN
- **Reward**: $0.50 USDC
- **Requirement**: Your Discord Guild ID
- **Test**: You can join your own server and claim

### **Quest 2: Star Web3Cash Repo on GitHub**
- **Type**: GITHUB_STAR  
- **Reward**: $1.00 USDC
- **Requirement**: `BlockX-AI/Web3Cash`
- **Test**: Star your own repo and claim

---

## 🔧 What I Need From You

**To create testable quests, please provide:**

1. **Discord Server ID** (if you have one)
   - Right-click server → Copy Server ID
   - Example: `1234567890123456789`

2. **GitHub Repo** to use for star quest
   - Format: `owner/repo`
   - Example: `BlockX-AI/Web3Cash`

3. **OR** Twitter OAuth credentials
   - Client ID
   - Client Secret
   - Then we can test the existing Twitter quests

---

## 🐛 Why Balance Shows $0

The dashboard shows $0 because:

1. **No quests completed yet** — you haven't claimed any rewards
2. **OAuth not connected** — can't verify Twitter/Discord/GitHub actions
3. **VISIT quest has no verifier** — the $0.25 quest won't work

**To fix:**
- Connect OAuth (Twitter/Discord/GitHub)
- Complete a quest
- Wait for verification (instant for Discord/GitHub, 72h hold for Twitter)
- Balance will update

---

## 📊 Expected Flow After OAuth is Connected

1. **User connects wallet** → SIWE sign-in ✅
2. **User clicks "Link Twitter"** → OAuth flow → Token stored ✅
3. **User clicks "Claim Reward" on Twitter quest** → Backend verifies follow → Creates completion
4. **Status changes**:
   - `HOLDING` (72h hold period for social quests)
   - After 72h → `VERIFIED`
   - Backend calls smart contract → `PAID`
5. **User sees USDC in wallet** 🎉

---

## 🎬 Next Steps

**Choose one:**

### A. Quick Test (Discord + GitHub)
1. Give me your Discord Guild ID
2. Give me a GitHub repo (owner/repo)
3. I'll create 2 new quests
4. You connect Discord + GitHub OAuth
5. Complete quests and test end-to-end

### B. Full Test (Twitter)
1. Get Twitter OAuth credentials
2. Add to Railway
3. Test existing Twitter quests
4. Verify 72h hold period works

### C. Create Custom Quests
1. Use the `/create` page on Railway
2. Create your own campaign
3. Add Discord/GitHub quests
4. Test the full creator → completer flow

---

## 📝 Summary

**Working Verifiers**: Twitter, Discord, GitHub  
**Current Quests**: 3 Twitter (need OAuth), 1 GitHub, 1 VISIT (broken)  
**To Test Now**: Need Discord Guild ID OR GitHub repo OR Twitter OAuth  

**What would you like to do?**
