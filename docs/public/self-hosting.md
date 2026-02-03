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
  lastModified: 2026-02-03T00:00:00Z
---

# Self-Hosting Guide

Run Cronicorn on your own infrastructure using Docker Compose with built-in Traefik reverse proxy for automatic HTTPS.

## Quick Start

1. **Download the compose file**
   
   Get [`docker-compose.yml`](https://github.com/weskerllc/cronicorn/blob/main/docker-compose.yml) from the repo. This file pulls pre-built images from our registry—no building required. It includes Traefik for automatic HTTPS and routing.

2. **Create environment file**

   Create a `.env` file in the same directory. See [`.env.example`](https://github.com/weskerllc/cronicorn/blob/main/.env.example) for all options. 
   
   **For local development** (no domain needed):
   ```bash
   # Generate with: openssl rand -base64 32
   BETTER_AUTH_SECRET=your-random-32-character-secret-here
   
   # Optional: Use free .localhost domain (works without DNS)
   DOMAIN=cronicorn.localhost
   ```

   **For production** (with your own domain):
   ```bash
   # Required
   BETTER_AUTH_SECRET=your-random-32-character-secret-here
   DOMAIN=yourdomain.com
   LETSENCRYPT_EMAIL=admin@yourdomain.com
   
   # Update URLs to use your domain
   WEB_URL=https://yourdomain.com
   API_URL=http://cronicorn-api:3333      # Keep internal
   BETTER_AUTH_URL=https://yourdomain.com
   BASE_URL=https://yourdomain.com
   VITE_API_URL=https://yourdomain.com
   ```

3. **Point your domain to your server** (production only)

   Add DNS A records:
   - `yourdomain.com` → Your server IP
   - `docs.yourdomain.com` → Your server IP

4. **Start services**

   ```bash
   docker compose up -d
   ```

5. **Access the app**

   - **Local**: http://localhost (or http://cronicorn.localhost if using DOMAIN)
   - **Production**: https://yourdomain.com (Traefik handles HTTPS automatically)
   - **Docs**: https://docs.yourdomain.com
   - **API**: https://yourdomain.com/api/*
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

## How It Works

The included Traefik reverse proxy automatically:
- Routes `yourdomain.com/` to the web app
- Routes `yourdomain.com/api/*` to the API
- Routes `docs.yourdomain.com` to documentation
- Obtains and renews Let's Encrypt SSL certificates
- Redirects HTTP to HTTPS

**Architecture**:
- **Client-side requests** (browser): `https://yourdomain.com/api/*` → Traefik → API container
- **Server-side requests** (SSR): `http://cronicorn-api:3333` → Direct internal Docker network call

No manual reverse proxy configuration needed!

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

---

## See Also

- **[Quick Start](./quick-start.md)** - Getting started guide
- **[Troubleshooting](./troubleshooting.md)** - Comprehensive troubleshooting guide
- **[API Reference](./api-reference.md)** - Programmatic access
