#!/usr/bin/env node

/**
 * Web3Cash API Test Script
 * 
 * This script tests all API endpoints in the Web3Cash application.
 * Run with: node scripts/api-test-script.js
 * 
 * Prerequisites:
 * - Server running on http://localhost:3000
 * - Database and Redis running
 * - .env configured
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test state
let sessionCookie = null;
let testWallet = null;
let testQuestId = null;
let testCompletionId = null;
let testPayoutId = null;

// Utility functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.cyan);
  console.log('='.repeat(60));
}

function logTest(name) {
  console.log(`\n→ ${name}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`  ${message}`, colors.yellow);
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (sessionCookie) {
    headers.Cookie = `w3c_session=${sessionCookie}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, data, headers: response.headers };
}

// Test functions
async function testHealthCheck() {
  logTest('Health Check');
  const { status, data } = await request('/api/health');
  if (status === 200) {
    logSuccess('Health check passed');
    return true;
  } else {
    logError(`Health check failed: ${status}`);
    return false;
  }
}

async function testAuthNonce() {
  logTest('Get Auth Nonce');
  const { status, data } = await request('/api/auth/nonce', { method: 'POST' });
  if (status === 200 && data.nonce) {
    logSuccess(`Nonce received: ${data.nonce.substring(0, 16)}...`);
    return data.nonce;
  } else {
    logError(`Failed to get nonce: ${status}`);
    return null;
  }
}

async function testAuthVerify(nonce) {
  logTest('Auth Verify (SIWE)');
  
  // Note: This requires a real wallet signature
  // For testing purposes, we'll skip the actual signature verification
  // In a real test, you would use a library like ethers.js to sign the message
  
  logInfo('Note: This test requires a real wallet signature');
  logInfo('Skipping actual SIWE verification in automated test');
  
  // For manual testing, you would:
  // 1. Create a SIWE message with the nonce
  // 2. Sign it with a wallet
  // 3. Send the signature to this endpoint
  
  return false;
}

async function testAuthMe() {
  logTest('Get Current User (Session)');
  const { status, data } = await request('/api/auth/me');
  if (status === 200) {
    logSuccess('Session valid');
    testWallet = data.walletAddress;
    logInfo(`Wallet: ${testWallet}`);
    return true;
  } else if (status === 401) {
    logInfo('No active session (expected if not logged in)');
    return false;
  } else {
    logError(`Unexpected status: ${status}`);
    return false;
  }
}

async function testAuthLogout() {
  logTest('Logout');
  const { status } = await request('/api/auth/logout', { method: 'POST' });
  if (status === 200) {
    logSuccess('Logged out successfully');
    sessionCookie = null;
    return true;
  } else {
    logError(`Logout failed: ${status}`);
    return false;
  }
}

async function testGetQuests() {
  logTest('Get Quests');
  const { status, data } = await request('/api/quests');
  if (status === 200) {
    logSuccess(`Retrieved ${data.quests.length} quests`);
    if (data.quests.length > 0) {
      testQuestId = data.quests[0].id;
      logInfo(`Sample quest ID: ${testQuestId}`);
      logInfo(`Sample quest: ${data.quests[0].title}`);
    }
    return true;
  } else {
    logError(`Failed to get quests: ${status}`);
    return false;
  }
}

async function testCompleteQuest() {
  if (!testQuestId) {
    logInfo('No quest ID available, skipping');
    return false;
  }

  logTest(`Complete Quest: ${testQuestId}`);
  const { status, data } = await request(`/api/quests/${testQuestId}/complete`, {
    method: 'POST'
  });

  if (status === 200) {
    logSuccess('Quest completion initiated');
    testCompletionId = data.completionId;
    logInfo(`Completion ID: ${testCompletionId}`);
    logInfo(`Status: ${data.status}`);
    logInfo(`Release at: ${data.releaseAt}`);
    return true;
  } else if (status === 401) {
    logInfo('Authentication required');
    return false;
  } else {
    logError(`Failed to complete quest: ${status}`);
    logInfo(`Error: ${JSON.stringify(data)}`);
    return false;
  }
}

async function testGetReferrals() {
  logTest('Get Referral Stats');
  const { status, data } = await request('/api/referrals');
  if (status === 200) {
    logSuccess('Referral stats retrieved');
    logInfo(`Referral code: ${data.referralCode}`);
    logInfo(`Referee count: ${data.refereeCount}`);
    logInfo(`Earnings: ${JSON.stringify(data.earnings)}`);
    return true;
  } else if (status === 401) {
    logInfo('Authentication required');
    return false;
  } else {
    logError(`Failed to get referrals: ${status}`);
    return false;
  }
}

async function testCreateWithdrawal() {
  logTest('Create Withdrawal');
  const { status, data } = await request('/api/withdrawals', {
    method: 'POST'
  });

  if (status === 200) {
    logSuccess('Withdrawal created');
    testPayoutId = data.payoutId;
    logInfo(`Payout ID: ${testPayoutId}`);
    logInfo(`Amount: ${data.amountUsdc} USDC`);
    logInfo(`Line items: ${data.lineItemCount}`);
    return true;
  } else if (status === 401) {
    logInfo('Authentication required');
    return false;
  } else if (status === 400) {
    logInfo('No pending balance or below minimum');
    logInfo(`Error: ${data.error}`);
    return false;
  } else {
    logError(`Failed to create withdrawal: ${status}`);
    logInfo(`Error: ${JSON.stringify(data)}`);
    return false;
  }
}

async function testGetWithdrawals() {
  logTest('Get Withdrawal History');
  const { status, data } = await request('/api/withdrawals');
  if (status === 200) {
    logSuccess(`Retrieved ${data.payouts.length} withdrawals`);
    if (data.payouts.length > 0) {
      logInfo(`Latest payout: ${data.payouts[0].amountUsdc} USDC`);
      logInfo(`Status: ${data.payouts[0].status}`);
    }
    return true;
  } else if (status === 401) {
    logInfo('Authentication required');
    return false;
  } else {
    logError(`Failed to get withdrawals: ${status}`);
    return false;
  }
}

async function testOAuthTwitterStart() {
  logTest('Twitter OAuth Start');
  const { status, headers } = await request('/api/oauth/twitter/start?returnTo=/dashboard');
  
  if (status === 302 || status === 307) {
    const location = headers.get('location');
    logSuccess('Redirected to Twitter');
    logInfo(`Redirect URL: ${location?.substring(0, 50)}...`);
    return true;
  } else if (status === 401) {
    logInfo('Authentication required');
    return false;
  } else {
    logError(`Failed to start Twitter OAuth: ${status}`);
    return false;
  }
}

async function testOAuthDiscordStart() {
  logTest('Discord OAuth Start');
  const { status, headers } = await request('/api/oauth/discord/start?returnTo=/dashboard');
  
  if (status === 302 || status === 307) {
    const location = headers.get('location');
    logSuccess('Redirected to Discord');
    logInfo(`Redirect URL: ${location?.substring(0, 50)}...`);
    return true;
  } else if (status === 401) {
    logInfo('Authentication required');
    return false;
  } else {
    logError(`Failed to start Discord OAuth: ${status}`);
    return false;
  }
}

async function testOAuthGithubStart() {
  logTest('GitHub OAuth Start');
  const { status, headers } = await request('/api/oauth/github/start?returnTo=/dashboard');
  
  if (status === 302 || status === 307) {
    const location = headers.get('location');
    logSuccess('Redirected to GitHub');
    logInfo(`Redirect URL: ${location?.substring(0, 50)}...`);
    return true;
  } else if (status === 401) {
    logInfo('Authentication required');
    return false;
  } else {
    logError(`Failed to start GitHub OAuth: ${status}`);
    return false;
  }
}

async function testKYCPersonaStart() {
  logTest('Persona KYC Start');
  const { status, data } = await request('/api/kyc/persona/start', {
    method: 'POST'
  });

  if (status === 200) {
    logSuccess('KYC inquiry started');
    logInfo(`Inquiry ID: ${data.inquiryId}`);
    return true;
  } else if (status === 401) {
    logInfo('Authentication required');
    return false;
  } else {
    logError(`Failed to start KYC: ${status}`);
    logInfo(`Error: ${JSON.stringify(data)}`);
    return false;
  }
}

async function testAdminBootstrapProject() {
  logTest('Admin: Bootstrap Project');
  const { status, data } = await request('/api/admin/bootstrap-project', {
    method: 'POST'
  });

  if (status === 200) {
    logSuccess('Project bootstrapped');
    logInfo(`Project ID: ${data.projectId}`);
    return true;
  } else {
    logError(`Failed to bootstrap project: ${status}`);
    logInfo(`Error: ${JSON.stringify(data)}`);
    return false;
  }
}

async function testAdminCheckPayouts() {
  logTest('Admin: Check Payouts');
  const { status, data } = await request('/api/admin/check-payouts', {
    method: 'GET'
  });

  if (status === 200) {
    logSuccess('Payouts checked');
    return true;
  } else if (status === 401) {
    logInfo('Authentication required');
    return false;
  } else {
    logError(`Failed to check payouts: ${status}`);
    logInfo(`Error: ${JSON.stringify(data)}`);
    return false;
  }
}

async function testAdminSetSybil() {
  logTest('Admin: Set Sybil Score');
  const { status, data } = await request('/api/admin/set-sybil', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress: testWallet || '0x1234567890123456789012345678901234567890',
      score: 80
    })
  });

  if (status === 200) {
    logSuccess('Sybil score set');
    return true;
  } else {
    logError(`Failed to set Sybil score: ${status}`);
    logInfo(`Error: ${JSON.stringify(data)}`);
    return false;
  }
}

async function testConsoleCampaigns() {
  logTest('Console: Get Campaigns');
  const { status, data } = await request('/api/console/campaigns');

  if (status === 200) {
    logSuccess(`Retrieved ${data.length} campaigns`);
    return true;
  } else if (status === 401) {
    logInfo('Project authentication required');
    return false;
  } else {
    logError(`Failed to get campaigns: ${status}`);
    return false;
  }
}

async function testConsoleCreateCampaign() {
  logTest('Console: Create Campaign');
  const { status, data } = await request('/api/console/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Campaign',
      budgetUsdc: '1000',
      chainId: 1
    })
  });

  if (status === 200) {
    logSuccess('Campaign created');
    logInfo(`Campaign ID: ${data.id}`);
    return true;
  } else if (status === 401) {
    logInfo('Project authentication required');
    return false;
  } else {
    logError(`Failed to create campaign: ${status}`);
    logInfo(`Error: ${JSON.stringify(data)}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('Web3Cash API Test Script', colors.cyan);
  log(`Testing against: ${BASE_URL}`, colors.yellow);
  
  let passed = 0;
  let failed = 0;

  // Public endpoints
  logSection('Public Endpoints');
  if (await testHealthCheck()) passed++; else failed++;

  // Auth endpoints
  logSection('Authentication Endpoints');
  const nonce = await testAuthNonce();
  if (nonce) passed++; else failed++;
  
  // Note: Skipping actual SIWE verify as it requires wallet signature
  logInfo('Skipping SIWE verify (requires wallet signature)');
  
  if (await testAuthMe()) passed++; else failed++;
  if (await testAuthLogout()) passed++; else failed++;

  // Quest endpoints
  logSection('Quest Endpoints');
  if (await testGetQuests()) passed++; else failed++;
  if (await testCompleteQuest()) passed++; else failed++;

  // OAuth endpoints
  logSection('OAuth Endpoints');
  if (await testOAuthTwitterStart()) passed++; else failed++;
  if (await testOAuthDiscordStart()) passed++; else failed++;
  if (await testOAuthGithubStart()) passed++; else failed++;

  // User endpoints
  logSection('User Endpoints');
  if (await testGetReferrals()) passed++; else failed++;
  if (await testCreateWithdrawal()) passed++; else failed++;
  if (await testGetWithdrawals()) passed++; else failed++;

  // KYC endpoints
  logSection('KYC Endpoints');
  if (await testKYCPersonaStart()) passed++; else failed++;

  // Admin endpoints
  logSection('Admin Endpoints');
  if (await testAdminBootstrapProject()) passed++; else failed++;
  if (await testAdminCheckPayouts()) passed++; else failed++;
  if (await testAdminSetSybil()) passed++; else failed++;

  // Console endpoints
  logSection('Console (Project) Endpoints');
  if (await testConsoleCampaigns()) passed++; else failed++;
  if (await testConsoleCreateCampaign()) passed++; else failed++;

  // Summary
  logSection('Test Summary');
  log(`Total tests: ${passed + failed}`, colors.cyan);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, colors.red);
  
  if (failed === 0) {
    log('\n✓ All tests passed!', colors.green);
  } else {
    log(`\n✗ ${failed} test(s) failed`, colors.red);
  }
}

// Run tests
runTests().catch(error => {
  logError(`Test script error: ${error.message}`);
  process.exit(1);
});
