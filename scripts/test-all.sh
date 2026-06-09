#!/bin/bash
# Web3Cash Full API Test Script
# Runs DB migrations, starts API, tests all endpoints

set -e

cd "$(dirname "$0")/.."

echo "📦 Step 1: Installing dependencies..."
pnpm install

echo "🗄️  Step 2: Running database migrations..."
pnpm --filter @web3cash/db generate
pnpm --filter @web3cash/db migrate:deploy || echo "⚠️  Migration failed - DB may not be running"

echo "🚀 Step 3: Starting API server..."
# Kill any existing process on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1

# Start API in background
nohup pnpm --filter @web3cash/api dev > /tmp/api.log 2>&1 &
API_PID=$!
echo "API started with PID: $API_PID"

# Wait for API to be ready
echo "⏳ Waiting for API to start..."
sleep 5

# Check if API is running
if ! lsof -ti:3001 > /dev/null; then
    echo "❌ API failed to start. Check logs:"
    cat /tmp/api.log
    exit 1
fi

echo "✅ API is running on http://localhost:3001"
echo ""
echo "🧪 Step 4: Running API tests..."
pnpm test:api
TEST_RESULT=$?

# Cleanup
echo ""
echo "🧹 Step 5: Cleaning up..."
kill $API_PID 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
