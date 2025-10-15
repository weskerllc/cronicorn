# Docker Compose Setup

Single `docker-compose.yml` with profile-based service control.

## Quick Start

```bash
# 1. Create your .env file
cp .env.example .env

# 2. Start database
pnpm db

# 3. Run migrations
pnpm db:migrate
```

That's it! The same `.env` file works for both Docker and local development.

## Environment Configuration

**Single `.env` file for everything:**
- Docker Compose reads it automatically (no `--env-file` needed)
- Local dev (`pnpm dev`) reads the same file
- Production uses `.env.production` (gitignored)

**Key environment variables:**
```bash
# Docker Compose
COMPOSE_PROJECT_NAME=cronicorn-dev  # Container name prefix
DB_PORT=6666                         # Exposed port on host
DB_RESTART=unless-stopped            # Container restart policy

# Postgres Container
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=db

# Local App Connection (points to localhost:6666)
DATABASE_URL=postgresql://user:password@localhost:6666/db

# Application (optional)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
AUTH_SECRET=...
OPENAI_API_KEY=...
```

**Note:** The migrator container automatically constructs its own `DATABASE_URL` using the container hostname (`cronicorn-dev-db:5432`) instead of `localhost`.

## Profiles

- **No profile** (default): Database only
- **`dev`**: Database + Migrator
- **`prod`**: Full stack (Database + Migrator + API + Scheduler)

## Development Workflow

### Start Database
```bash
pnpm db
```

### Run Migrations
```bash
pnpm db:migrate
```

### Reset Database
```bash
pnpm db:reset
```

### Stop Services
```bash
pnpm db:down
```

## Production Deployment

### Setup
```bash
# Production uses .env.production (gitignored)
cp .env.example .env.production

# Edit with real secrets
nano .env.production

# Set DATABASE_URL to use container hostname for services
# DATABASE_URL=postgresql://user:password@cronicorn-prod-db:5432/db
```

### Deploy Full Stack
```bash
# Specify production env file explicitly
docker compose --env-file .env.production --profile prod up -d --build
```

### View Logs
```bash
pnpm docker:logs
```

```bash
# Database Management
pnpm db              # Start database
pnpm db:down         # Stop all services
pnpm db:reset        # Reset database (destroy + recreate)
pnpm db:migrate      # Run migrations

# Docker Operations
pnpm docker:dev      # Run full dev stack (with --build)
pnpm docker:prod     # Deploy production (with --build)
pnpm docker:down     # Stop all services
pnpm docker:logs     # Follow logs
```

## Service Details

### Database (`db`)
- **Profile**: Always runs (no profile needed)
- **Port**: `6666` (dev) or `5432` (prod)
- **Volume**: `db_data` (persistent)
- **Healthcheck**: Ensures ready before migrator runs

### Migrator (`migrator`)
- **Profiles**: `dev`, `prod`
- **Restart**: `no` (runs once and exits)
- **Depends on**: `db` (condition: `service_healthy`)
- **Purpose**: Applies database migrations atomically

### API (`api`)
- **Profile**: `prod` only
- **Port**: `3333`
- **Depends on**: `db` + `migrator` (must complete successfully)
- **Restart**: `unless-stopped`

### Scheduler (`scheduler`)
- **Profile**: `prod` only
- **Depends on**: `db` + `migrator` (must complete successfully)
- **Restart**: `unless-stopped`

## Migration Flow

1. **Database starts** → waits for healthcheck
2. **Migrator runs** → applies migrations → exits with code 0/1
3. **If migrator succeeds** → API + Scheduler start
4. **If migrator fails** → API + Scheduler never start (safe fail-fast)

## Local Development (No Docker)

Run services natively with `pnpm dev`:
```bash
# 1. Ensure .env exists
cp .env.example .env

# 2. Start DB via Docker
pnpm db

# 3. Run migrations
pnpm db:migrate

# 4. Run all apps locally (reads same .env file)
pnpm dev
```

The `.env` file works for both Docker services AND local development!

## Troubleshooting

### Services won't start after migration failure
```bash
# Check migrator logs
docker compose logs migrator

# Reset and try again
pnpm db:reset
pnpm db:migrate
```

### Port conflicts
```bash
# Check what's using port 6666
lsof -i :6666

# Or change DB_PORT in .env.docker.dev
```

### Out of disk space
```bash
# Clean up Docker
docker system prune -af --volumes
```
