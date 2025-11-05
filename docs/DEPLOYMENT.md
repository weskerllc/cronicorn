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
Release Published → Workflow Triggers → Calls Dokploy Webhook → Redeploys (pulls latest images)
```
*Note: IMAGE_TAG must be set to `latest` in Dokploy environment variables (one-time setup)*

**Production (Manual):**
```
1. Update IMAGE_TAG in Dokploy UI to desired version (e.g., v1.6.1)
2. GitHub Actions UI → Run Deploy Workflow → Calls Dokploy Webhook → Redeploys
```
*Note: The workflow triggers the redeploy but does NOT update the IMAGE_TAG variable in Dokploy*

## Setup

### 1. GitHub Secrets

The following secrets are already configured in your repository:
- `DOKPLOY_STAGING_WEBHOOK_URL` - Webhook URL from your Dokploy staging project
- `DOKPLOY_PRODUCTION_WEBHOOK_URL` - Webhook URL from your Dokploy production project

### 2. Dokploy Configuration

In your Dokploy project:

1. Use your existing `docker-compose.yml` file
2. Set the `IMAGE_TAG` environment variable:
   - **Staging**: Set `IMAGE_TAG=latest` (one-time, leave it)
   - **Production**: Set `IMAGE_TAG=v1.6.1` (update manually when you want to deploy a new version)
3. The workflow will trigger redeployment via webhook (but won't change IMAGE_TAG)

**Important:** The workflow does NOT automatically update the `IMAGE_TAG` variable in Dokploy. For production deployments, you'll need to:
1. Update `IMAGE_TAG` in Dokploy UI to your desired version
2. Run the workflow to trigger the actual redeploy

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

1. In Dokploy UI: Update `IMAGE_TAG` environment variable to desired version (e.g., `v1.6.1`)
2. Go to GitHub Actions → "Deploy to Dokploy" workflow
3. Click "Run workflow"
4. Select:
   - **Environment**: `production`
   - **Version**: Same version you set in Dokploy (e.g., `v1.6.1`)
5. Click "Run workflow"
6. Workflow calls Dokploy production webhook
7. Dokploy redeploys with the IMAGE_TAG you set in step 1

**Note:** The "Version" input in the workflow is informational only - it doesn't update Dokploy's IMAGE_TAG variable.

## Rollback

To roll back production to a previous version:

1. In Dokploy UI: Update `IMAGE_TAG` to previous version (e.g., `v1.5.0`)
2. Go to GitHub Actions → "Deploy to Dokploy"
3. Run workflow with:
   - Environment: `production`
   - Version: `v1.5.0` (informational)
4. Dokploy redeploys with the IMAGE_TAG from step 1

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
