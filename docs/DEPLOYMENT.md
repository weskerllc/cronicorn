# Deployment Guide

This guide covers automated deployment of Cronicorn to staging and production environments using GitHub Actions and Dokploy.

## Overview

The deployment system provides:
- **Automatic staging deployments** on every release (using `latest` tag)
- **Manual production deployments** with version selection via GitHub Actions
- **Docker Compose configurations** for both environments
- **Webhook integration** with Dokploy for automated deployments

## Architecture

```
┌─────────────────┐
│  GitHub Actions │
│   (on release)  │
└────────┬────────┘
         │
         ├─────► Build & Push Docker Images (ghcr.io)
         │
         └─────► Trigger Staging Deployment (webhook)
                 
┌─────────────────┐
│  GitHub Actions │
│ (manual trigger)│
└────────┬────────┘
         │
         └─────► Trigger Production Deployment (webhook)
```

## Prerequisites

### 1. Docker Images
Docker images are automatically built and pushed to GitHub Container Registry (ghcr.io) when a release is published.

### 2. GitHub Secrets
Configure the following secrets in your GitHub repository settings:

#### Required for Staging
- `DOKPLOY_STAGING_WEBHOOK_URL` - Webhook URL from your Dokploy staging project

#### Required for Production
- `DOKPLOY_PRODUCTION_WEBHOOK_URL` - Webhook URL from your Dokploy production project

### 3. Dokploy Setup

For each environment (staging and production):

1. Create a new Dokploy project
2. Set up docker-compose configuration:
   - For **staging**: Use `docker-compose.staging.yml`
   - For **production**: Use `docker-compose.production.yml`
3. Configure environment variables (see Environment Variables section below)
4. Generate a webhook URL for the project
5. Add the webhook URL to GitHub secrets

## Environment Variables

### Staging Environment Variables

Create these in your Dokploy staging project:

```bash
# Image Configuration
IMAGE_REGISTRY=ghcr.io/weskerllc/cronicorn
IMAGE_TAG=latest  # Always use latest for staging

# Database
POSTGRES_USER=your_secure_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=cronicorn

# Authentication
BETTER_AUTH_SECRET=your_secure_secret_min32chars
BETTER_AUTH_URL=https://staging-api.yourdomain.com
WEB_URL=https://staging.yourdomain.com
API_URL=https://staging-api.yourdomain.com
BASE_URL=https://staging.yourdomain.com

# GitHub OAuth
GITHUB_CLIENT_ID=your_staging_github_client_id
GITHUB_CLIENT_SECRET=your_staging_github_client_secret

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_test_...
STRIPE_PRICE_ENTERPRISE=price_test_...

# OpenAI (optional)
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
```

### Production Environment Variables

Create these in your Dokploy production project:

```bash
# Image Configuration
IMAGE_REGISTRY=ghcr.io/weskerllc/cronicorn
IMAGE_TAG=v1.6.1  # Explicit version tag (updated via deployment)

# Database
POSTGRES_USER=your_production_user
POSTGRES_PASSWORD=your_production_password
POSTGRES_DB=cronicorn

# Authentication
BETTER_AUTH_SECRET=your_production_secret_min32chars
BETTER_AUTH_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
BASE_URL=https://yourdomain.com

# GitHub OAuth
GITHUB_CLIENT_ID=your_production_github_client_id
GITHUB_CLIENT_SECRET=your_production_github_client_secret

# Stripe (use live keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# OpenAI
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
```

## Deployment Workflows

### Automatic Staging Deployment

Staging deploys automatically when a new release is published:

1. Developer merges PR to `main` with semantic commit message
2. Semantic Release creates a new tag and GitHub release
3. Docker images are built and pushed to ghcr.io with the version tag AND `latest` tag
4. GitHub Actions automatically triggers staging deployment via webhook
5. Dokploy pulls `latest` images and redeploys

**No manual intervention required!**

### Manual Production Deployment

Production deployments are manual and version-specific:

1. Go to GitHub Actions → "Deploy to Dokploy" workflow
2. Click "Run workflow"
3. Select:
   - **Environment**: `production`
   - **Version**: Specific version tag (e.g., `v1.6.1`) or `latest`
4. Click "Run workflow"
5. GitHub Actions triggers Dokploy webhook
6. Dokploy updates `IMAGE_TAG` and redeploys

**Important**: For production, always specify an explicit version tag (e.g., `v1.6.1`) rather than `latest` for better control and rollback capability.

## Workflow Files

### `.github/workflows/deploy.yml`

This workflow handles deployments:

- **Triggered by**: 
  - `release.published` event (auto-deploy to staging)
  - Manual workflow dispatch (deploy to staging or production)
  
- **Actions**:
  1. Determines deployment version and environment
  2. Calls Dokploy webhook with deployment information
  3. Creates deployment summary

### `.github/workflows/release.yml`

This workflow builds and publishes Docker images:

- **Triggered by**: 
  - `release.published` event
  - Manual workflow dispatch
  
- **Actions**:
  1. Builds Docker images for all services
  2. Pushes to ghcr.io with version tags
  3. Also tags with `latest` for staging deployments

## Docker Compose Configurations

### `docker-compose.staging.yml`

- Uses `IMAGE_TAG=latest` by default
- Container names prefixed with `cronicorn-staging-`
- Dedicated network: `cronicorn-staging`
- Dedicated volume: `cronicorn-staging-db`

### `docker-compose.production.yml`

- Requires explicit `IMAGE_TAG` (no default)
- Container names prefixed with `cronicorn-production-`
- Dedicated network: `cronicorn-production`
- Dedicated volume: `cronicorn-production-db`
- `NODE_ENV` hardcoded to `production`

## Dokploy Configuration

### For Each Environment:

1. **Create Project**
   - Name: `cronicorn-staging` or `cronicorn-production`

2. **Configure Docker Compose**
   - Upload the appropriate docker-compose file
   - Or paste its contents into Dokploy's UI

3. **Set Environment Variables**
   - Add all required variables (see sections above)
   - For staging: Set `IMAGE_TAG=latest`
   - For production: Set `IMAGE_TAG=v1.6.1` (or your desired version)

4. **Configure Webhook**
   - Generate webhook URL in Dokploy
   - Add to GitHub secrets as `DOKPLOY_STAGING_WEBHOOK_URL` or `DOKPLOY_PRODUCTION_WEBHOOK_URL`

5. **Deploy**
   - Manual first deployment to verify configuration
   - Subsequent deployments will be triggered by GitHub Actions

## Rollback Procedure

### Rolling Back Production

If you need to rollback production to a previous version:

1. Go to GitHub Actions → "Deploy to Dokploy"
2. Run workflow with:
   - Environment: `production`
   - Version: Previous stable version (e.g., `v1.5.0`)
3. Verify deployment

Alternatively, manually update `IMAGE_TAG` in Dokploy and redeploy.

### Rolling Back Staging

Staging always uses `latest`, so to rollback:

1. Identify the last known good version
2. Temporarily switch staging to use that specific version:
   - Update `IMAGE_TAG` in Dokploy staging environment
   - Redeploy
3. Once fixes are merged and released, revert to `IMAGE_TAG=latest`

## Monitoring Deployments

### GitHub Actions

- View deployment status in the Actions tab
- Check deployment summaries for image versions and timestamps

### Dokploy

- View deployment logs in Dokploy UI
- Monitor container health and status
- Check application logs

## Troubleshooting

### Deployment Not Triggering

1. Verify webhook URL is correct in GitHub secrets
2. Check webhook permissions in Dokploy
3. Review GitHub Actions logs for error messages

### Images Not Pulling

1. Verify images exist at ghcr.io/weskerllc/cronicorn
2. Check `IMAGE_TAG` matches an existing tag
3. Ensure Dokploy has permissions to pull from ghcr.io (public registry, no auth needed)

### Database Migration Issues

1. Check migrator container logs
2. Verify `DATABASE_URL` is correct
3. Ensure database is healthy before migrator runs

### Service Not Starting

1. Check container logs in Dokploy
2. Verify all required environment variables are set
3. Ensure dependencies (db, migrator) completed successfully

## Best Practices

1. **Testing**: Always test changes in staging before deploying to production
2. **Version Pinning**: Use explicit version tags in production (e.g., `v1.6.1` not `latest`)
3. **Environment Separation**: Keep staging and production completely separate (different databases, API keys, etc.)
4. **Monitoring**: Set up alerts for failed deployments and service health
5. **Documentation**: Update this guide when making changes to the deployment process

## Security Considerations

1. **Secrets**: Never commit secrets to git; use GitHub Secrets and Dokploy environment variables
2. **Webhooks**: Keep webhook URLs private; they provide deployment access
3. **Database**: Use strong passwords and restrict network access
4. **Registry**: Images in ghcr.io are public; don't include secrets in images
5. **OAuth**: Use separate GitHub OAuth apps for staging and production

## Support

For issues related to:
- **GitHub Actions**: Check workflow logs and repository settings
- **Dokploy**: Consult Dokploy documentation and support
- **Application**: Review container logs and application documentation
