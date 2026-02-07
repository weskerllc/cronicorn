---
id: self-hosting-troubleshooting
title: Troubleshooting
description: Diagnose and fix common self-hosting issues by component
sidebar_position: 7
tags:
  - self-hosting
  - troubleshooting
  - debugging
---

# Self-Hosting Troubleshooting

Issues are organized by component. Start with the component showing problems.

## Database

### Database won't start

**Check logs:**
```bash
docker compose logs db
```

**Common causes:**
- **Volume permissions**: The database volume directory must be writable by the container. Check ownership of the volume path.
- **Port conflict**: If you've exposed port 5432, another PostgreSQL instance may be using it.
- **Corrupt data directory**: If the database fails to start after an unclean shutdown, you may need to restore from backup.

### Connection refused

**Symptoms:** API or workers log `ECONNREFUSED` errors.

```bash
# Check if the database is running and healthy
docker compose ps db

# Test connectivity from inside the network
docker exec cronicorn-api wget -qO- http://cronicorn-db:5432 || echo "Expected failure - port is open if you see PostgreSQL response"
```

**Common causes:**
- Database container hasn't finished starting — wait for `healthy` status
- `DATABASE_URL` uses `localhost` instead of `cronicorn-db` — inside Docker, services use container hostnames

### Slow queries

```bash
# Check active connections
docker exec cronicorn-db psql -U user -d db -c "SELECT count(*) FROM pg_stat_activity;"

# Check long-running queries
docker exec cronicorn-db psql -U user -d db -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 5;"
```

If connection count is near `DB_POOL_MAX`, consider increasing the pool size.

## Migrator

### Migrator exits with non-zero code

```bash
docker compose logs migrator
```

**Common causes:**
- **Database not ready**: The migrator depends on `db` being healthy, but race conditions can occur. Restart: `docker compose up -d migrator`
- **Invalid DATABASE_URL**: Verify the connection string matches your database credentials
- **Conflicting schema**: If you manually modified the database, migrations may fail. Restore from backup and let migrations run cleanly.

### Migrator appears stuck

The migrator should complete within seconds. If it hangs:

```bash
# Check what it's doing
docker compose logs -f migrator

# Force restart
docker compose restart migrator
```

## API

### Port already in use

```
Error: listen EADDRINUSE: address already in use :::3333
```

Another process is using port 3333:

```bash
# Find what's using the port
lsof -i :3333

# Or change the API port in .env
PORT=3334
```

### Auth secret too short

```
Error: BETTER_AUTH_SECRET must be at least 32 characters
```

Generate a proper secret:

```bash
openssl rand -base64 32
```

### Production safety exit

If the API refuses to start with a message about dev defaults:

The `validateNotDevDefaultInProduction()` check prevents running with insecure defaults when `NODE_ENV=production`. It validates:
- `BETTER_AUTH_SECRET` — must not be the dev default
- `ADMIN_USER_PASSWORD` — must not be `devpassword` (if admin auth is configured)
- `STRIPE_SECRET_KEY` — must not be the dev dummy key

You should also change default database credentials (`POSTGRES_USER`/`POSTGRES_PASSWORD`) for production, though these are not enforced by the startup check.

### CORS errors

**Symptoms:** Browser console shows `Access-Control-Allow-Origin` errors.

Ensure `WEB_URL` in `.env` exactly matches the URL in your browser's address bar (including protocol and port):

```bash
# If your app is at https://app.yourdomain.com
WEB_URL=https://app.yourdomain.com
```

## Web App

### Blank page

**Check browser console** for JavaScript errors.

**Common causes:**
- **VITE_API_URL is wrong**: The web app needs to reach the API from the browser. Check that `VITE_API_URL` points to your public API URL (through the reverse proxy), not the internal Docker hostname.
- **Missing reverse proxy route**: Ensure `/api/*` routes reach `cronicorn-api:3333`.

:::info VITE_API_URL is baked at build time
`VITE_*` variables are embedded into the JavaScript bundle during the Docker image build. If you need a different `VITE_API_URL`, the simplest workaround is to serve the API and web app from the same domain so that relative URLs work. See [Known Limitations](./known-limitations.md).
:::

### SSR errors

**Symptoms:** Pages load but show server-side rendering errors.

```bash
docker compose logs web
```

**Common causes:**
- **API_URL is wrong**: SSR uses `API_URL` (internal Docker URL). It should be `http://cronicorn-api:3333`.
- **API not running**: The web app depends on the API. Check `docker compose ps api`.

### Auth redirect loop

**Symptoms:** Login redirects back to login page endlessly.

- Check `BETTER_AUTH_URL` matches your public URL
- Check `BASE_URL` matches your public URL
- Verify your reverse proxy forwards cookies (ensure `proxy_set_header` includes `Cookie`)
- Check that HTTPS is being used (secure cookies require HTTPS)

## Scheduler

### Jobs not executing

```bash
docker compose logs scheduler
```

**Check:**
- Scheduler is running: `docker compose ps scheduler`
- Jobs are not paused in the UI
- Endpoints have a valid `nextRunAt` time
- No stuck locks (locks expire based on each endpoint's `maxExecutionTimeMs`, minimum 60 seconds)

### Zombie runs

**Symptoms:** Runs show as "running" indefinitely.

Runs have a `timeoutMs` value. If the scheduler crashes mid-execution, the run may appear stuck. Locks expire based on each endpoint's `maxExecutionTimeMs` (minimum 60 seconds), and the next scheduler cycle will pick up due work after the lock expires.

If runs remain stuck after several minutes:

```bash
# Restart the scheduler
docker compose restart scheduler
```

## AI Planner

### Missing API key (expected behavior)

```
OPENAI_API_KEY not set — AI analysis disabled
```

This is expected if you haven't configured an OpenAI API key. The AI planner starts but skips analysis. Jobs will run on their baseline schedules without adaptive behavior.

### AI analysis not running

**Check:**
- `OPENAI_API_KEY` is set and valid
- AI planner is running: `docker compose ps ai-planner`
- Endpoints have recent runs (AI only analyzes endpoints with activity)

```bash
docker compose logs ai-planner
```

### Cost management

AI analysis uses the OpenAI API, which has per-token costs. To control costs:

```bash
# Use a cheaper model
AI_MODEL=gpt-4o-mini

# Increase the analysis interval (default: 5 minutes)
AI_ANALYSIS_INTERVAL_MS=600000

# Reduce token usage per analysis
AI_MAX_TOKENS=300
```

## General Docker Issues

### Restart loops

```bash
# Check which service is restarting
docker compose ps

# View recent logs for the failing service
docker compose logs --tail=50 <service-name>
```

Common causes: missing environment variables, database not accessible, port conflicts.

### Network issues

Services can't reach each other:

```bash
# Verify the network exists
docker network ls | grep cronicorn

# Verify containers are on the network
docker network inspect cronicorn_cronicorn
```

If the network is missing, recreate it:

```bash
docker compose down
docker compose up -d
```

### Volume permissions

```bash
# Check volume ownership
ls -la ../files/cronicorndatabasevolume

# Fix permissions if needed (the PostgreSQL container runs as uid 999)
sudo chown -R 999:999 ../files/cronicorndatabasevolume
```
