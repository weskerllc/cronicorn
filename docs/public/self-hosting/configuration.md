---
id: self-hosting-configuration
title: Configuration
description: Environment variables and configuration options for self-hosted Cronicorn
sidebar_position: 2
tags:
  - self-hosting
  - configuration
  - environment-variables
---

# Configuration

Cronicorn uses two configuration layers:

1. **`.env`** — Environment variables (primary configuration)
2. **`docker-compose.override.yml`** — Docker Compose overrides (ports, resources, volumes)

## Required Variables

### Auth Secret

The only variable you **must** set for local use:

```bash
# Generate a cryptographically secure secret (min 32 characters)
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

:::danger Production safety
If `NODE_ENV=production` and `BETTER_AUTH_SECRET` is the dev default, the API will **refuse to start**. This is enforced by `validateNotDevDefaultInProduction()` in the config layer.
:::

## URL Configuration

URLs control how services find each other and how browsers reach the API. Getting these right is the most common source of deployment issues.

### Local Development (defaults)

No URL configuration needed — all defaults work for `http://localhost`.

### Production with Reverse Proxy

```bash
# Where the web UI is publicly accessible
WEB_URL=https://app.yourdomain.com

# Internal Docker network URL for SSR (server-side rendering)
API_URL=http://cronicorn-api:3333

# Public URL for auth callbacks
BETTER_AUTH_URL=https://app.yourdomain.com

# Client-side API URL (what the browser hits)
VITE_API_URL=https://app.yourdomain.com

# Base URL for OAuth redirect callbacks
BASE_URL=https://app.yourdomain.com

# Public web URL (used in emails, links)
VITE_SITE_URL=https://app.yourdomain.com
```

### URL Matrix

| Variable | Used by | Points to | Example (production) |
|----------|---------|-----------|---------------------|
| `WEB_URL` | API (CORS) | Public web URL | `https://app.yourdomain.com` |
| `API_URL` | Web (SSR) | Internal API | `http://cronicorn-api:3333` |
| `BETTER_AUTH_URL` | API (auth) | Public base URL | `https://app.yourdomain.com` |
| `VITE_API_URL` | Web (browser) | Public API URL | `https://app.yourdomain.com` |
| `BASE_URL` | API (OAuth) | Public base URL | `https://app.yourdomain.com` |
| `VITE_SITE_URL` | Web (links) | Public web URL | `https://app.yourdomain.com` |

:::tip API_URL is internal
`API_URL` should point to `http://cronicorn-api:3333` (the Docker internal hostname). This is used by the web app's server-side rendering and never leaves the Docker network. All other URLs should be the public-facing URL through your reverse proxy.
:::

## Optional Features

### GitHub OAuth

```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

Create an OAuth app at [github.com/settings/developers](https://github.com/settings/developers) with callback URL: `https://yourdomain.com/api/auth/callback/github`

### AI Scheduling

```bash
OPENAI_API_KEY=sk-your-key-here
AI_MODEL=gpt-4o-mini
```

Without an API key, the AI planner will start but skip analysis. This is expected behavior.

Additional AI tuning variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_ANALYSIS_INTERVAL_MS` | `300000` | Milliseconds between analysis cycles |
| `AI_LOOKBACK_MINUTES` | `5` | Minutes of run history to analyze |
| `AI_MAX_TOKENS` | `500` | Max tokens per AI response |
| `AI_TEMPERATURE` | `0.7` | AI response randomness (0–1) |

### Stripe Payments

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

See [`.env.example`](https://github.com/weskerllc/cronicorn/blob/main/.env.example) for the full Stripe setup guide.

### Admin Credentials

```bash
ADMIN_USER_EMAIL=admin@example.com    # Default
ADMIN_USER_PASSWORD=devpassword       # Default
ADMIN_USER_NAME=Admin User            # Default
```

Override these for production deployments.

## Database Configuration

### Connection

The compose file constructs the connection string from individual variables:

```bash
POSTGRES_USER=user          # Default
POSTGRES_PASSWORD=password  # Default
POSTGRES_DB=db              # Default
```

:::warning Change database credentials for production
The defaults are suitable for local development only.
:::

### Connection Pool

| Variable | Default (API) | Default (Workers) | Description |
|----------|--------------|-------------------|-------------|
| `DB_POOL_MAX` | `30` | `5` | Maximum connections in pool |
| `DB_POOL_IDLE_TIMEOUT_MS` | `20000` | — | Idle connection timeout |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | `10000` | — | Connection acquisition timeout |

### Volume Location

The database volume is mounted at `../files/cronicorndatabasevolume` relative to the compose file. This path is **outside** the project directory.

To customize the volume path, use a `docker-compose.override.yml`:

```yaml
services:
  db:
    volumes:
      - /data/cronicorn/postgres:/var/lib/postgresql/data
```

## Docker Configuration

### Image Registry

```bash
IMAGE_REGISTRY=ghcr.io/weskerllc/cronicorn  # Default
IMAGE_TAG=latest                              # Default — pin for production
```

See [Upgrading](./upgrading.md) for guidance on version pinning.

### Container Names

```bash
COMPOSE_PROJECT_NAME=cronicorn  # Default prefix for container names
```

## Complete Variable Reference

See [`.env.example`](https://github.com/weskerllc/cronicorn/blob/main/.env.example) for the full list with inline documentation.
