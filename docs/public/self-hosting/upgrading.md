---
id: self-hosting-upgrading
title: Upgrading
description: Safely upgrade your self-hosted Cronicorn to a new version
sidebar_position: 4
tags:
  - self-hosting
  - upgrading
  - versioning
---

# Upgrading

## Image Tags

Cronicorn publishes container images to GitHub Container Registry (GHCR) with these tag formats:

| Tag Format | Example | Description |
|-----------|---------|-------------|
| `X.Y.Z` | `1.2.3` | Exact version — most stable, never changes |
| `X.Y` | `1.2` | Minor version — receives patch updates |
| `latest` | — | Latest release — changes on every release |

:::warning Pin your image tag
The default `IMAGE_TAG=latest` will pull the newest version on every `docker compose pull`. This can introduce breaking changes unexpectedly. **Always pin to a specific version for production:**

```bash
# In .env
IMAGE_TAG=1.2.3
```
:::

## Checking Available Versions

View available tags on the GitHub Container Registry:

```bash
# List available tags for the API image
docker image ls ghcr.io/weskerllc/cronicorn/api

# Or check GitHub Packages directly at:
# https://github.com/weskerllc/cronicorn/pkgs/container/cronicorn%2Fapi
```

## Standard Upgrade Procedure

### 1. Back up your database

Always back up before upgrading. See [Backup & Restore](./backup-restore.md).

```bash
docker exec cronicorn-db \
  pg_dump -U user -d db --no-owner --no-acl \
  | gzip > cronicorn-backup-$(date +%Y%m%d).sql.gz
```

### 2. Update the image tag

```bash
# In .env, update to the target version:
IMAGE_TAG=1.3.0
```

### 3. Pull new images

```bash
docker compose pull
```

### 4. Restart services

```bash
docker compose up -d
```

The migrator will run automatically and apply any new database migrations.

### 5. Verify health

```bash
# Check all services are healthy
docker compose ps

# Check API health endpoint
curl http://localhost:3333/api/health
```

## How Migrations Work

Database migrations run automatically via the `migrator` service:

1. On `docker compose up`, the migrator starts after the database is healthy
2. It applies any pending migrations (forward-only, sequential)
3. It exits with code 0 on success
4. The API, scheduler, and AI planner wait for the migrator to complete before starting

Migrations are **forward-only** — there are no down migrations. This means you cannot roll back a database schema change by downgrading the image version.

## Rollback Procedure

Because migrations are forward-only, rolling back requires restoring from a backup:

1. Stop all services: `docker compose down`
2. Restore the database from your pre-upgrade backup (see [Backup & Restore](./backup-restore.md))
3. Revert `IMAGE_TAG` in `.env` to the previous version
4. Start services: `docker compose up -d`

:::danger Test upgrades in staging
Always test upgrades in a staging environment first. Once a migration runs, the only way to undo it is a full database restore.
:::

## Monitoring After Upgrade

After upgrading, watch for:

- **Migrator exit code**: Should be 0 (`docker compose ps` shows `Exited (0)`)
- **API health**: `curl http://localhost:3333/api/health` returns 200
- **Service logs**: `docker compose logs --tail=50` — look for errors
- **Scheduled jobs**: Verify jobs continue executing as expected
