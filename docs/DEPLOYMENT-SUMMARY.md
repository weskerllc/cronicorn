# Deployment System Overview

## What Was Implemented

This PR adds a complete automated deployment pipeline for Cronicorn with separate staging and production environments.

## The Problem

Previously, deployments required manual steps:
1. Wait for semantic release to create a tag
2. Wait for Docker images to build
3. Manually update `IMAGE_TAG` in Dokploy
4. Manually trigger redeploy

This was time-consuming and error-prone, especially when trying to maintain both a staging and production environment.

## The Solution

A two-tier automated deployment system:

### Staging Environment (Auto-Deploy)
- **Trigger:** Automatic on every GitHub release
- **Image Tag:** `latest` (always uses newest version)
- **Purpose:** Continuous testing and validation
- **Risk:** Low (isolated from production)

### Production Environment (Manual Deploy)
- **Trigger:** Manual via GitHub Actions UI
- **Image Tag:** Specific version (e.g., `v1.6.1`)
- **Purpose:** Controlled production releases
- **Risk:** Managed through version selection

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
└─────────────────────────────────────────────────────────────┘
                              │
                    Git Push to main
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Semantic Release                          │
│  • Analyzes commits                                          │
│  • Creates version tag (e.g., v1.6.1)                       │
│  • Publishes GitHub Release                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Build & Push Docker Images                      │
│  • Builds all service images                                 │
│  • Tags with version (v1.6.1) AND latest                    │
│  • Pushes to ghcr.io/weskerllc/cronicorn                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          Deploy to Dokploy (Automatic Staging)               │
│  • Triggered by release.published event                      │
│  • Calls Dokploy staging webhook                            │
│  • Staging pulls 'latest' images                            │
│  • Services redeploy automatically                           │
└─────────────────────────────────────────────────────────────┘

                    Manual Production Deploy
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│       GitHub Actions UI (Manual Trigger)                     │
│  • Developer selects version (e.g., v1.6.1)                 │
│  • Workflow calls Dokploy production webhook                │
│  • Production pulls version-specific images                 │
│  • Services redeploy with selected version                  │
└─────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### Workflow Files
- `.github/workflows/deploy.yml` - New deployment workflow
  - Automatic staging deployment on releases
  - Manual production deployment with version selection

### Docker Compose Configurations
- `docker-compose.staging.yml` - Staging environment
  - Uses `IMAGE_TAG=latest` by default
  - Isolated networking and volumes
- `docker-compose.production.yml` - Production environment
  - Requires explicit `IMAGE_TAG`
  - Hardcoded production settings

### Environment Templates
- `.env.staging.example` - Staging configuration template
  - Test credentials
  - Staging domains
  - Development settings
- `.env.production.example` - Production configuration template
  - Production credentials
  - Production domains
  - Live service keys

### Documentation
- `docs/DEPLOYMENT.md` - Comprehensive deployment guide
  - Complete setup instructions
  - Troubleshooting guide
  - Best practices
- `docs/DEPLOYMENT-QUICKSTART.md` - 5-minute setup guide
  - Step-by-step quick start
  - Checklists
  - Common commands
- `docs/DEPLOYMENT-DIAGRAMS.md` - Visual architecture diagrams
  - Sequence diagrams
  - Architecture diagrams
  - Flow charts

### Scripts
- `scripts/setup-deployment.sh` - Automated setup script
  - Interactive GitHub secret configuration
  - Validation and error handling

### Other
- `.adr/0047-automated-deployment-pipeline.md` - Architecture decision record
- `README.md` - Updated with deployment guide links
- `.env.example` - Added docker deployment variables
- `.gitignore` - Updated to track example files

## How It Works

### Staging Deployment (Automatic)

1. **Developer merges code** with semantic commit (e.g., `feat: add feature`)
2. **Semantic release** creates new version tag and GitHub release
3. **GitHub Actions** builds Docker images and tags them:
   - `ghcr.io/weskerllc/cronicorn/api:v1.6.1`
   - `ghcr.io/weskerllc/cronicorn/api:latest`
4. **Deploy workflow** automatically triggers on release
5. **Webhook** calls Dokploy staging environment
6. **Dokploy** pulls `latest` images and redeploys all services

**Zero manual steps required!**

### Production Deployment (Manual)

1. **Developer** goes to GitHub Actions → "Deploy to Dokploy"
2. **Clicks "Run workflow"** and selects:
   - Environment: `production`
   - Version: `v1.6.1` (or desired version)
3. **Deploy workflow** triggers with selected parameters
4. **Webhook** calls Dokploy production environment with version
5. **Dokploy** pulls version-specific images and redeploys

**Controlled, version-specific deployment**

## Setup Requirements

For users to enable this system, they need to:

1. **Create Dokploy Projects:**
   - One for staging
   - One for production

2. **Configure Docker Compose:**
   - Staging: Use `docker-compose.staging.yml`
   - Production: Use `docker-compose.production.yml`

3. **Set Environment Variables:**
   - Copy templates (`.env.staging.example`, `.env.production.example`)
   - Update with real credentials and domains
   - Configure in Dokploy

4. **Generate Webhooks:**
   - Create webhook in each Dokploy project
   - Copy webhook URLs

5. **Add GitHub Secrets:**
   - `DOKPLOY_STAGING_WEBHOOK_URL`
   - `DOKPLOY_PRODUCTION_WEBHOOK_URL`

6. **Test:**
   - Create a release to test staging auto-deploy
   - Manually trigger production deploy to test

## Benefits

### For Development
- ✅ Automatic staging deployments for every release
- ✅ Always have latest code running in staging
- ✅ No manual deployment steps needed

### For Production
- ✅ Controlled, version-specific deployments
- ✅ Easy rollback (just deploy previous version)
- ✅ Clear audit trail of what was deployed when
- ✅ No accidental deployments

### For Operations
- ✅ Environment isolation (staging can't affect production)
- ✅ Consistent deployment process
- ✅ Simple to understand and maintain
- ✅ Well documented

## Security Considerations

1. **Secrets Management:**
   - Webhook URLs in GitHub Secrets (never in code)
   - Environment variables in Dokploy (never in code)
   - Separate credentials for staging and production

2. **Environment Isolation:**
   - Separate databases
   - Separate OAuth apps
   - Separate Stripe accounts (test vs live)
   - Separate networks and volumes

3. **Access Control:**
   - GitHub Actions requires repository permissions
   - Dokploy webhooks are project-specific
   - Production deployments require manual approval

## What Happens Next

After this PR is merged:

1. **Immediate:** Staging will auto-deploy on next release
2. **On-Demand:** Production can be deployed via GitHub Actions
3. **Ongoing:** Developers have push-button deployments

## Rollback Procedure

If something goes wrong in production:

1. Go to GitHub Actions → "Deploy to Dokploy"
2. Run workflow with previous stable version
3. Production automatically rolls back
4. Fix the issue in code
5. Create new release
6. Test in staging (auto-deploys)
7. Deploy to production when ready

## Future Enhancements (Optional)

These are NOT part of this PR but could be added later:

- Pre-production environment between staging and production
- Automated smoke tests after deployment
- Slack/Discord notifications for deployments
- Deployment metrics and monitoring
- Blue-green or canary deployments

## Testing

This PR cannot be fully tested without:
- Dokploy account and projects
- Configured webhooks
- Environment variables set

However, the workflow syntax has been validated and follows GitHub Actions best practices.

**Recommended testing after merge:**
1. Set up staging environment in Dokploy
2. Configure webhook and GitHub secret
3. Create a test release
4. Verify automatic staging deployment
5. Set up production environment
6. Test manual production deployment
7. Test rollback procedure

## Documentation

All documentation is included and ready:
- Complete setup guide
- Quick start guide (5 minutes)
- Visual diagrams
- Troubleshooting tips
- Best practices
- ADR explaining decisions

Users can get started immediately after setting up their Dokploy environments.
