# Docker Compose Setup

Single `docker-compose.yml` with profile-based service control.

## Profiles

- **No profile** (default): Database only
- **`dev`**: Database + Migrator
- **`prod`**: Full stack (Database + Migrator + API + Scheduler)

## Development Workflow

### Start Database Only
```bash
pnpm db
# or
docker compose --env-file .env.docker.dev up -d
```

### Run Migrations
```bash
pnpm db:migrate
# or
docker compose --env-file .env.docker.dev --profile dev up migrator
```

### Reset Database
```bash
pnpm db:reset
# Stops DB, removes volume, starts fresh DB
```

### Stop Database
```bash
pnpm db:down
# or
docker compose down
```

## Production Deployment

### Setup
```bash
# Copy example env file
cp .env.docker.prod.example .env.docker.prod

# Edit with real values
nano .env.docker.prod
```

### Deploy Full Stack
```bash
pnpm docker:prod
# or
docker compose --env-file .env.docker.prod --profile prod up -d --build
```

### View Logs
```bash
pnpm docker:logs
# or
docker compose logs -f
```

## Environment Files

- `.env.docker.dev` - Development configuration (committed)
- `.env.docker.prod` - Production secrets (gitignored, copy from .example)

## Available Scripts

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
# Terminal 1: Start DB only
pnpm db

# Terminal 2: Run migrations (optional, or via pnpm migrate)
pnpm db:migrate

# Terminal 3: Run all apps locally
pnpm dev
```

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
