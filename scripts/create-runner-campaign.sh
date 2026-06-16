#!/bin/bash

# Create Runner AI Credits Referral Campaign
# This script creates a project, campaign, and quest for the Runner referral program

set -e

API_URL="https://webcash-production.up.railway.app"
ADMIN_SECRET="change-me-admin-secret-2024"

echo "🚀 Creating Runner AI Credits Campaign..."

# 1. Create Project
echo "1️⃣ Creating Runner Project..."
# Generate a random wallet address to avoid conflicts
RANDOM_WALLET="0x$(openssl rand -hex 20)"
PROJECT_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/bootstrap-project" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"name\": \"Runner AI\",
    \"walletAddress\": \"$RANDOM_WALLET\",
    \"website\": \"https://runner.now\"
  }")

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.projectId // empty')

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  echo "❌ Failed to create project"
  echo "Response: $PROJECT_RESPONSE"
  exit 1
fi

echo "✅ Project created: $PROJECT_ID"

# 2. Create Campaign
echo "2️⃣ Creating Runner Campaign..."
CAMPAIGN_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/campaigns" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"name\": \"Claude Credits Giveaway\",
    \"budgetUsdc\": \"500\"
  }")

CAMPAIGN_ID=$(echo $CAMPAIGN_RESPONSE | jq -r '.id // empty')

if [ -z "$CAMPAIGN_ID" ] || [ "$CAMPAIGN_ID" = "null" ]; then
  echo "❌ Failed to create campaign"
  echo "Response: $CAMPAIGN_RESPONSE"
  exit 1
fi

echo "✅ Campaign created: $CAMPAIGN_ID"

# 3. Create Quest (VISIT type - user visits the referral link)
echo "3️⃣ Creating Runner Referral Quest..."
QUEST_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/quests" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"campaignId\": \"$CAMPAIGN_ID\",
    \"title\": \"Download Runner App - Get $150 Claude Credits\",
    \"description\": \"Download Runner app using the referral link to get $150 in free Claude AI credits. $100 upfront + $50 bonus after first week.\",
    \"type\": \"VISIT\",
    \"rewardUsdc\": \"5.00\",
    \"maxCompletions\": 1000,
    \"minSybilScore\": 30
  }")

QUEST_ID=$(echo $QUEST_RESPONSE | jq -r '.id // empty')

if [ -z "$QUEST_ID" ] || [ "$QUEST_ID" = "null" ]; then
  echo "❌ Failed to create quest"
  echo "Response: $QUEST_RESPONSE"
  exit 1
fi

echo "✅ Quest created: $QUEST_ID"

echo ""
echo "🎉 Runner Campaign Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  - Project ID: $PROJECT_ID"
echo "  - Campaign ID: $CAMPAIGN_ID"
echo "  - Quest ID: $QUEST_ID"
echo ""
echo "📝 Quest Details:"
echo "  - Title: Download Runner App - Get $150 Claude Credits"
echo "  - Type: VISIT (users visit referral link)"
echo "  - Reward: $5 USDC"
echo "  - Max Completions: 1000"
echo "  - Min Sybil Score: 30"
echo ""
echo "🌐 Test at: https://web3cash-app.vercel.app/"
echo "🔧 Admin at: https://web3cash-app.vercel.app/admin (secret: change-me-admin-secret-2024)"
