# Web3Cash Production Deployment Guide

## Prerequisites

### 1. Database Setup
- PostgreSQL database (managed service recommended: Railway, Neon, AWS RDS)
- Set `DATABASE_URL` environment variable
- Run Prisma migrations: `npx prisma migrate deploy`

### 2. Redis Setup
- Redis instance (managed service recommended: Upstash, AWS ElastiCache)
- Set `REDIS_URL` environment variable

### 3. Required Environment Variables

Copy `.env.example` to `.env` and configure:

#### Core Infrastructure
```
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
API_PORT=3001
```

#### Authentication
```
JWT_SECRET=<32+ char random string>
SIWE_DOMAIN=yourdomain.com
SIWE_URI=https://yourdomain.com
SIWE_STATEMENT=Sign in to Web3Cash. This will not trigger a transaction or cost any gas.
```

#### Blockchain (for Sybil Scoring)
```
ALCHEMY_API_KEY=<from alchemy.com>
ALCHEMY_NETWORK=eth-mainnet
DEFAULT_CHAIN_ID=1
```

#### OAuth Integrations
```
TWITTER_CLIENT_ID=<from developer.twitter.com>
TWITTER_CLIENT_SECRET=<from developer.twitter.com>
TWITTER_REDIRECT_URI=https://yourdomain.com/api/oauth/twitter/callback
TWITTER_BEARER_TOKEN=<optional server-to-server token>

DISCORD_CLIENT_ID=<from discord.com/developers>
DISCORD_CLIENT_SECRET=<from discord.com/developers>
DISCORD_REDIRECT_URI=https://yourdomain.com/api/oauth/discord/callback

GITHUB_CLIENT_ID=<from github.com/settings/developers>
GITHUB_CLIENT_SECRET=<from github.com/settings/developers>
GITHUB_REDIRECT_URI=https://yourdomain.com/api/oauth/github/callback

OAUTH_ENC_KEY=<16+ char random string for token encryption>
```

#### KYC (Persona)
```
PERSONA_API_KEY=<from withpersona.com>
PERSONA_TEMPLATE_ID=<from withpersona.com>
PERSONA_WEBHOOK_SECRET=<from withpersona.com webhook settings>
```

#### Payout System
```
PAYOUT_PROVIDER=GNOSIS_SAFE
GNOSIS_SAFE_ADDRESS=<funded safe address>
GNOSIS_SAFE_CHAIN_ID=1
GNOSIS_SAFE_TX_SERVICE=https://safe-transaction-mainnet.safe.global
GNOSIS_SAFE_PROPOSER=<owner address>
GNOSIS_SAFE_PROPOSER_PK=<private key for proposer>
```

#### Offer18 Affiliate Tracking (Optional)
```
OFFER18_TRACKING_DOMAIN=https://[account].offer18.com
OFFER18_GOAL_SIGNUP=1
OFFER18_GOAL_QUEST_COMPLETE=2
OFFER18_GOAL_KYC_VERIFIED=3
OFFER18_GOAL_DEPOSIT=4
```

#### Frontend
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<from cloud.walletconnect.com>
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_DEFAULT_CHAIN_ID=1
```

#### Observability (Optional)
```
SENTRY_DSN=<from sentry.io>
LOG_LEVEL=info
```

## Services to Deploy

### 1. API Server
- **Location**: `apps/api`
- **Build**: `npm run build`
- **Start**: `npm start`
- **Port**: 3001 (configurable via `API_PORT`)
- **Health Check**: `GET /api/health`
- **Readiness Check**: `GET /api/ready`

### 2. Frontend
- **Location**: `apps/web`
- **Build**: `npm run build`
- **Platform**: Vercel recommended (or any Node.js hosting)
- **Environment Variables**: Must set `NEXT_PUBLIC_*` vars

### 3. Worker
- **Location**: `apps/worker`
- **Build**: `npm run build`
- **Start**: `npm start`
- **Required**: Must run continuously for background jobs
- **Jobs**:
  - `compute-sybil-score`: Calculates Sybil scores for new users
  - `recheck-quest`: Re-verifies quest completions after hold period
  - `confirm-payout`: Checks payout transaction confirmations

### 4. Admin Panel (Optional)
- **Location**: `apps/admin`
- **Build**: `npm run build`
- **Platform**: Vercel recommended
- **Access Control**: Should be restricted to admin wallets only

## Deployment Platforms

### Recommended Setup

#### Option 1: Railway (All-in-One)
- Deploy API, Worker, and Admin on Railway
- Use Railway Postgres and Redis
- Deploy Frontend on Vercel
- Configure Railway to auto-deploy on git push

#### Option 2: Vercel + Supabase/Neon
- Deploy Frontend, API, and Admin on Vercel
- Use Supabase or Neon for PostgreSQL
- Use Upstash for Redis
- Deploy Worker separately (Railway, Render, or similar)

#### Option 3: AWS
- Frontend: S3 + CloudFront
- API: ECS Fargate or Lambda
- Worker: ECS Fargate
- Database: RDS PostgreSQL
- Redis: ElastiCache

## Database Migration

Before deploying to production:
```bash
cd packages/db
npx prisma migrate deploy
```

## Webhook Configuration

### Persona KYC Webhook
- URL: `https://yourdomain.com/api/kyc/webhook`
- Configure in Persona dashboard
- Set webhook secret in `PERSONA_WEBHOOK_SECRET`

## Security Checklist

- [ ] All secrets stored in environment variables (never committed)
- [ ] JWT_SECRET is strong (32+ random characters)
- [ ] OAUTH_ENC_KEY is strong (16+ random characters)
- [ ] Database connection uses SSL
- [ ] Redis connection uses TLS if available
- [ ] CORS origins restricted to frontend domain
- [ ] Rate limiting configured (MAX_COMPLETIONS_PER_HOUR)
- [ ] Admin endpoints protected by authentication
- [ ] Private keys never exposed (GNOSIS_SAFE_PROPOSER_PK, etc.)

## Monitoring & Observability

### Health Endpoints
- API: `GET /api/health`
- API: `GET /api/ready` (checks DB connection)

### Logs
- Configure structured logging
- Set `LOG_LEVEL=info` in production
- Consider log aggregation (Sentry, Datadog, etc.)

### Metrics to Monitor
- API response times
- Database query performance
- Redis connection health
- Worker job success/failure rates
- Quest completion rates
- Payout processing status

## Scaling Considerations

### API Server
- Horizontal scaling via load balancer
- Connection pooling for database
- Redis for session storage

### Worker
- Can scale horizontally (multiple worker instances)
- Each worker processes jobs from shared Redis queue
- Configure concurrency per worker as needed

### Database
- Consider read replicas for high read load
- Index optimization based on query patterns
- Connection pool sizing

## Post-Deployment Verification

1. **Health Checks**
   ```bash
   curl https://yourdomain.com/api/health
   curl https://yourdomain.com/api/ready
   ```

2. **Test OAuth Flows**
   - Twitter link/unlink
   - Discord link/unlink
   - GitHub link/unlink

3. **Test Quest Completion**
   - Create a test quest via admin
   - Complete quest as test user
   - Verify completion status

4. **Test Withdrawal**
   - Earn rewards via quest completion
   - Request withdrawal
   - Verify payout created in database

5. **Test KYC Flow**
   - Start KYC verification
   - Simulate Persona webhook
   - Verify status update

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` format
- Verify network accessibility
- Check SSL certificate

### Redis Connection Issues
- Check `REDIS_URL` format
- Verify Redis instance is running
- Check firewall rules

### Worker Jobs Not Processing
- Verify Redis connection
- Check worker logs for errors
- Ensure queues are not paused

### OAuth Callback Failures
- Verify redirect URIs match exactly
- Check client ID/secret are correct
- Verify callback URL is accessible

## Backup Strategy

- Database: Daily automated backups
- Environment variables: Secure storage (e.g., 1Password, AWS Secrets Manager)
- Code: Git version control

## Rollback Plan

1. Maintain previous deployment version
2. Database migrations should be reversible
3. Feature flags for gradual rollout
4. Monitor error rates post-deployment
