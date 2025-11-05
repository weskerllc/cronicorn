# Automated Deployment Pipeline with Dokploy Integration

**Date:** 2025-11-05  
**Status:** Accepted

## Context

The project previously had a manual deployment process:
1. Semantic release automatically creates tags when semantic commits are merged to main
2. GitHub Actions builds and pushes Docker images to GHCR when a release is published
3. User manually updates `IMAGE_TAG` environment variable in Dokploy
4. User manually triggers redeployment in Dokploy

This manual process was error-prone and time-consuming. The user requested:
- Staging environment that automatically deploys the latest version
- Production environment with push-button deployment via GitHub
- Minimal maintenance overhead
- Best practice adherence

## Decision

We implemented an automated deployment pipeline with the following components:

### 1. GitHub Actions Workflow (`.github/workflows/deploy.yml`)

**Automatic Staging Deployment:**
- Triggered by `release.published` event
- Automatically deploys `latest` tag to staging via Dokploy webhook
- No manual intervention required

**Manual Production Deployment:**
- Triggered via `workflow_dispatch` (manual GitHub Actions trigger)
- Allows selection of specific version tags (e.g., `v1.6.1`)
- Deploys to production via Dokploy webhook
- Provides version control and rollback capability

### 2. Environment-Specific Docker Compose Files

**`docker-compose.staging.yml`:**
- Uses `IMAGE_TAG=latest` by default
- Auto-updates on every release
- Isolated networking and volumes (`cronicorn-staging-*`)

**`docker-compose.production.yml`:**
- Requires explicit `IMAGE_TAG` (no default)
- Version pinning for stability
- Isolated networking and volumes (`cronicorn-production-*`)
- Hardcoded `NODE_ENV=production`

### 3. Environment Configuration Templates

**`.env.staging.example`:**
- Template for staging environment variables
- Uses test/staging credentials
- Points to staging domains

**`.env.production.example`:**
- Template for production environment variables  
- Uses production credentials
- Points to production domains

### 4. Documentation and Tooling

**`docs/DEPLOYMENT.md`:**
- Comprehensive deployment guide
- Setup instructions for Dokploy
- Troubleshooting section
- Best practices

**`scripts/setup-deployment.sh`:**
- Interactive setup script
- Configures GitHub secrets via CLI
- Validates authentication

## Implementation Details

### Webhook Integration

The workflow uses Dokploy webhooks stored as GitHub secrets:
- `DOKPLOY_STAGING_WEBHOOK_URL` - for staging deployments
- `DOKPLOY_PRODUCTION_WEBHOOK_URL` - for production deployments

The webhook payload includes:
```json
{
  "version": "latest" | "v1.6.1",
  "tag": "v1.6.1",
  "environment": "staging" | "production"
}
```

### Deployment Flow

**Staging (Automatic):**
```
Git Push → Semantic Release → GitHub Release → Build Images →
Push to GHCR → Deploy Workflow → Staging Webhook → Dokploy Redeploy
```

**Production (Manual):**
```
GitHub Actions UI → Select Version → Deploy Workflow →
Production Webhook → Dokploy Redeploy
```

### Security Considerations

1. **Secrets Management:**
   - Webhook URLs stored in GitHub Secrets
   - Environment variables configured in Dokploy
   - No secrets in git repository

2. **Environment Isolation:**
   - Separate databases for staging and production
   - Separate OAuth apps for each environment
   - Separate Stripe accounts (test vs live)

3. **Version Control:**
   - Production uses explicit version tags
   - Staging uses `latest` for continuous testing
   - Easy rollback via version selection

## Consequences

### Positive

1. **Zero-Touch Staging:** Every release automatically deploys to staging for testing
2. **Controlled Production:** Manual trigger with version selection provides safety
3. **Easy Rollback:** Can deploy any previous version with one click
4. **Environment Parity:** Both environments use same docker-compose structure
5. **Audit Trail:** All deployments visible in GitHub Actions history
6. **Low Maintenance:** No custom scripts or complex CI/CD pipeline

### Negative

1. **Dokploy Dependency:** Requires Dokploy webhook support (mitigated by standard webhook API)
2. **GitHub Actions Required:** Deployments tied to GitHub infrastructure (acceptable for project)
3. **Manual Secret Setup:** Initial webhook configuration requires manual setup (one-time cost)

### Trade-offs

1. **Webhook vs Direct Deploy:**
   - Chose webhooks over SSH/kubectl for simplicity
   - Dokploy handles actual deployment orchestration
   - Less flexible but much easier to maintain

2. **Latest vs Versioned Staging:**
   - Staging uses `latest` for rapid testing
   - Could use versioned tags, but automatic updates preferred
   - Manual override still possible by changing env var

3. **Single vs Multi-Stage Production:**
   - Single production environment with version selection
   - Could have staging → pre-prod → production
   - Chose simplicity over complex pipeline

## Migration Path

For existing deployments:

1. Add GitHub secrets for Dokploy webhooks
2. Update Dokploy projects to use new docker-compose files
3. Configure environment variables from templates
4. Test staging deployment with next release
5. Test production deployment with manual trigger
6. Document any project-specific customizations

## Alternative Approaches Considered

1. **GitHub Actions → SSH → Docker Commands:**
   - More control but requires SSH key management
   - More complex error handling
   - Harder to maintain

2. **ArgoCD/Flux GitOps:**
   - More sophisticated but overkill for project size
   - Requires Kubernetes
   - Higher learning curve

3. **Custom Deployment Server:**
   - More flexible but requires maintenance
   - Another service to monitor
   - Not justified for project scale

4. **Cloud Provider Native (AWS/GCP/Azure):**
   - Vendor lock-in
   - Higher cost
   - More complex than needed

## References

- Dokploy Documentation: https://dokploy.com/docs
- GitHub Actions Webhook: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows
- Semantic Release: https://semantic-release.gitbook.io/
- 12 Factor App Methodology: https://12factor.net/

## Related Files

- `.github/workflows/deploy.yml` - Main deployment workflow
- `docker-compose.staging.yml` - Staging environment configuration
- `docker-compose.production.yml` - Production environment configuration
- `.env.staging.example` - Staging environment template
- `.env.production.example` - Production environment template
- `docs/DEPLOYMENT.md` - Deployment documentation
- `scripts/setup-deployment.sh` - Setup automation script
