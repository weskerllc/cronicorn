---
id: self-hosting-backup-restore
title: Backup & Restore
description: Back up and restore your Cronicorn database and configuration
sidebar_position: 5
tags:
  - self-hosting
  - backup
  - restore
  - database
---

# Backup & Restore

Cronicorn stores all state in PostgreSQL. Backups are your responsibility as the operator — Cronicorn does not include built-in backup tooling, just like it doesn't include a built-in reverse proxy.

## What to Back Up

| Item | Location | Why |
|------|----------|-----|
| **Database** | PostgreSQL container | All jobs, endpoints, runs, users, settings |
| **`.env`** | Alongside `docker-compose.yml` | Auth secrets, API keys, configuration |
| **`docker-compose.override.yml`** | Alongside `docker-compose.yml` | Custom ports, resources, volumes |

## Database Backup

Use `pg_dump` to create a compressed database dump:

```bash
docker exec cronicorn-db \
  pg_dump -U user -d db --no-owner --no-acl \
  | gzip > cronicorn-backup-$(date +%Y%m%d).sql.gz
```

Adjust `-U user` and `-d db` if you've customized `POSTGRES_USER` or `POSTGRES_DB`.

### Automating with Cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2am
0 2 * * * docker exec cronicorn-db pg_dump -U user -d db --no-owner --no-acl | gzip > /path/to/backups/cronicorn-$(date +\%Y\%m\%d).sql.gz 2>&1
```

### Retention

Pair with a cleanup rule to avoid filling disk:

```bash
# Delete backups older than 30 days
find /path/to/backups -name "cronicorn-*.sql.gz" -mtime +30 -delete
```

## Restore Procedure

### 1. Stop application services

Stop everything except the database:

```bash
docker compose stop api scheduler ai-planner web docs
```

### 2. Restore the database

```bash
# Drop and recreate the database
docker exec cronicorn-db psql -U user -c "DROP DATABASE IF EXISTS db;"
docker exec cronicorn-db psql -U user -c "CREATE DATABASE db;"

# Restore from backup
gunzip -c /path/to/backups/cronicorn-20250115.sql.gz | \
  docker exec -i cronicorn-db psql -U user -d db
```

### 3. Restart services

```bash
docker compose up -d
```

The migrator will run but should find no pending migrations (since the backup already contains the schema).

### 4. Verify

```bash
# Check health
curl http://localhost:3333/api/health

# Log in and verify jobs, endpoints, and recent runs are present
```

## Backup Verification

Periodically test that your backups are restorable:

```bash
# Start a temporary database
docker run --name pg-test -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=db -d postgres:17

# Restore backup
gunzip -c /path/to/backups/cronicorn-20250115.sql.gz | \
  docker exec -i pg-test psql -U user -d db

# Check tables exist and have data
docker exec pg-test psql -U user -d db -c "\dt"
docker exec pg-test psql -U user -d db -c "SELECT count(*) FROM jobs;"

# Cleanup
docker rm -f pg-test
```

## Managed Alternatives

If you're running PostgreSQL outside of Docker (e.g., AWS RDS, Supabase, Neon), use your provider's built-in backup and point-in-time recovery features instead.

## Retention Suggestions

| Environment | Frequency | Retention |
|-------------|-----------|-----------|
| Development | Manual | As needed |
| Staging | Daily | 7 days |
| Production | Daily | 30 days daily, 12 months weekly |

Store production backups off-site (e.g., S3, GCS, or another host) for disaster recovery.
