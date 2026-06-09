#!/usr/bin/env tsx

export {};

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type ResultStatus = 'PASS' | 'FAIL' | 'WARN';

interface EndpointTest {
  name: string;
  method: Method;
  path: string;
  expectedStatuses: number[];
  required: boolean;
  body?: unknown;
  headers?: Record<string, string>;
  validate?: (body: unknown) => void;
}

interface TestResult {
  name: string;
  method: Method;
  path: string;
  status: ResultStatus;
  httpStatus?: number;
  latencyMs: number;
  detail?: string;
}

const API_URL = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = Number(process.env.API_TEST_TIMEOUT_MS ?? 3000);
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Response body is not an object');
  }
}

function assertArrayProperty(value: unknown, property: string) {
  assertObject(value);
  if (!Array.isArray(value[property])) {
    throw new Error(`${property} is not an array`);
  }
}

async function request(test: EndpointTest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = {
    ...(test.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(test.headers ?? {}),
  };

  try {
    const response = await fetch(`${API_URL}${test.path}`, {
      method: test.method,
      headers,
      body: test.body === undefined ? undefined : JSON.stringify(test.body),
      redirect: 'manual',
      signal: controller.signal,
    });
    const text = await response.text();
    let body: unknown = text;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function runTest(test: EndpointTest): Promise<TestResult> {
  const start = Date.now();
  try {
    const { response, body } = await request(test);
    const latencyMs = Date.now() - start;
    const expected = test.expectedStatuses.includes(response.status);

    if (!expected) {
      const detail = typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body).slice(0, 300);
      return {
        name: test.name,
        method: test.method,
        path: test.path,
        status: test.required ? 'FAIL' : 'WARN',
        httpStatus: response.status,
        latencyMs,
        detail: `Expected ${test.expectedStatuses.join('/')}, got ${response.status}: ${detail}`,
      };
    }

    if (test.validate) {
      test.validate(body);
    }

    return {
      name: test.name,
      method: test.method,
      path: test.path,
      status: 'PASS',
      httpStatus: response.status,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const detail = err instanceof Error && err.name === 'AbortError'
      ? `Timed out after ${REQUEST_TIMEOUT_MS}ms`
      : err instanceof Error ? err.message : String(err);
    return {
      name: test.name,
      method: test.method,
      path: test.path,
      status: test.required ? 'FAIL' : 'WARN',
      latencyMs,
      detail,
    };
  }
}

const uniqueEmail = `api-test-${Date.now()}@example.com`;

const tests: EndpointTest[] = [
  {
    name: 'Health check',
    method: 'GET',
    path: '/api/health',
    expectedStatuses: [200],
    required: true,
    validate: (body) => {
      assertObject(body);
      if (body.status !== 'ok') throw new Error('status is not ok');
    },
  },
  {
    name: 'Readiness check with database',
    method: 'GET',
    path: '/api/ready',
    expectedStatuses: [200],
    required: true,
    validate: (body) => {
      assertObject(body);
      if (body.status !== 'ready') throw new Error('status is not ready');
    },
  },
  { name: 'Unknown route returns JSON 404', method: 'GET', path: '/api/__missing__', expectedStatuses: [404], required: true },
  {
    name: 'Waitlist signup',
    method: 'POST',
    path: '/api/waitlist',
    expectedStatuses: [200],
    required: true,
    body: { email: uniqueEmail },
    validate: (body) => {
      assertObject(body);
      if (body.success !== true) throw new Error('success is not true');
    },
  },
  {
    name: 'Auth nonce',
    method: 'POST',
    path: '/api/auth/nonce',
    expectedStatuses: [200],
    required: true,
    validate: (body) => {
      assertObject(body);
      if (typeof body.nonce !== 'string' || body.nonce.length < 16) throw new Error('nonce missing or invalid');
    },
  },
  { name: 'Auth verify rejects invalid payload', method: 'POST', path: '/api/auth/verify', expectedStatuses: [401], required: true, body: {} },
  { name: 'Current auth user rejects anonymous', method: 'GET', path: '/api/auth/me', expectedStatuses: [401], required: true },
  { name: 'Logout works without session', method: 'POST', path: '/api/auth/logout', expectedStatuses: [200], required: true },
  {
    name: 'List active quests',
    method: 'GET',
    path: '/api/quests',
    expectedStatuses: [200],
    required: true,
    validate: (body) => assertArrayProperty(body, 'quests'),
  },
  { name: 'My quest completions rejects anonymous', method: 'GET', path: '/api/quests/my-completions', expectedStatuses: [401], required: true },
  { name: 'Quest completion rejects anonymous', method: 'POST', path: '/api/quests/test-quest/complete', expectedStatuses: [401], required: true, body: {} },
  { name: 'User referrals rejects anonymous', method: 'GET', path: '/api/user/referrals', expectedStatuses: [401], required: true },
  { name: 'User withdrawals list rejects anonymous', method: 'GET', path: '/api/user/withdrawals', expectedStatuses: [401], required: true },
  { name: 'User withdrawal create rejects anonymous', method: 'POST', path: '/api/user/withdrawals', expectedStatuses: [401], required: true, body: {} },
  { name: 'OAuth identities rejects anonymous', method: 'GET', path: '/api/oauth/identities', expectedStatuses: [401], required: true },
  { name: 'Twitter OAuth start rejects anonymous', method: 'GET', path: '/api/oauth/twitter/start', expectedStatuses: [401], required: true },
  { name: 'Discord OAuth start rejects anonymous', method: 'GET', path: '/api/oauth/discord/start', expectedStatuses: [401], required: true },
  { name: 'GitHub OAuth start rejects anonymous', method: 'GET', path: '/api/oauth/github/start', expectedStatuses: [401], required: true },
  { name: 'Twitter callback rejects invalid callback through redirect', method: 'GET', path: '/api/oauth/twitter/callback', expectedStatuses: [302, 303, 307, 308], required: true },
  { name: 'Discord callback rejects invalid callback through redirect', method: 'GET', path: '/api/oauth/discord/callback', expectedStatuses: [302, 303, 307, 308], required: true },
  { name: 'GitHub callback rejects invalid callback through redirect', method: 'GET', path: '/api/oauth/github/callback', expectedStatuses: [302, 303, 307, 308], required: true },
  { name: 'OAuth unlink rejects anonymous', method: 'DELETE', path: '/api/oauth/twitter', expectedStatuses: [401], required: true },
  { name: 'KYC start rejects anonymous', method: 'POST', path: '/api/kyc/start', expectedStatuses: [401], required: true, body: {} },
  { name: 'KYC status rejects anonymous', method: 'GET', path: '/api/kyc/status', expectedStatuses: [401], required: true },
  { name: 'KYC webhook rejects missing signature', method: 'POST', path: '/api/kyc/webhook', expectedStatuses: [401], required: true, body: { data: {} } },
  { name: 'Admin stats rejects missing secret', method: 'GET', path: '/api/admin/stats', expectedStatuses: [403], required: true },
  { name: 'Admin users rejects missing secret', method: 'GET', path: '/api/admin/users', expectedStatuses: [403], required: true },
  { name: 'Admin quests rejects missing secret', method: 'GET', path: '/api/admin/quests', expectedStatuses: [403], required: true },
  { name: 'Admin payouts rejects missing secret', method: 'GET', path: '/api/admin/payouts', expectedStatuses: [403], required: true },
  { name: 'Admin waitlist rejects missing secret', method: 'GET', path: '/api/admin/waitlist', expectedStatuses: [403], required: true },
  { name: 'Admin fraud flagged wallets rejects missing secret', method: 'GET', path: '/api/admin/fraud/flagged-wallets', expectedStatuses: [403], required: true },
  { name: 'Admin fraud sybil distribution rejects missing secret', method: 'GET', path: '/api/admin/fraud/sybil-distribution', expectedStatuses: [403], required: true },
  { name: 'Admin fraud velocity alerts rejects missing secret', method: 'GET', path: '/api/admin/fraud/velocity-alerts', expectedStatuses: [403], required: true },
  { name: 'Admin fraud review queue rejects missing secret', method: 'GET', path: '/api/admin/fraud/review-queue', expectedStatuses: [403], required: true },
  { name: 'Campaign route is not mounted in API service', method: 'GET', path: '/api/campaigns', expectedStatuses: [404], required: false },
  { name: 'Console campaign route is not mounted in API service', method: 'GET', path: '/api/console/campaigns', expectedStatuses: [404], required: false },
  { name: 'Telegram OAuth is not implemented', method: 'GET', path: '/api/oauth/telegram/start', expectedStatuses: [404], required: false },
];

if (ADMIN_SECRET) {
  const adminHeaders = { 'x-admin-secret': ADMIN_SECRET };
  tests.push(
    { name: 'Admin stats with secret', method: 'GET', path: '/api/admin/stats', expectedStatuses: [200], required: true, headers: adminHeaders },
    { name: 'Admin users with secret', method: 'GET', path: '/api/admin/users', expectedStatuses: [200], required: true, headers: adminHeaders, validate: (body) => assertArrayProperty(body, 'users') },
    { name: 'Admin quests with secret', method: 'GET', path: '/api/admin/quests', expectedStatuses: [200], required: true, headers: adminHeaders, validate: (body) => assertArrayProperty(body, 'quests') },
    { name: 'Admin payouts with secret', method: 'GET', path: '/api/admin/payouts', expectedStatuses: [200], required: true, headers: adminHeaders, validate: (body) => assertArrayProperty(body, 'payouts') },
    { name: 'Admin waitlist with secret', method: 'GET', path: '/api/admin/waitlist', expectedStatuses: [200], required: true, headers: adminHeaders, validate: (body) => assertArrayProperty(body, 'entries') },
  );
}

async function main() {
  console.log(`API_URL=${API_URL}`);
  console.log(`API_TEST_TIMEOUT_MS=${REQUEST_TIMEOUT_MS}`);
  console.log('');

  const results: TestResult[] = [];
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    const http = result.httpStatus ? `HTTP ${result.httpStatus}` : 'NO_RESPONSE';
    const detail = result.detail ? ` - ${result.detail}` : '';
    console.log(`${result.status} ${test.method} ${test.path} ${http} ${result.latencyMs}ms - ${test.name}${detail}`);
  }

  const failed = results.filter((result) => result.status === 'FAIL');
  const warned = results.filter((result) => result.status === 'WARN');
  const passed = results.filter((result) => result.status === 'PASS');

  console.log('');
  console.log('='.repeat(72));
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Warnings: ${warned.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log('='.repeat(72));

  if (warned.length > 0) {
    console.log('');
    console.log('Warnings:');
    for (const warning of warned) {
      console.log(`- ${warning.method} ${warning.path}: ${warning.name}`);
    }
  }

  if (failed.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const failure of failed) {
      console.log(`- ${failure.method} ${failure.path}: ${failure.detail ?? 'failed'}`);
    }
    process.exit(1);
  }

  console.log('');
  console.log('All required API checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
