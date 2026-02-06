---
id: self-hosting
title: Self-Hosting Guide
description: Run Cronicorn on your own infrastructure with Docker Compose
tags:
  - self-hosting
  - docker
sidebar_position: 6
mcp:
  uri: file:///docs/self-hosting.md
  mimeType: text/markdown
  priority: 0.80
  lastModified: 2026-02-06T00:00:00Z
---

# Self-Hosting Guide

Run Cronicorn on your own infrastructure using Docker Compose. The provided compose file runs all services on an internal Docker network — you bring your own reverse proxy for public access and HTTPS.

## Quick Start

1. **Download the compose file**

   Get [`docker-compose.yml`](https://github.com/weskerllc/cronicorn/blob/main/docker-compose.yml) from the repo. This file pulls pre-built images from our registry — no building required.

2. **Create environment file**

   Create a `.env` file in the same directory. See [`.env.example`](https://github.com/weskerllc/cronicorn/blob/main/.env.example) for all options.

   **Minimal `.env` for local use:**
   ```bash
   # Generate with: openssl rand -base64 32
   BETTER_AUTH_SECRET=your-random-32-character-secret-here
   ```

   **Production `.env`:**
   ```bash
   # Required
   BETTER_AUTH_SECRET=your-random-32-character-secret-here

   # URLs (replace with your actual domain)
   WEB_URL=https://yourdomain.com
   API_URL=http://cronicorn-api:3333
   BETTER_AUTH_URL=https://yourdomain.com
   BASE_URL=https://yourdomain.com
   VITE_SITE_URL=https://yourdomain.com
   ```

3. **Start services**

   ```bash
   docker compose up -d
   ```

4. **Access the app**

   - **Web app**: http://localhost:5173 (port commented out by default — see [Exposing Services](#exposing-services))
   - **API**: http://localhost:3333
   - **Login**: Default credentials — `admin@example.com` / `devpassword` (override with `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` in `.env`)

## Services

The compose file runs these containers on an internal `cronicorn` bridge network:

| Service | Container | Description |
|---|---|---|
| **db** | `cronicorn-db` | PostgreSQL 17 (internal only, no port exposed to host) |
| **migrator** | `cronicorn-migrator` | Runs database migrations on startup, then exits |
| **api** | `cronicorn-api` | Hono API server (exposed on port 3333) |
| **scheduler** | `cronicorn-scheduler` | Job execution worker |
| **ai-planner** | `cronicorn-ai-planner` | AI scheduling analysis worker |
| **web** | `cronicorn-web` | TanStack Start web app (port 5173, not exposed by default) |
| **docs** | `cronicorn-docs` | Documentation site (port 80, not exposed by default) |

## Exposing Services

By default, only the API (port 3333) is exposed to the host. To expose the web app and docs directly, uncomment the port mappings in `docker-compose.yml`:

```yaml
# In the web service:
ports:
  - "5173:5173"

# In the docs service:
ports:
  - "3000:80"
```

### Reverse Proxy (Production)

For production deployments, you'll want a reverse proxy in front of these services for HTTPS, routing, and security. Common choices include:

- **Nginx** / **Nginx Proxy Manager**
- **Traefik**
- **Caddy**
- **Cloudflare Tunnel**

A typical routing setup:

| Route | Target |
|---|---|
| `yourdomain.com/` | Web app (port 5173) |
| `yourdomain.com/api/*` | API (port 3333) |
| `docs.yourdomain.com` | Docs (port 80) |

**Architecture note:**
- **Client-side requests** (browser) go through your reverse proxy to the API container
- **Server-side requests** (SSR) use `http://cronicorn-api:3333` directly over the internal Docker network — this is handled automatically by the web container

## Optional Features

### GitHub OAuth

Add to your `.env`:
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

Create an OAuth app at [github.com/settings/developers](https://github.com/settings/developers) with callback URL pointing to your API (e.g., `https://yourdomain.com/api/auth/callback/github` or `http://localhost:3333/api/auth/callback/github` for local).

### AI Scheduling

Add to your `.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
AI_MODEL=gpt-4o-mini
```

### Stripe Payments

See [`.env.example`](https://github.com/weskerllc/cronicorn/blob/main/.env.example) for required Stripe configuration.

## Data Storage

The database volume is mounted at `../files/cronicorndatabasevolume` relative to the compose file. This path is **outside** the project directory — make sure the parent directory is writable and included in your backup strategy.

## Useful Commands

```bash
# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f api

# Restart services
docker compose restart

# Stop everything
docker compose down

# Update to latest version
docker compose pull
docker compose up -d
```

## Troubleshooting

- **Connection refused**: Wait 30 seconds for all services to start — the migrator must complete before the API is ready
- **Auth errors**: Ensure `BETTER_AUTH_SECRET` is at least 32 characters
- **API not accessible**: Check that port 3333 isn't already in use
- **Database issues**: Check logs with `docker compose logs db`
- **Web app not reachable**: Ensure port 5173 is uncommented in docker-compose.yml or your reverse proxy is configured

---

## See Also

- **[Quick Start](./quick-start.md)** - Getting started guide
- **[Troubleshooting](./troubleshooting.md)** - Comprehensive troubleshooting guide
- **[API Reference](./api-reference.md)** - Programmatic access
