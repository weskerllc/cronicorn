# Environment File Consolidation

## Problem
We had multiple env files that were confusing:
- `.env.example` (root) - for local dev
- `.env.docker.dev` - for Docker dev
- `.env.docker.prod.example` - for Docker prod
- `apps/api/.env.example` - outdated API-specific

**Question:** Do we really need different env vars for local dev vs Docker dev?

## Solution
**One `.env` file for everything!**

### Key Insight
The only difference between local and Docker is the database hostname:
- **Local apps**: `DATABASE_URL=postgresql://user:password@localhost:6666/db`
- **Docker containers**: `DATABASE_URL=postgresql://user:password@cronicorn-dev-db:5432/db`

But local apps connect to the **Docker database** via the exposed port `6666`, so they use `localhost:6666`. Only the migrator container needs the internal hostname.

### Implementation

**Single `.env.example`** (committed):
```bash
# Docker Compose
COMPOSE_PROJECT_NAME=cronicorn-dev
DB_PORT=6666
DB_RESTART=unless-stopped

# Postgres Container
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=db

# Local App Connection
DATABASE_URL=postgresql://user:password@localhost:6666/db

# App Config (optional)
GITHUB_CLIENT_ID=...
OPENAI_API_KEY=...
```

**docker-compose.yml override** for migrator:
```yaml
migrator:
  environment:
    # Override DATABASE_URL to use container hostname
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${COMPOSE_PROJECT_NAME}-db:5432/${POSTGRES_DB}
```

**Result:**
- Docker Compose reads `.env` automatically (no `--env-file` flag needed)
- Local dev reads `.env` via dotenv
- Migrator gets correct container hostname via environment override
- Production uses `.env.production` (gitignored)

## Benefits

1. **Less confusion**: One file to manage
2. **DRY**: No duplicate vars between files
3. **Simpler commands**: No `--env-file` flags
4. **Works for both**: Docker AND local dev
5. **Clearer separation**: `.env` = dev, `.env.production` = prod

## Migration Guide

If you had the old setup:

```bash
# 1. Remove old files
rm .env.docker.dev .env.docker.prod.example

# 2. Create .env from new example
cp .env.example .env

# 3. Commands now simpler (no --env-file needed)
pnpm db           # was: docker compose --env-file .env.docker.dev up -d
pnpm db:migrate   # was: docker compose --env-file .env.docker.dev --profile dev up migrator
```

Done! Everything still works the same.

## Files Removed
- `.env.docker.dev` → merged into `.env.example`
- `.env.docker.prod.example` → use `.env.production`

## Files Changed
- `.env.example` - now includes Docker Compose vars
- `docker-compose.yml` - migrator overrides DATABASE_URL
- `package.json` - removed `--env-file` flags
- `.gitignore` - removed `.env.docker.prod`
