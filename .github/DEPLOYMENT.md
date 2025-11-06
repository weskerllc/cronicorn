# Deployment Guide

## Quick Commands

```bash
# Deploy production
gh workflow run deploy.yml -f environment=production -f version=1.6.1

# Rollback
gh workflow run deploy.yml -f environment=production -f version=1.5.8

# Deploy staging
gh workflow run deploy.yml -f environment=staging -f version=latest

# Local test
cd .github && ./deploy-version.sh 1.6.1
```

---

## One-Time Setup

### 1. Get Dokploy API Token
Dokploy UI → Settings → Profile → API/CLI Section → Generate Token

### 2. Get Compose ID
**From URL:** `.../services/compose/{COMPOSE_ID}`

**Or via API:**
```bash
curl -s -X GET "http://146.190.43.32:3000/api/project.all" \
  -H "x-api-key: YOUR_TOKEN" | jq '.[] | .compose[] | {name, composeId}'
```

### 3. Add GitHub Secrets
GitHub repo → Settings → Secrets and variables → Actions

**Required:**
- `DOKPLOY_URL` = `http://146.190.43.32:3000`
- `DOKPLOY_TOKEN` = (token from step 1)

**Environment-Specific (add as needed):**
- `DOKPLOY_STAGING_COMPOSE_ID` = (ID from step 2 for staging)
- `DOKPLOY_PRODUCTION_COMPOSE_ID` = (ID from step 2 for production)

**Note:** If an environment's compose ID is not set, deployments to that environment will be skipped gracefully.

---

## How It Works

1. GitHub Actions calls Dokploy API
2. Fetches current environment variables
3. Updates `IMAGE_TAG` to specified version
4. Pushes updated config to Dokploy
5. Triggers deployment
6. Dokploy pulls new images from GHCR and deploys

**Note:** Use version without 'v' prefix (e.g., `1.6.1` not `v1.6.1`)

---

## Troubleshooting

### 401 Unauthorized
- Verify `DOKPLOY_TOKEN` in GitHub secrets
- Check token hasn't expired
- **Important:** API uses `x-api-key` header

### 404 Compose Not Found
- Verify `DOKPLOY_COMPOSE_ID` is correct
- Use API call above to find correct ID

### Wrong Version Deployed
1. Check IMAGE_TAG was updated:
   ```bash
   curl -s -H "x-api-key: TOKEN" \
     "http://146.190.43.32:3000/api/compose.one?composeId=ID" | \
     jq -r '.env' | grep IMAGE_TAG
   ```
2. Verify image exists at: https://github.com/weskerllc/cronicorn/pkgs/container/cronicorn
