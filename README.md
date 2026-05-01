# Web3Cash

Real money rewards for real on-chain actions. Verified Web3 cashback platform.

Web3Cash lets Web3 projects pay users in USDC for completing verified on-chain and social actions. Quests include following on Twitter, joining Discord, starring on GitHub, and on-chain deposits. All payouts are verified before release, with built-in anti-fraud mechanisms including Sybil scoring, 72-hour hold windows, and append-only audit logs.

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
│   └── sybil/      Sybil scoring with pluggable adapters (Alchemy, Passport, etc.)
├── infra/          docker-compose.yml (local Postgres + Redis)
└── .github/        CI workflows
```

The codebase uses a port/adapter pattern to make integrations swappable without touching core logic — escrow providers (Gnosis Safe → smart contracts), chain adapters (Ethereum → Base/Polygon/Arbitrum), and Sybil signal sources can be added by implementing interfaces.

## Stack

- **Runtime**: Node.js 20+, TypeScript, ESM, pnpm workspaces
- **Frontend**: Next.js 14 App Router, wagmi v2, viem, RainbowKit, Tailwind
- **Backend**: Next.js API routes (sync) + standalone Node worker (async)
- **DB**: PostgreSQL via Prisma (Railway in prod, local docker in dev)
- **Queue**: BullMQ on Redis (Upstash in prod, local docker in dev)
- **Chain**: Ethereum mainnet; Alchemy for on-chain reads
- **Auth**: SIWE (EIP-4361) → JWT in HTTP-only cookie

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

## Features

- **Wallet Connect**: MetaMask + WalletConnect via RainbowKit
- **SIWE Auth**: EIP-4361 sign-in with single-use server-issued nonces
- **JWT Sessions**: HTTP-only session cookies with 7-day TTL
- **Referral System**: Auto-generated referral codes, captured at landing page and persisted through OAuth flows
- **Sybil Scoring**: Wallet age and transaction count analysis via Alchemy to filter low-quality accounts
- **Quest Verification**: Social quest verifiers (Twitter, Discord, GitHub) with 72-hour hold windows to prevent unfollow fraud
- **Payouts**: Batch USDC payouts via Gnosis Safe with append-only audit logs
- **Multi-chain Support**: Extensible architecture for Ethereum, Base, Polygon, and Arbitrum

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

## Security notes

- All wallet addresses stored lowercase. UNIQUE constraints assume normalized input.
- SIWE messages MUST match `SIWE_DOMAIN`. Mismatch = phishing-relay attempt → reject.
- Nonces are single-use (atomic `updateMany`) with 5-minute TTL.
- JWT secret must be ≥32 chars (enforced at boot).
- `JWT_SECRET` rotation forces all sessions to re-sign in.
- OAuth tokens are AES-256 encrypted at rest before storage.
- All verification events are logged to an append-only audit table for forensic analysis.

