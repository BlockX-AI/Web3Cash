#!/bin/bash

# Web3Cash Demo Quest Setup Script
# This script creates a demo project, campaign, and quest for testing

API_URL="https://webcash-production.up.railway.app"
ADMIN_SECRET="change-me-admin-secret-2024"

echo "🚀 Creating Web3Cash Demo Quest Setup..."
echo ""

# 1. Create Demo Project
echo "1️⃣ Creating Demo Project..."
PROJECT_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/bootstrap-project" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{
    "name": "Web3Cash Demo Project",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f8bEd",
    "website": "https://web3cash.com"
  }')

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.projectId // empty')

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  echo "❌ Failed to create project"
  echo "Response: $PROJECT_RESPONSE"
  exit 1
fi

echo "✅ Project created: $PROJECT_ID"

# 2. Create Demo Campaign
echo ""
echo "2️⃣ Creating Demo Campaign..."
CAMPAIGN_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/campaigns" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"name\": \"Demo Campaign 2024\",
    \"budgetUsdc\": \"1000.00\",
    \"pricingModel\": \"CPA\",
    \"status\": \"ACTIVE\"
  }")

CAMPAIGN_ID=$(echo $CAMPAIGN_RESPONSE | jq -r '.id // empty')

if [ -z "$CAMPAIGN_ID" ] || [ "$CAMPAIGN_ID" = "null" ]; then
  echo "❌ Failed to create campaign"
  exit 1
fi

echo "✅ Campaign created: $CAMPAIGN_ID"

# 3. Create Demo Quests
echo ""
echo "3️⃣ Creating Demo Quests..."

# Twitter Follow Quest
curl -s -X POST "$API_URL/api/admin/quests" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"campaignId\": \"$CAMPAIGN_ID\",
    \"title\": \"Follow Web3Cash on Twitter\",
    \"description\": \"Follow our official Twitter account to stay updated with latest news and rewards\",
    \"type\": \"TWITTER_FOLLOW\",
    \"rewardUsdc\": \"5.00\",
    \"maxCompletions\": 1000,
    \"minSybilScore\": 40,
    \"requirements\": { \"twitterHandle\": \"web3cash\" },
    \"active\": true
  }"
echo "✅ Twitter Follow Quest created"

# Discord Join Quest
curl -s -X POST "$API_URL/api/admin/quests" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"campaignId\": \"$CAMPAIGN_ID\",
    \"title\": \"Join Web3Cash Discord\",
    \"description\": \"Join our Discord community to connect with other users and get support\",
    \"type\": \"DISCORD_JOIN\",
    \"rewardUsdc\": \"5.00\",
    \"maxCompletions\": 1000,
    \"minSybilScore\": 40,
    \"requirements\": { \"discordServerId\": \"123456789\" },
    \"active\": true
  }"
echo "✅ Discord Join Quest created"

# GitHub Star Quest
curl -s -X POST "$API_URL/api/admin/quests" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"campaignId\": \"$CAMPAIGN_ID\",
    \"title\": \"Star Web3Cash GitHub Repo\",
    \"description\": \"Star our GitHub repository to show your support\",
    \"type\": \"GITHUB_STAR\",
    \"rewardUsdc\": \"5.00\",
    \"maxCompletions\": 1000,
    \"minSybilScore\": 40,
    \"requirements\": { \"owner\": \"web3cash\", \"repo\": \"web3cash\" },
    \"active\": true
  }"
echo "✅ GitHub Star Quest created"

# Telegram Join Quest
curl -s -X POST "$API_URL/api/admin/quests" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"campaignId\": \"$CAMPAIGN_ID\",
    \"title\": \"Join Web3Cash Telegram\",
    \"description\": \"Join our Telegram channel for instant updates and announcements\",
    \"type\": \"TELEGRAM_JOIN\",
    \"rewardUsdc\": \"5.00\",
    \"maxCompletions\": 1000,
    \"minSybilScore\": 40,
    \"requirements\": { \"telegramChatId\": \"@web3cash\" },
    \"active\": true
  }"
echo "✅ Telegram Join Quest created"

# Wallet Connect Quest
curl -s -X POST "$API_URL/api/admin/quests" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"campaignId\": \"$CAMPAIGN_ID\",
    \"title\": \"Connect Your Wallet\",
    \"description\": \"Connect your wallet to get started with Web3Cash and earn rewards\",
    \"type\": \"WALLET_CONNECT\",
    \"rewardUsdc\": \"2.00\",
    \"maxCompletions\": 10000,
    \"minSybilScore\": 0,
    \"requirements\": {},
    \"active\": true
  }"
echo "✅ Wallet Connect Quest created"

echo ""
echo "🎉 Demo Quest Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  - Project ID: $PROJECT_ID"
echo "  - Campaign ID: $CAMPAIGN_ID"
echo "  - 5 Demo Quests Created:"
echo "    1. Twitter Follow ($5 USDC)"
echo "    2. Discord Join ($5 USDC)"
echo "    3. GitHub Star ($5 USDC)"
echo "    4. Telegram Join ($5 USDC)"
echo "    5. Wallet Connect ($2 USDC)"
echo ""
echo "🌐 Test at: https://web3cash-app.vercel.app/"
echo "🔧 Admin at: https://web3cash-app.vercel.app/admin (secret: change-me-admin-secret-2024)"
