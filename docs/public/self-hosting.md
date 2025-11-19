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
  priority: 0.8
---

# Self-Hosting Guide

Run Cronicorn on your own infrastructure using Docker Compose.

## Quick Start

1. **Download the compose file**
   
   Get [`docker-compose.yml`](https://github.com/weskerllc/cronicorn/blob/main/docker-compose.yml) from the repo. This file pulls pre-built images from our registry—no building required.

2. **Create environment file**

   Create a `.env` file in the same directory. See [`.env.example`](https://github.com/weskerllc/cronicorn/blob/main/.env.example) for all options. At minimum, set:

   ```bash
   # Generate with: openssl rand -base64 32
   BETTER_AUTH_SECRET=your-random-32-character-secret-here
   ```

   Everything else has sensible defaults that work out of the box.

3. **Start services**

   ```bash
   docker compose up -d
   ```

4. **Access the app**

   - **Dashboard**: http://localhost:5173
   - **API**: http://localhost:3333
   - **Login**: Use default admin credentials from `.env.example`

## Optional Features

### GitHub OAuth

Add to your `.env`:
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

Create an OAuth app at [github.com/settings/developers](https://github.com/settings/developers) with callback URL: `http://localhost:3333/api/auth/callback/github`

### AI Scheduling

Add to your `.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
AI_MODEL=gpt-4o-mini
```

### Stripe Payments

See `.env.example` for required Stripe configuration.

## Custom Domain

To use a custom domain, update these in your `.env`:

```bash
# Public URLs (accessed by browsers)
BETTER_AUTH_URL=https://cronicorn.yourdomain.com
WEB_URL=https://cronicorn.yourdomain.com
VITE_API_URL=https://cronicorn.yourdomain.com  # Used at build time for client-side requests
BASE_URL=https://cronicorn.yourdomain.com

# Internal URLs (Docker network, used by web SSR to call API)
API_URL=http://cronicorn-api:3333  # Keep this as internal Docker hostname
```

**Important**: The web app makes requests to the API from two places:
- **Client-side** (browser): Uses `VITE_API_URL` - must be your public domain
- **Server-side** (SSR): Uses `API_URL` - should be internal Docker network URL (`http://cronicorn-api:3333`)

You'll need a reverse proxy (Traefik, Caddy, nginx) to handle SSL and route requests:
- `yourdomain.com/` → Web container (port 5173)
- `yourdomain.com/api/*` → API container (port 3333)

## Useful Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop everything
docker compose down

# Update to latest version
docker compose pull
docker compose up -d
```

## Troubleshooting

- **Connection refused**: Wait 30 seconds for all services to start
- **Auth errors**: Ensure `BETTER_AUTH_SECRET` is at least 32 characters
- **API not accessible**: Check that port 3333 isn't already in use
- **Database issues**: Check logs with `docker compose logs db`
