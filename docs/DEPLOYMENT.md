# Deployment Guide

This guide covers automated deployment of Cronicorn using GitHub Actions and Dokploy.

## Overview

The deployment system provides:
- **Automatic staging deployments** on every release (using `latest` tag)
- **Manual production deployments** with version selection via GitHub Actions
- **Webhook integration** with Dokploy for automated deployments

## How It Works

**Staging (Automatic):**
```
Release Published → Workflow Triggers → Calls Dokploy Webhook → Redeploys with latest tag
```

**Production (Manual):**
```
GitHub Actions UI → Select Version → Calls Dokploy Webhook → Redeploys with selected version
```

## Setup

### 1. GitHub Secrets

The following secrets are already configured in your repository:
- `DOKPLOY_STAGING_WEBHOOK_URL` - Webhook URL from your Dokploy staging project
- `DOKPLOY_PRODUCTION_WEBHOOK_URL` - Webhook URL from your Dokploy production project

### 2. Dokploy Configuration

In your Dokploy project:

1. Use your existing `docker-compose.yml` file
2. Set environment variables for your environment (staging or production)
3. Configure the `IMAGE_TAG` environment variable:
   - **Staging**: Set `IMAGE_TAG=latest`
   - **Production**: Set `IMAGE_TAG=v1.6.1` (or your desired version)

## Environment Variables

Your existing `.env.example` file has all the necessary variables. Key deployment-related variables:

```bash
# Image Configuration
IMAGE_REGISTRY=ghcr.io/weskerllc/cronicorn
IMAGE_TAG=latest  # Use 'latest' for staging, specific version for production
```

For production, use explicit version tags (e.g., `v1.6.1`) instead of `latest` for better version control.

## Usage

### Automatic Staging Deployment

Staging deploys automatically when a new release is published:

1. Merge PR to `main` with semantic commit message (e.g., `feat: new feature`)
2. Semantic Release creates a new tag and GitHub release
3. Docker images are built and pushed to ghcr.io with version tag AND `latest` tag
4. Deploy workflow automatically triggers and calls Dokploy staging webhook
5. Dokploy pulls `latest` images and redeploys

**No manual steps required!**

### Manual Production Deployment

1. Go to GitHub Actions → "Deploy to Dokploy" workflow
2. Click "Run workflow"
3. Select:
   - **Environment**: `production`
   - **Version**: Specific version tag (e.g., `v1.6.1`) or `latest`
4. Click "Run workflow"
5. Workflow calls Dokploy production webhook
6. Dokploy redeploys with selected version

## Rollback

To roll back production to a previous version:

1. Go to GitHub Actions → "Deploy to Dokploy"
2. Run workflow with:
   - Environment: `production`
   - Version: Previous version tag (e.g., `v1.5.0`)
3. Production redeploys with the older version

## Troubleshooting

### Webhook Not Triggering

- Verify webhook URL is correct in GitHub secrets
- Check webhook permissions in Dokploy
- Review GitHub Actions logs for error messages

### Images Not Pulling

- Verify images exist at ghcr.io/weskerllc/cronicorn
- Check `IMAGE_TAG` matches an existing tag
- Ensure Dokploy can access ghcr.io (public registry)

### Service Not Starting

- Check container logs in Dokploy
- Verify all required environment variables are set
- Ensure dependencies (db, migrator) are healthy

## Workflow Details

The `.github/workflows/deploy.yml` workflow handles deployments:

- **Triggered by**: 
  - `release.published` event (auto-deploy to staging)
  - Manual workflow dispatch (deploy to staging or production)
  
- **Actions**:
  1. Determines deployment version and environment
  2. Calls Dokploy webhook with deployment information
  3. Creates deployment summary

## Monitoring

### GitHub Actions
- View deployment status in the Actions tab
- Check deployment summaries for image versions and timestamps

### Dokploy
- View deployment logs in Dokploy UI
- Monitor container health and status
- Check application logs

## Best Practices

1. **Testing**: Always test changes in staging before deploying to production
2. **Version Pinning**: Use explicit version tags in production (e.g., `v1.6.1` not `latest`)
3. **Environment Separation**: Keep staging and production separate (different databases, API keys, etc.)
4. **Monitoring**: Set up alerts for failed deployments and service health

## Security

1. **Secrets**: Never commit secrets to git; use GitHub Secrets and Dokploy environment variables
2. **Webhooks**: Keep webhook URLs private
3. **Database**: Use strong passwords and restrict network access
4. **Registry**: Images in ghcr.io are public; don't include secrets in images
