# Web3Cash API Test Script

## Overview

This directory contains automated test scripts for testing all Web3Cash API endpoints.

## Test Script: `api-test-script.js`

A comprehensive Node.js script that tests all API endpoints in the Web3Cash application.

### Prerequisites

1. **Server Running**: The Web3Cash application must be running on `http://localhost:3000`
   ```bash
   # Terminal 1 - Start database
   pnpm infra:up
   
   # Terminal 2 - Start web server
   pnpm dev:web
   
   # Terminal 3 - Start worker (optional for some tests)
   pnpm dev:worker
   ```

2. **Environment Configured**: Ensure `.env` file is properly configured with all required variables

3. **Node.js**: Node.js 20+ installed

### Running the Tests

```bash
# From the Web3Cash root directory
node scripts/api-test-script.js
```

To test against a different URL:
```bash
BASE_URL=http://your-server-url node scripts/api-test-script.js
```

### API Endpoints Tested

#### Public Endpoints
- `GET /api/health` - Health check

#### Authentication Endpoints
- `POST /api/auth/nonce` - Get SIWE nonce
- `POST /api/auth/verify` - Verify SIWE signature (requires wallet)
- `GET /api/auth/me` - Get current user from session
- `POST /api/auth/logout` - Logout

#### Quest Endpoints
- `GET /api/quests` - List all active quests
- `POST /api/quests/[id]/complete` - Complete a quest

#### OAuth Endpoints
- `GET /api/oauth/twitter/start` - Start Twitter OAuth
- `GET /api/oauth/discord/start` - Start Discord OAuth
- `GET /api/oauth/github/start` - Start GitHub OAuth

#### User Endpoints
- `GET /api/referrals` - Get referral statistics
- `POST /api/withdrawals` - Create withdrawal
- `GET /api/withdrawals` - Get withdrawal history

#### KYC Endpoints
- `POST /api/kyc/persona/start` - Start Persona KYC verification

#### Admin Endpoints
- `POST /api/admin/bootstrap-project` - Bootstrap a test project
- `POST /api/admin/check-payouts` - Check payout status
- `POST /api/admin/set-sybil` - Manually set Sybil score

#### Console (Project) Endpoints
- `GET /api/console/campaigns` - List project campaigns
- `POST /api/console/campaigns` - Create new campaign

### Test Output

The script provides colored terminal output:
- **Green** ✓ - Successful tests
- **Red** ✗ - Failed tests
- **Yellow** - Informational messages
- **Cyan** - Section headers

Example output:
```
Web3Cash API Test Script
Testing against: http://localhost:3000

============================================================
Public Endpoints
============================================================

→ Health Check
✓ Health check passed

============================================================
Authentication Endpoints
============================================================

→ Get Auth Nonce
✓ Nonce received: a1b2c3d4e5f6g7h8...
```

### Limitations

1. **SIWE Verification**: The actual SIWE signature verification is skipped in automated tests because it requires a real wallet signature. For full authentication testing, you need to:
   - Use a wallet (MetaMask, WalletConnect) to sign the SIWE message
   - Manually test the `/api/auth/verify` endpoint with the signature

2. **OAuth Callbacks**: OAuth callback endpoints (`/callback`) are not tested as they require browser redirects and external service authorization

3. **Authentication Required**: Many endpoints require authentication. The script will show "Authentication required" for these if no valid session exists

### Manual Testing Guide

For endpoints that require authentication:

1. **Get a nonce**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/nonce
   ```

2. **Sign SIWE message** (using your wallet):
   - Use the nonce from step 1
   - Sign with your wallet
   - Get the signature

3. **Verify and get session**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/verify \
     -H "Content-Type: application/json" \
     -d '{
       "message": "your-siwe-message",
       "signature": "your-wallet-signature"
     }'
   ```

4. **Copy the session cookie** from the response and set it in the test script or use it in curl commands:
   ```bash
   curl http://localhost:3000/api/quests \
     -H "Cookie: w3c_session=your-session-token"
   ```

### Expected Test Results

- **Public endpoints**: Should pass without authentication
- **Auth endpoints**: Nonce should work; verify requires manual wallet signature
- **Quest endpoints**: GET should work; POST requires authentication
- **OAuth endpoints**: Should redirect (302/307) if authenticated, 401 if not
- **User endpoints**: Return 401 if not authenticated
- **Admin endpoints**: Most should work (some may require specific setup)
- **Console endpoints**: Return 401 (requires project authentication)

### Troubleshooting

**Server not responding**:
- Ensure the web server is running on port 3000
- Check that `.env` is configured
- Verify database and Redis are running

**Authentication errors**:
- Complete the SIWE flow manually first
- Copy the session cookie
- The script doesn't automatically handle wallet signatures

**Database errors**:
- Run migrations: `pnpm db:migrate`
- Check database connection in `.env`
- Ensure PostgreSQL is running

**OAuth errors**:
- OAuth requires callback URLs configured in external services (Twitter, Discord, GitHub)
- These tests only check the redirect, not full OAuth flow

### Extending the Tests

To add more tests:

1. Add a new test function:
```javascript
async function testYourNewEndpoint() {
  logTest('Your New Endpoint');
  const { status, data } = await request('/api/your-endpoint', {
    method: 'POST',
    body: JSON.stringify({ /* your data */ })
  });
  
  if (status === 200) {
    logSuccess('Test passed');
    return true;
  } else {
    logError(`Test failed: ${status}`);
    return false;
  }
}
```

2. Call it in `runTests()`:
```javascript
// Add to appropriate section
logSection('Your Section');
if (await testYourNewEndpoint()) passed++; else failed++;
```

### Security Notes

- Never commit real API keys or secrets
- Use environment variables for sensitive data
- Test against local/staging environments before production
- The test script does not modify production data (uses test endpoints where available)
