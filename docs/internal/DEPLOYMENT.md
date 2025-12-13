# Deployment Guide

This guide covers automated deployment of Cronicorn using GitHub Actions and Dokploy.

## Overview

The deployment system provides:
- **Automatic staging deployments** on every release (using `latest` tag)
- **Manual production deployments** with version selection via GitHub Actions
- **Automatic IMAGE_TAG updates** via Dokploy API (optional but recommended)
- **Webhook integration** with Dokploy for automated deployments

## How It Works

**Staging (Automatic):**
```
Release Published → Workflow Updates IMAGE_TAG → Calls Dokploy Webhook → Redeploys with new version
```

**Production (Manual via GitHub UI):**
```
GitHub Actions → Select Version → Workflow Updates IMAGE_TAG → Calls Dokploy Webhook → Redeploys
```

## Setup

### 1. GitHub Secrets (Required)

**Webhook URLs (already configured):**
- `DOKPLOY_STAGING_WEBHOOK_URL` - Webhook URL from your Dokploy staging project
- `DOKPLOY_PRODUCTION_WEBHOOK_URL` - Webhook URL from your Dokploy production project

**API Credentials (optional, for automatic IMAGE_TAG updates):**

For staging:
- `DOKPLOY_STAGING_API_URL` - Your Dokploy instance URL (e.g., `https://dokploy.yourdomain.com`)
- `DOKPLOY_STAGING_API_TOKEN` - API token from Dokploy settings
- `DOKPLOY_STAGING_PROJECT_ID` - Your staging project ID from Dokploy

For production:
- `DOKPLOY_PRODUCTION_API_URL` - Your Dokploy instance URL
- `DOKPLOY_PRODUCTION_API_TOKEN` - API token from Dokploy settings
- `DOKPLOY_PRODUCTION_PROJECT_ID` - Your production project ID from Dokploy

**How to get API credentials:**
1. In Dokploy, go to Settings → API Tokens
2. Generate a new API token
3. Copy your project ID from the project URL or settings
4. Add these as GitHub secrets

### 2. Dokploy Configuration

In your Dokploy project:

1. Use your existing `docker-compose.yml` file
2. Set the initial `IMAGE_TAG` environment variable:
   - **Staging**: Set `IMAGE_TAG=latest`
   - **Production**: Set `IMAGE_TAG=v1.6.1` (or your current version)

**Note:** If you configure the API credentials (recommended), the workflow will automatically update `IMAGE_TAG` before each deployment. If not configured, the workflow will still work but you'll need to manually update `IMAGE_TAG` in Dokploy before deploying.

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
4. Deploy workflow automatically:
   - Updates `IMAGE_TAG=latest` in Dokploy (if API configured)
   - Calls Dokploy webhook to trigger redeploy
5. Dokploy pulls `latest` images and redeploys

**No manual steps required!**

### Manual Production Deployment

**Option A: With API configured (fully automated):**
1. Go to GitHub Actions → "Deploy to Dokploy" workflow
2. Click "Run workflow"
3. Select:
   - **Environment**: `production`
   - **Version**: Desired version (e.g., `v1.6.1`)
4. Click "Run workflow"
5. Workflow automatically:
   - Updates `IMAGE_TAG` in Dokploy to selected version
   - Triggers redeploy via webhook
6. Done! Production is updated.

**Option B: Without API configured:**
1. In Dokploy UI: Update `IMAGE_TAG` to desired version (e.g., `v1.6.1`)
2. Go to GitHub Actions → "Deploy to Dokploy" workflow
3. Click "Run workflow" and select production
4. Workflow triggers redeploy

## Rollback

To roll back production to a previous version:

**With API configured:**
1. Go to GitHub Actions → "Deploy to Dokploy"
2. Run workflow with:
   - Environment: `production`
   - Version: Previous version (e.g., `v1.5.0`)
3. Workflow automatically updates IMAGE_TAG and redeploys

**Without API:**
1. In Dokploy UI: Update `IMAGE_TAG` to previous version (e.g., `v1.5.0`)
2. Run the deploy workflow

## Troubleshooting

### API Update Not Working

If the workflow shows "Dokploy API not configured" message:
- Verify all three secrets are set for your environment:
  - `DOKPLOY_[STAGING/PRODUCTION]_API_URL`
  - `DOKPLOY_[STAGING/PRODUCTION]_API_TOKEN`
  - `DOKPLOY_[STAGING/PRODUCTION]_PROJECT_ID`
- Check API token has correct permissions in Dokploy
- Verify project ID is correct

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

## Getting Dokploy API Credentials

To enable fully automated deployments (recommended):

1. **Get API Token:**
   - Log into your Dokploy instance
   - Go to Settings → API Tokens
   - Click "Generate Token"
   - Copy the token and save it securely
   - Add to GitHub secrets as `DOKPLOY_STAGING_API_TOKEN` and `DOKPLOY_PRODUCTION_API_TOKEN`

2. **Get API URL:**
   - This is your Dokploy instance URL (e.g., `https://dokploy.yourdomain.com`)
   - Add to GitHub secrets as `DOKPLOY_STAGING_API_URL` and `DOKPLOY_PRODUCTION_API_URL`

3. **Get Project ID:**
   - In Dokploy, open your project
   - Check the URL: `https://dokploy.yourdomain.com/dashboard/project/[PROJECT_ID]`
   - Or find it in project settings
   - Add to GitHub secrets as `DOKPLOY_STAGING_PROJECT_ID` and `DOKPLOY_PRODUCTION_PROJECT_ID`

Once configured, you can deploy production versions directly from GitHub without touching Dokploy!

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
