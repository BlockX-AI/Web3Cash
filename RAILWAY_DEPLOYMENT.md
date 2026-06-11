# Railway Deployment Guide for Web3Cash

## Overview

This guide will help you deploy Web3Cash to Railway with PostgreSQL, Redis, and all required services.

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository with Web3Cash code
3. Railway project created (you have one: https://railway.com/project/330988c3-c836-4bda-b58a-cfc1fcfbebc3)

## Step 1: Connect Repository to Railway

1. Go to your Railway project: https://railway.com/project/330988c3-c836-4bda-b58a-cfc1fcfbebc3
2. Click "New Service" → "Deploy from GitHub repo"
3. Select your Web3Cash repository
4. Select the branch to deploy (usually `main` or `master`)
5. Click "Deploy Now"

## Step 2: Add PostgreSQL Database

1. In your Railway project, click "New Service" → "Database" → "Add PostgreSQL"
2. Railway will automatically provide a `DATABASE_URL` environment variable
3. Note: Railway handles SSL automatically
4. **Important**: The DATABASE_URL is automatically injected by Railway when you link the PostgreSQL service to your API service

## Step 3: Add Redis

1. In your Railway project, click "New Service" → "Database" → "Add Redis"
2. Railway will automatically provide a `REDIS_URL` environment variable

## Step 4: Configure Environment Variables

Go to your API service in Railway → "Variables" tab and add the following:

### Required Variables

```
NODE_ENV=production
API_PORT=3001

# Auth
JWT_SECRET=<generate with: openssl rand -base64 48>
SIWE_DOMAIN=your-railway-app.railway.app
SIWE_URI=https://your-railway-app.railway.app
SIWE_STATEMENT=Sign in to Web3Cash. This will not trigger a transaction or cost any gas.

# Blockchain (for Sybil Scoring)
ALCHEMY_API_KEY=<get from https://dashboard.alchemy.com>
ALCHEMY_NETWORK=eth-mainnet
DEFAULT_CHAIN_ID=1

# OAuth Token Encryption
OAUTH_ENC_KEY=<generate with: openssl rand -base64 32>

# Payout Configuration
PAYOUT_PROVIDER=GNOSIS_SAFE
GNOSIS_SAFE_ADDRESS=<your funded safe address>
GNOSIS_SAFE_CHAIN_ID=1
GNOSIS_SAFE_TX_SERVICE=https://safe-transaction-mainnet.safe.global
GNOSIS_SAFE_PROPOSER=<owner wallet address>
GNOSIS_SAFE_PROPOSER_PK=<private key - WARNING: only for dev, use secret manager in prod>
```

### OAuth Variables (Optional - for quest verifications)

```
TWITTER_CLIENT_ID=<from developer.twitter.com>
TWITTER_CLIENT_SECRET=<from developer.twitter.com>
TWITTER_REDIRECT_URI=https://your-railway-app.railway.app/api/oauth/twitter/callback
TWITTER_BEARER_TOKEN=<optional server-to-server token>

DISCORD_CLIENT_ID=<from discord.com/developers>
DISCORD_CLIENT_SECRET=<from discord.com/developers>
DISCORD_REDIRECT_URI=https://your-railway-app.railway.app/api/oauth/discord/callback

GITHUB_CLIENT_ID=<from github.com/settings/developers>
GITHUB_CLIENT_SECRET=<from github.com/settings/developers>
GITHUB_REDIRECT_URI=https://your-railway-app.railway.app/api/oauth/github/callback
```

### KYC Variables (Optional - for Persona integration)

```
PERSONA_API_KEY=<from withpersona.com>
PERSONA_TEMPLATE_ID=<from withpersona.com>
PERSONA_WEBHOOK_SECRET=<from withpersona.com webhook settings>
```

### Offer18 Variables (Optional - for affiliate tracking)

```
OFFER18_TRACKING_DOMAIN=https://[your-account].offer18.com
OFFER18_GOAL_SIGNUP=1
OFFER18_GOAL_QUEST_COMPLETE=2
OFFER18_GOAL_KYC_VERIFIED=3
OFFER18_GOAL_DEPOSIT=4
```

## Step 5: Deploy Worker Service

The worker runs background jobs (Sybil scoring, quest rechecks, payout confirmations).

1. Click "New Service" → "Deploy from GitHub repo"
2. Select the same Web3Cash repository
3. Use the `railway.worker.json` configuration file (Railway will auto-detect it)
4. Add the same environment variables as the API service (they share the same PostgreSQL and Redis)
5. Deploy

**Important**: The worker needs access to the same PostgreSQL and Redis. You can either:
- Use Railway service-to-service references (recommended)
- Copy the DATABASE_URL and REDIS_URL from the API service

**Note**: The worker is configured in `railway.worker.json` with pnpm build and start commands.

## Step 6: Deploy Frontend (Vercel Recommended)

For the frontend, we recommend using Vercel instead of Railway for better performance:

1. Push your code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. For root directory, select: `apps/web`
5. Add environment variables:
   ```
   VITE_API_URL=https://your-railway-app.railway.app
   VITE_WALLETCONNECT_PROJECT_ID=<from cloud.walletconnect.com>
   NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
   NEXT_PUBLIC_DEFAULT_CHAIN_ID=1
   ```
6. Deploy

## Step 7: Configure Webhooks (If Using KYC)

If you're using Persona KYC:
1. Go to Persona dashboard → Webhooks
2. Add webhook URL: `https://your-railway-app.railway.app/api/kyc/webhook`
3. Set the webhook secret in Railway as `PERSONA_WEBHOOK_SECRET`

## Step 8: Update Railway Domain

1. In Railway, go to your API service → "Settings" → "Networking"
2. You can either:
   - Use the default Railway domain (e.g., `your-app.railway.app`)
   - Add a custom domain
3. Update the `SIWE_DOMAIN` and `SIWE_URI` environment variables if you use a custom domain

## Step 9: Verify Deployment

1. Check API health: `https://your-railway-app.railway.app/api/health`
2. Check API readiness: `https://your-railway-app.railway.app/api/ready`
3. Check frontend loads at your Vercel URL
4. Test wallet connection and sign-in
5. Test a quest completion

## Railway Service Architecture

Your Railway project should have these services:

```
Web3Cash Project
├── PostgreSQL (Database)
├── Redis (Cache/Queue)
├── API (Node.js - @web3cash/api)
└── Worker (Node.js - @web3cash/worker)
```

Frontend is deployed separately on Vercel.

## Troubleshooting

### Railway Configuration Issues

**Problem**: Railway using npm instead of pnpm commands
- **Solution**: Ensure `railway.json` is in the root directory and contains pnpm commands
- **Action**: Delete the Railway service and redeploy from GitHub to pick up the new `railway.json`

**Problem**: DATABASE_URL environment variable empty at startup
- **Solution**: Ensure PostgreSQL service is linked to the API service
- **Action**: In Railway dashboard, go to API service → Settings → Variables → Click "Add Variable" → Select "PostgreSQL" from the dropdown to link the DATABASE_URL

**Problem**: Port configuration error (ERR_SOCKET_BAD_PORT NaN)
- **Solution**: Ensure PORT or API_PORT environment variable is set to a valid number
- **Action**: Add `PORT=3001` or `API_PORT=3001` in Railway environment variables

### Database Connection Issues
- Ensure DATABASE_URL is set correctly
- Railway automatically provides this when you add PostgreSQL
- Check that the API service has access to the PostgreSQL service

### Redis Connection Issues
- Ensure REDIS_URL is set correctly
- Railway automatically provides this when you add Redis
- Check that both API and Worker services have access to Redis

### Worker Not Processing Jobs
- Check worker logs in Railway
- Ensure REDIS_URL is set for the worker service
- Verify the worker is connected to the same Redis as the API

### OAuth Callback Failures
- Ensure redirect URIs match exactly (include https://)
- Check that client IDs and secrets are correct
- Verify the callback URL is accessible from the internet

### Build Failures
- Check the build logs in Railway
- Ensure Node.js version is >= 20.0.0 (set in package.json)
- Verify all dependencies are installable

## Monitoring

Railway provides built-in monitoring:
- **Logs**: View logs for each service
- **Metrics**: CPU, memory, and network usage
- **Health Checks**: Automatic health checks based on your healthcheckPath

## Scaling

### API Service
- Go to service → "Settings" → "Scaling"
- Adjust min/max instances based on traffic
- Railway handles horizontal scaling automatically

### Worker Service
- Can scale horizontally (multiple workers process from shared Redis queue)
- Adjust based on job queue size

### Database
- Railway PostgreSQL scales automatically
- Consider read replicas for high read load (Railway supports this)

## Cost Optimization

- Use Railway's free tier for development
- Monitor usage to optimize costs
- Consider using separate databases for dev/prod
- Worker can run on smaller instances if job volume is low

## Security Best Practices

1. **Never commit secrets** to GitHub
2. Use Railway's environment variables for all secrets
3. For production, use Railway's secret manager or external secret management
4. Enable SSL (Railway does this automatically)
5. Set appropriate CORS origins in API
6. Use Railway's built-in VPC for service-to-service communication
7. Regularly rotate secrets (JWT_SECRET, OAUTH_ENC_KEY, etc.)

## Deployment Workflow

1. Push changes to GitHub
2. Railway automatically detects the push
3. Builds the application
4. Runs database migrations
5. Deploys the new version
6. Zero-downtime deployment (Railway handles this)

## Rollback

If a deployment fails:
1. Go to service → "Deployments"
2. Click on a previous successful deployment
3. Click "Redeploy"

## Next Steps

After successful deployment:
1. Set up monitoring alerts
2. Configure error tracking (Sentry)
3. Set up automated backups
4. Configure CDN for frontend
5. Set up analytics (if needed)
6. Configure rate limiting in production
