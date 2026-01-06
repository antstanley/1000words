# Cloudflare Deployment

Deploy 1000words to Cloudflare Workers with R2 storage and D1 database.

## Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
3. Node.js 20+

## Setup

### 1. Login to Cloudflare

```bash
wrangler login
```

### 2. Create R2 Bucket

```bash
# Create production bucket
wrangler r2 bucket create 1000words-stories

# Create preview bucket (for development)
wrangler r2 bucket create 1000words-stories-preview
```

### 3. Create D1 Database

```bash
# Create the database
wrangler d1 create 1000words

# Note the database_id from the output and update wrangler.toml
```

### 4. Apply Database Schema

```bash
# Apply schema to production
wrangler d1 execute 1000words --file=schema.sql

# Apply schema to local development
wrangler d1 execute 1000words --file=schema.sql --local
```

### 5. Update Configuration

Edit `wrangler.toml`:
- Replace `YOUR_DATABASE_ID` with your D1 database ID
- Update the route pattern with your domain

## Development

```bash
# Start local development server
wrangler dev

# This will:
# - Run Workers locally
# - Create local R2 storage in .wrangler/
# - Create local D1 database in .wrangler/
```

## Deployment

```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

## Environment Variables

Set secrets using Wrangler:

```bash
# OAuth client ID (if using server-side OAuth)
wrangler secret put OAUTH_CLIENT_SECRET
```

## Architecture

- **Workers**: SvelteKit SSR with `@sveltejs/adapter-cloudflare`
- **R2**: Story file storage (markdown/text files)
- **D1**: SQLite database for story metadata

## Monitoring

View logs and metrics in the [Cloudflare Dashboard](https://dash.cloudflare.com/).

```bash
# Tail real-time logs
wrangler tail
```
