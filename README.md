# Web3Cash

Real money rewards for real on-chain actions. Verified Web3 cashback platform.

> **Status**: Phase 1 — Foundation (auth, DB, sybil scoring). See `web3cash-mvp.html` and `web3cash-plan.html` for the full product spec.

---

## Architecture

```
web3cash/
├── apps/
│   ├── web/        Next.js 14 — frontend + API routes (deployed: Vercel)
│   └── worker/     Node BullMQ workers (deployed: Railway)
├── packages/
│   ├── shared/     Zod schemas, money helpers, constants, types
│   ├── db/         Prisma schema + client (single source of truth)
│   ├── auth/       SIWE (EIP-4361) + JWT session
│   └── sybil/      Sybil scoring with pluggable adapters (Alchemy now, Passport/Moralis later)
├── infra/          docker-compose.yml (local Postgres + Redis)
└── .github/        CI workflows
```

**Why a port/adapter pattern?** Phase 6 swaps Gnosis Safe → smart contract escrow with zero changes to anything outside `packages/payouts`. Phase 7 adds chains by adding RPC URLs only.

## Stack

- **Runtime**: Node.js 20+, TypeScript, ESM, pnpm workspaces
- **Frontend**: Next.js 14 App Router, wagmi v2, viem, RainbowKit, Tailwind
- **Backend**: Next.js API routes (sync) + standalone Node worker (async)
- **DB**: PostgreSQL via Prisma (Railway in prod, local docker in dev)
- **Queue**: BullMQ on Redis (Upstash in prod, local docker in dev)
- **Chain**: Ethereum mainnet (Phase 6+); Alchemy for reads
- **Auth**: SIWE → JWT in HTTP-only cookie

## Local development

### 1. Prerequisites
- Node.js 20+ ([nvm](https://github.com/nvm-sh/nvm) recommended — see `.nvmrc`)
- pnpm 9+ (`npm i -g pnpm`)
- Docker (for local Postgres + Redis)

### 2. Setup

```bash
# Install deps
pnpm install

# Copy env template
cp .env.example .env
# Edit .env: set ALCHEMY_API_KEY, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, JWT_SECRET

# Start Postgres + Redis
pnpm infra:up

# Generate Prisma client + run migrations
pnpm db:generate
pnpm db:migrate

# (Optional) seed a demo project + quest
pnpm db:seed
```

### 3. Run

```bash
# Terminal 1 — frontend on http://localhost:3000
pnpm dev:web

# Terminal 2 — worker
pnpm dev:worker
```

Open http://localhost:3000, click **Connect Wallet**, sign the SIWE message, and you'll land at `/dashboard`.

## Phase 1 — Done When

- [x] Wallet connect via RainbowKit (MetaMask + WalletConnect)
- [x] SIWE (EIP-4361) sign-in with single-use server-issued nonce
- [x] HTTP-only JWT session cookie
- [x] User row created on first login with auto-generated referral code
- [x] Referral code captured at landing-page edge (cookie set in middleware) — survives OAuth in Phase 2
- [x] Sybil scoring (2 signals: wallet age + tx count via Alchemy)
- [x] Forward-compat DB schema: every Phase 6/7 column already exists nullable
- [x] Append-only `verification_events` and `admin_reviews` tables
- [x] CI: typecheck + build green

## Phase 2+ — Coming next

- **Phase 2 (Quest Loop)**: Twitter OAuth + verifier, BullMQ 72h delayed re-check, atomic budget exhaustion check
- **Phase 3 (Payouts + Referrals)**: Gnosis Safe 2-of-3 batch payouts, L1 referral payouts, Telegram + email
- **Phase 4 (Public MVP)**: Quest feed, USDC dashboard, mobile, 3 paying projects
- **Phase 5 (Hardening)**: Persona KYC, Discord verifier, on-chain quest verifier, 8-signal Sybil
- **Phase 6 (Smart Contracts)**: `Web3CashEscrow.sol` + `Web3CashRegistry.sol` with EIP-712 release, audit
- **Phase 7 (Multi-chain + Auto)**: Base + Polygon + Arbitrum, Circle USDC API, L2 referral, off-ramp

## Deployment

- **Frontend** → Vercel. Set root directory to `apps/web`. Env vars: copy from `.env.example`.
- **Worker** → Railway. Uses `railway.json`. Provision a Postgres plugin (auto-injects `DATABASE_URL`) and a Redis plugin (set `REDIS_URL`).
- **Migrations** run automatically as part of the Railway start command via `pnpm db:migrate:deploy`.

## Useful commands

```bash
pnpm typecheck      # All workspaces
pnpm build          # Build all packages + apps
pnpm db:studio      # Prisma Studio GUI
pnpm db:migrate     # Create + apply a new migration
pnpm infra:logs     # Follow docker-compose logs
```

## Security notes (Phase 1)

- All wallet addresses stored lowercase. UNIQUE constraints assume normalized input.
- SIWE messages MUST match `SIWE_DOMAIN`. Mismatch = phishing-relay attempt → reject.
- Nonces single-use (atomic `updateMany`); 5-minute TTL.
- JWT secret must be ≥32 chars (enforced at boot).
- `JWT_SECRET` rotation = forces all sessions to re-sign in. No revocation list in Phase 1.
- Tokens for OAuth (Phase 2) will be AES-256 encrypted at rest before storage.

