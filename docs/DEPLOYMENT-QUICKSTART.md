# Quick Start: Automated Deployments

This is a condensed guide to get your automated deployments up and running quickly.

## Prerequisites

- [ ] Dokploy account and access
- [ ] GitHub repository admin access
- [ ] Docker images being built and pushed to ghcr.io (already configured)

## 5-Minute Setup

### Step 1: Set Up Staging Environment in Dokploy

1. **Create a new project** in Dokploy named `cronicorn-staging`

2. **Add Docker Compose configuration:**
   - Copy the contents of `docker-compose.staging.yml`
   - Paste into Dokploy's docker-compose section

3. **Configure environment variables:**
   - Copy `.env.staging.example`
   - Update with your staging credentials and domains
   - Add to Dokploy's environment variables section
   - **Important:** Set `IMAGE_TAG=latest`

4. **Generate webhook URL:**
   - In Dokploy project settings, find the webhook section
   - Copy the webhook URL

5. **Add webhook to GitHub:**
   ```bash
   # Using GitHub CLI
   gh secret set DOKPLOY_STAGING_WEBHOOK_URL
   # Paste the webhook URL when prompted
   ```
   
   Or manually via GitHub UI:
   - Go to repository Settings → Secrets and variables → Actions
   - New repository secret: `DOKPLOY_STAGING_WEBHOOK_URL`
   - Paste the webhook URL

6. **Deploy manually once** to verify configuration works

### Step 2: Set Up Production Environment in Dokploy

1. **Create a new project** in Dokploy named `cronicorn-production`

2. **Add Docker Compose configuration:**
   - Copy the contents of `docker-compose.production.yml`
   - Paste into Dokploy's docker-compose section

3. **Configure environment variables:**
   - Copy `.env.production.example`
   - Update with your production credentials and domains
   - Add to Dokploy's environment variables section
   - **Important:** Set `IMAGE_TAG=v1.6.1` (or your current version)

4. **Generate webhook URL:**
   - In Dokploy project settings, find the webhook section
   - Copy the webhook URL

5. **Add webhook to GitHub:**
   ```bash
   # Using GitHub CLI
   gh secret set DOKPLOY_PRODUCTION_WEBHOOK_URL
   # Paste the webhook URL when prompted
   ```
   
   Or manually via GitHub UI:
   - Go to repository Settings → Secrets and variables → Actions
   - New repository secret: `DOKPLOY_PRODUCTION_WEBHOOK_URL`
   - Paste the webhook URL

6. **Deploy manually once** to verify configuration works

### Step 3: Test Automated Deployments

**Test Staging (Automatic):**
1. Make a commit with a semantic commit message (e.g., `feat: add new feature`)
2. Merge to `main`
3. Semantic release will create a new release
4. Docker images will be built automatically
5. Staging will deploy automatically
6. Verify at your staging URL

**Test Production (Manual):**
1. Go to GitHub Actions → "Deploy to Dokploy" workflow
2. Click "Run workflow"
3. Select:
   - Environment: `production`
   - Version: `v1.6.1` (or your latest version)
4. Click "Run workflow"
5. Wait for deployment to complete
6. Verify at your production URL

## Architecture Overview

```
Commit → Main → Semantic Release → GitHub Release
                      ↓
              Build Docker Images (ghcr.io)
                      ↓
        ┌─────────────┴──────────────┐
        ↓                            ↓
   Auto Deploy                  Manual Deploy
   to Staging                   to Production
   (latest tag)                 (specific version)
```

## Common Commands

```bash
# Setup GitHub secrets interactively
./scripts/setup-deployment.sh

# View current deployment status
gh workflow view "Deploy to Dokploy"

# Manually trigger production deployment
gh workflow run deploy.yml -f environment=production -f version=v1.6.1

# View deployment logs
gh run list --workflow=deploy.yml
```

## Environment Variables Checklist

### Both Environments Need:
- [x] `IMAGE_REGISTRY` - Usually `ghcr.io/weskerllc/cronicorn`
- [x] `IMAGE_TAG` - `latest` for staging, version tag for production
- [x] Database credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`)
- [x] `BETTER_AUTH_SECRET` - Generate with `openssl rand -base64 32`
- [x] URL configuration (`BETTER_AUTH_URL`, `WEB_URL`, `API_URL`, `BASE_URL`)
- [x] `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` - OAuth apps
- [x] Stripe keys (test for staging, live for production)
- [x] `OPENAI_API_KEY` (optional, for AI features)

### Key Differences:
| Variable | Staging | Production |
|----------|---------|------------|
| `IMAGE_TAG` | `latest` | `v1.6.1` (specific version) |
| `GITHUB_CLIENT_*` | Staging OAuth app | Production OAuth app |
| `STRIPE_*` | Test mode keys | Live mode keys |
| Domains | `staging.yourdomain.com` | `yourdomain.com` |

## Troubleshooting

**Deployment not triggering?**
- Verify webhook URL is correct in GitHub secrets
- Check GitHub Actions logs for errors
- Ensure webhook has proper permissions in Dokploy

**Images not pulling?**
- Verify images exist at ghcr.io/weskerllc/cronicorn
- Check IMAGE_TAG matches an existing tag
- Confirm ghcr.io is accessible from Dokploy

**Service not starting?**
- Check container logs in Dokploy
- Verify all required environment variables are set
- Ensure database is healthy

## Next Steps

- [ ] Set up monitoring for your deployments
- [ ] Configure alerts for failed deployments
- [ ] Review and customize environment variables
- [ ] Test rollback procedure
- [ ] Document any project-specific configurations

## Full Documentation

For complete details, see [docs/DEPLOYMENT.md](../DEPLOYMENT.md)
