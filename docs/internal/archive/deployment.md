# Production Deployment Guide

## Overview

Your application now uses published Docker images from GitHub Container Registry (GHCR) for production deployments, while still supporting local development builds.

## Deployment Options

### Option 1: Use Latest (Simple but less safe)
```bash
# In your .env.production file:
IMAGE_TAG=latest
```

### Option 2: Use Specific Versions (Recommended for production)
```bash
# In your .env.production file:
IMAGE_TAG=v1.2.3  # Use actual release version
```

## Deployment Commands

### Production Deployment
```bash
# 1. Set up your environment
cp .env.production.example .env.production
# Edit .env.production with your actual values

# 2. Deploy with specific version
IMAGE_TAG=v1.2.3 docker compose --env-file .env.production up -d

# Or deploy with latest
docker compose --env-file .env.production up -d
```

### Development 
```bash
# Start database only for local development
pnpm docker:dev

# Run services locally with pnpm
pnpm dev  # All services in parallel
# or individually:
pnpm dev:api
pnpm dev:web
pnpm dev:scheduler
```

## Image Registry Setup

Your images are published to:
- `ghcr.io/bcanfield/mvpmvp/api:v1.2.3`
- `ghcr.io/bcanfield/mvpmvp/scheduler:v1.2.3`
- `ghcr.io/bcanfield/mvpmvp/ai-planner:v1.2.3`
- `ghcr.io/bcanfield/mvpmvp/migrator:v1.2.3`
- `ghcr.io/bcanfield/mvpmvp/web:v1.2.3`

## Release Process

1. **Conventional Commit** to main branch:
   ```bash
   git commit -m "feat: add new feature"
   git push origin main
   ```

2. **Automatic Release** via GitHub Actions:
   - Semantic-release analyzes commits
   - Creates git tag (e.g., `v1.2.3`)
   - Builds and pushes Docker images
   - Creates GitHub release

3. **Deploy** to production:
   ```bash
   IMAGE_TAG=v1.2.3 docker compose --env-file .env.production up -d
   ```

## Zero-Downtime Updates

For production updates with minimal downtime:

```bash
# Pull new images
docker compose --env-file .env.production pull

# Restart services one by one
docker compose --env-file .env.production --profile prod up -d --no-deps api
docker compose --env-file .env.production --profile prod up -d --no-deps scheduler
docker compose --env-file .env.production --profile prod up -d --no-deps ai-planner
docker compose --env-file .env.production --profile prod up -d --no-deps web
```

## Environment Variables

Key variables for production:

- `IMAGE_REGISTRY`: Container registry (default: `ghcr.io/bcanfield/mvpmvp`)
- `IMAGE_TAG`: Version to deploy (default: `latest`)
- All other variables from `.env.production.example`

## Rollback

To rollback to a previous version:

```bash
IMAGE_TAG=v1.1.0 docker compose --env-file .env.production up -d
```