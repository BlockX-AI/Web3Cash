# Web3Cash Railway Deployment Setup

## Analysis Summary

Web3Cash is a monorepo using pnpm workspaces with the following architecture:

### Services to Deploy
1. **API Server** (`apps/api`) - Hono-based REST API
2. **Worker** (`apps/worker`) - Background job processor (BullMQ)
3. **PostgreSQL** - Database (Prisma ORM)
4. **Redis** - Cache and job queue

### Key Dependencies
- **Package Manager**: pnpm (workspaces)
- **Node Version**: >=20.0.0
- **Database**: PostgreSQL with Prisma
- **Queue**: Redis with BullMQ
- **Blockchain**: Alchemy API for Sybil scoring
- **OAuth**: Twitter, Discord, GitHub integrations

## Railway Configuration Files

### 1. API Service (`railway.json`)
- Uses pnpm for installation and builds
- Builds API, Worker, and generates Prisma client
- Runs database migrations on deploy
- Starts API server on port 3001
- Health check at `/api/health`

### 2. Worker Service (`railway.worker.json`)
- Separate configuration for worker deployment
- Builds worker and generates Prisma client
- Starts worker process for background jobs
- No health check path (worker doesn't expose HTTP)

## Step-by-Step Railway Deployment

### Prerequisites
- Railway account
- GitHub repository with Web3Cash code
- Railway CLI installed (optional but recommended)

### Step 1: Create Railway Project

```bash
# Install Railway CLI
brew install railway  # or npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init
```

Or create via Railway dashboard:
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"

### Step 2: Add PostgreSQL Database

```bash
# Add PostgreSQL service
railway add postgresql
```

Or via dashboard:
1. In your Railway project, click "New Service"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically provide `DATABASE_URL` environment variable

### Step 3: Add Redis

```bash
# Add Redis service
railway add redis
```

Or via dashboard:
1. Click "New Service" → "Database" → "Add Redis"
2. Railway will automatically provide `REDIS_URL` environment variable

### Step 4: Deploy API Service

```bash
# Link your GitHub repo
railway link

# Deploy API service
railway up
```

Or via dashboard:
1. Click "New Service" → "Deploy from GitHub repo"
2. Select your Web3Cash repository
3. Railway will use `railway.json` for configuration

### Step 5: Configure API Environment Variables

Go to your API service → "Variables" tab and add:

#### Required Variables
```bash
NODE_ENV=production
API_PORT=3001
ADMIN_SECRET=<generate with: openssl rand -base64 48>

# Auth
JWT_SECRET=<generate with: openssl rand -base64 48>
SIWE_DOMAIN=<your-railway-domain>.railway.app
SIWE_URI=https://<your-railway-domain>.railway.app
SIWE_STATEMENT=Sign in to Web3Cash. This will not trigger a transaction or cost any gas.

# Blockchain
ALCHEMY_API_KEY=<from https://dashboard.alchemy.com>
ALCHEMY_NETWORK=eth-sepolia
DEFAULT_CHAIN_ID=11155111

# OAuth Encryption
OAUTH_ENC_KEY=<generate with: openssl rand -base64 32>

# Payout Configuration
PAYOUT_PROVIDER=ESCROW_CONTRACT_V2
ESCROW_CONTRACT_ADDRESS=0x6726a4A8B149F59Db599FEBF450F279e82951560
ESCROW_CAMPAIGN_ID=0x6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b
ESCROW_ATTESTOR_PRIVATE_KEY=<your private key>
CORE_WALLET_PRIVATE_KEY=<your private key>
GNOSIS_SAFE_CHAIN_ID=11155111
GNOSIS_SAFE_TX_SERVICE=https://safe-transaction-sepolia.safe.global

# Offer18 (Optional)
OFFER18_TRACKING_DOMAIN=https://compliledger125060.offer18.com
OFFER18_GOAL_SIGNUP=1
OFFER18_GOAL_QUEST_COMPLETE=2
OFFER18_GOAL_KYC_VERIFIED=3
OFFER18_GOAL_DEPOSIT=4

# Virtuals API (Optional)
API_KEY=acp-4b99768bdd2577f5e9bf
```

#### OAuth Variables (Optional)
```bash
TWITTER_CLIENT_ID=<from developer.twitter.com>
TWITTER_CLIENT_SECRET=<from developer.twitter.com>
TWITTER_REDIRECT_URI=https://<your-railway-domain>.railway.app/api/oauth/twitter/callback
TWITTER_BEARER_TOKEN=<optional>

DISCORD_CLIENT_ID=<from discord.com/developers>
DISCORD_CLIENT_SECRET=<from discord.com/developers>
DISCORD_REDIRECT_URI=https://<your-railway-domain>.railway.app/api/oauth/discord/callback

GITHUB_CLIENT_ID=<from github.com/settings/developers>
GITHUB_CLIENT_SECRET=<from github.com/settings/developers>
GITHUB_REDIRECT_URI=https://<your-railway-domain>.railway.app/api/oauth/github/callback
```

#### KYC Variables (Optional)
```bash
PERSONA_API_KEY=<from withpersona.com>
PERSONA_TEMPLATE_ID=<from withpersona.com>
PERSONA_WEBHOOK_SECRET=<from withpersona.com>
```

### Step 6: Deploy Worker Service

```bash
# Add worker service
railway add --repo <your-github-repo>

# Set worker start command
railway variable set RAILWAY_BUILD_COMMAND="pnpm install && pnpm run build -w @web3cash/worker && pnpm run generate -w @web3cash/db"
railway variable set RAILWAY_START_COMMAND="pnpm run start -w @web3cash/worker"
```

Or via dashboard:
1. Click "New Service" → "Deploy from GitHub repo"
2. Select the same Web3Cash repository
3. In service settings, specify `railway.worker.json` as the config file
4. Add the same environment variables as API service (they share Postgres and Redis)

**Important**: Worker must connect to the same PostgreSQL and Redis as API. Railway handles this automatically if services are in the same project.

### Step 7: Verify Deployment

```bash
# Check API health
curl https://<your-railway-domain>.railway.app/api/health

# Check API readiness
curl https://<your-railway-domain>.railway.app/api/ready

# View logs
railway logs
```

### Step 8: Configure Domain (Optional)

```bash
# Generate custom domain
railway domain

# Or add custom domain
railway domain yourdomain.com
```

Update environment variables if using custom domain:
```bash
SIWE_DOMAIN=yourdomain.com
SIWE_URI=https://yourdomain.com
```

## Railway Service Architecture

```
Web3Cash Railway Project
├── PostgreSQL (Database)
│   └── Auto-provides DATABASE_URL
├── Redis (Cache/Queue)
│   └── Auto-provides REDIS_URL
├── API Service (Node.js)
│   ├── Uses railway.json
│   ├── Port: 3001
│   └── Health: /api/health
└── Worker Service (Node.js)
    ├── Uses railway.worker.json
    └── Processes BullMQ jobs
```

## Troubleshooting

### Build Failures
- Ensure Node.js version >=20.0.0
- Check that pnpm is installed
- Verify all dependencies are in package.json

### Database Connection Issues
- Verify DATABASE_URL is set (Railway auto-provides this)
- Check that API and Worker services can access PostgreSQL
- Ensure Prisma migrations ran successfully

### Redis Connection Issues
- Verify REDIS_URL is set (Railway auto-provides this)
- Check that both services can access Redis
- Ensure BullMQ can connect to Redis

### Worker Not Processing Jobs
- Check worker logs: `railway logs -s <worker-service-name>`
- Verify REDIS_URL is set for worker
- Ensure worker is running: `railway status`

### Health Check Failures
- Increase healthcheckTimeout in railway.json
- Check API logs for startup errors
- Verify port 3001 is accessible

## Railway CLI Commands

```bash
# List all services
railway status

# View logs
railway logs

# View logs for specific service
railway logs -s api

# SSH into service
railway ssh

# Connect to database
railway connect

# List variables
railway variable list

# Set variable
railway variable set KEY=value

# Redeploy
railway redeploy

# Open in browser
railway open
```

## Cost Optimization

- Use Railway free tier for development
- Monitor usage in Railway dashboard
- Scale services based on traffic
- Worker can run on smaller instances if job volume is low

## Security Best Practices

1. Never commit secrets to GitHub
2. Use Railway environment variables for all secrets
3. Generate strong secrets for JWT_SECRET and OAUTH_ENC_KEY
4. Enable SSL (Railway does this automatically)
5. Use Railway's built-in VPC for service-to-service communication
6. Regularly rotate secrets

## Next Steps After Deployment

1. Deploy frontend to Vercel (recommended)
2. Configure OAuth callback URLs with actual Railway domain
3. Set up Persona webhook if using KYC
4. Configure monitoring and alerts
5. Set up error tracking (Sentry)
6. Test all quest completion flows
7. Test payout system

## Frontend Deployment (Vercel)

Deploy frontend separately to Vercel:

1. Go to https://vercel.com
2. Import your Web3Cash repository
3. Set root directory to `apps/web`
4. Add environment variables:
   ```bash
   VITE_API_URL=https://<your-railway-domain>.railway.app
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<from cloud.walletconnect.com>
   NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>.vercel.app
   NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
   NEXT_PUBLIC_ALCHEMY_API_KEY=<your-alchemy-key>
   NEXT_PUBLIC_USDC_TOKEN_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS_V2=0x6726a4A8B149F59Db599FEBF450F279e82951560
   ```
5. Deploy

## Monitoring

Railway provides built-in monitoring:
- **Logs**: View logs for each service
- **Metrics**: CPU, memory, and network usage
- **Health Checks**: Automatic based on healthcheckPath
- **Alerts**: Configure alerts for failures

## Scaling

### API Service
- Go to service → "Settings" → "Scaling"
- Adjust min/max instances
- Railway handles horizontal scaling

### Worker Service
- Can scale horizontally (multiple workers)
- Each worker processes from shared Redis queue
- Adjust based on job queue size

### Database
- Railway PostgreSQL scales automatically
- Consider read replicas for high read load
