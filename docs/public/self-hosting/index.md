---
id: self-hosting-index
title: Overview & Installation
description: System requirements and quick start for self-hosting Cronicorn with Docker Compose
sidebar_position: 1
tags:
  - self-hosting
  - docker
  - installation
---

# Self-Hosting Overview

Run Cronicorn on your own infrastructure using Docker Compose. The provided compose file runs all services on an internal Docker network — you bring your own reverse proxy for public access and HTTPS.

## System Requirements

### Minimum

| Resource | Minimum |
|----------|---------|
| CPU | 2 cores |
| RAM | 4 GB |
| Disk | 20 GB |
| Docker Engine | 24+ |
| Docker Compose | v2+ |

### Recommended (production)

| Resource | Recommended |
|----------|-------------|
| CPU | 4 cores |
| RAM | 8 GB |
| Disk | 50 GB+ (depends on retention) |

:::info Linux/amd64 only
Container images are currently built for `linux/amd64`. ARM64 (Apple Silicon, Graviton) is not yet supported. See [Known Limitations](./known-limitations.md) for details.
:::

## Architecture Overview

Cronicorn runs as 7 containers on a shared Docker bridge network:

| Service | Container | Description |
|---------|-----------|-------------|
| **db** | `cronicorn-db` | PostgreSQL 17 — internal only, no host port exposed |
| **migrator** | `cronicorn-migrator` | Runs database migrations on startup, then exits |
| **api** | `cronicorn-api` | Hono API server (port 3333) |
| **scheduler** | `cronicorn-scheduler` | Job execution worker |
| **ai-planner** | `cronicorn-ai-planner` | AI scheduling analysis worker |
| **web** | `cronicorn-web` | TanStack Start web app (port 5173) |
| **docs** | `cronicorn-docs` | Documentation site (port 80) |

**Startup order:** `db` → `migrator` → `api` / `scheduler` / `ai-planner` → `web` → `docs`

The migrator must complete successfully before the API, scheduler, and AI planner start. The web app depends on the API being available.

## Quick Start

### 1. Download the compose file

```bash
curl -O https://raw.githubusercontent.com/weskerllc/cronicorn/main/docker-compose.yml
```

### 2. Create your environment file

Create a `.env` file in the same directory:

```bash
# Generate a secure auth secret (REQUIRED)
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

For a full list of configuration options, see [Configuration](./configuration.md).

### 3. Start all services

```bash
docker compose up -d
```

### 4. Verify health

```bash
docker compose ps
```

All services should show `healthy` or `running`. The migrator will show `exited (0)` — this is expected.

Check the API health endpoint:

```bash
curl http://localhost:3333/api/health
```

### 5. Access the app

| Service | URL |
|---------|-----|
| API | http://localhost:3333 |
| Web app | Not exposed by default — see [Exposing Services](#exposing-services) |
| Docs | Not exposed by default — see [Exposing Services](#exposing-services) |

### 6. Log in

Default credentials:

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `devpassword` |

:::warning Change default credentials
Override these in `.env` with `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` before exposing to the internet. The API will refuse to start in production (`NODE_ENV=production`) with default auth secrets.
:::

## Exposing Services

By default, only the API (port 3333) is exposed to the host. To expose the web app and docs directly:

**Option A: Use a `docker-compose.override.yml`** (recommended)

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
docker compose up -d
```

The example override exposes the web app on port 5173 and docs on port 3000.

**Option B: Edit `docker-compose.yml` directly**

Uncomment the `ports` sections for the `web` and `docs` services.

For production deployments, use a [reverse proxy](./reverse-proxy.md) instead of exposing ports directly.

## What's Next

- **[Configuration](./configuration.md)** — Environment variables, URL setup, optional features
- **[Reverse Proxy](./reverse-proxy.md)** — Set up Caddy, Nginx, or Traefik for HTTPS
- **[Upgrading](./upgrading.md)** — Safely update to new versions
- **[Backup & Restore](./backup-restore.md)** — Protect your data
- **[Monitoring](./monitoring.md)** — Health checks, logs, and alerting
- **[Troubleshooting](./troubleshooting.md)** — Diagnose common issues
- **[Known Limitations](./known-limitations.md)** — What self-hosting doesn't support (yet)
