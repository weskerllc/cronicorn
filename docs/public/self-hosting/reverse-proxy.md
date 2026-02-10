---
id: self-hosting-reverse-proxy
title: Reverse Proxy
description: Set up a reverse proxy with Caddy, Nginx, or Traefik for HTTPS and routing
sidebar_position: 3
tags:
  - self-hosting
  - reverse-proxy
  - nginx
  - caddy
  - traefik
---

# Reverse Proxy Setup

A reverse proxy sits in front of Cronicorn to provide HTTPS, route requests to the correct service, and add security headers.

## Why You Need One

- **HTTPS/TLS** — Browsers require HTTPS for secure cookies, and auth won't work without it in production
- **Routing** — Direct requests to the web app, API, or docs based on path/subdomain
- **Security** — Add rate limiting, security headers, and IP allowlisting at the edge

## Network Architecture

```
Client (browser)
  │
  ▼
Reverse Proxy (HTTPS :443)
  │
  ├── /           → cronicorn-web:5173
  ├── /api/*      → cronicorn-api:3333
  └── docs.*      → cronicorn-docs:80
```

**Important:** The web app's server-side rendering (SSR) calls the API directly over the internal Docker network (`http://cronicorn-api:3333`), bypassing the reverse proxy. Only client-side (browser) requests go through the proxy.

## Routing Table

| Route | Target Container | Port |
|-------|-----------------|------|
| `/` (web app) | `cronicorn-web` | 5173 |
| `/api/*` | `cronicorn-api` | 3333 |
| `docs.yourdomain.com` | `cronicorn-docs` | 80 |

## Environment Variables

Once your proxy is configured, set these in `.env`:

```bash
WEB_URL=https://app.yourdomain.com
BETTER_AUTH_URL=https://app.yourdomain.com
BASE_URL=https://app.yourdomain.com
VITE_API_URL=https://app.yourdomain.com
VITE_SITE_URL=https://app.yourdomain.com

# This stays internal — SSR uses Docker networking
API_URL=http://cronicorn-api:3333
```

## Caddy (Recommended)

Caddy is the simplest option — it handles HTTPS certificates automatically via Let's Encrypt.

### Caddyfile

```
app.yourdomain.com {
    # API routes
    handle /api/* {
        reverse_proxy cronicorn-api:3333
    }

    # Everything else → web app
    handle {
        reverse_proxy cronicorn-web:5173
    }
}

docs.yourdomain.com {
    reverse_proxy cronicorn-docs:80
}
```

### Add to docker-compose.override.yml

```yaml
services:
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - cronicorn

volumes:
  caddy_data:
  caddy_config:
```

:::tip
Caddy automatically provisions and renews TLS certificates. No additional configuration needed for HTTPS.
:::

## Nginx

### nginx.conf

```nginx
upstream web {
    server cronicorn-web:5173;
}

upstream api {
    server cronicorn-api:3333;
}

upstream docs {
    server cronicorn-docs:80;
}

server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.yourdomain.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # API routes
    location /api/ {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Web app (everything else)
    location / {
        proxy_pass http://web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name docs.yourdomain.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        proxy_pass http://docs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Add to docker-compose.override.yml

```yaml
services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    networks:
      - cronicorn
```

You'll need to manage TLS certificates separately (e.g., via [certbot](https://certbot.eff.org/)).

## Traefik (Docker Labels)

Traefik reads routing configuration from Docker labels, making it a natural fit for Docker Compose deployments.

### docker-compose.override.yml

```yaml
services:
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/letsencrypt
    networks:
      - cronicorn

  api:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`app.yourdomain.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3333"

  web:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`app.yourdomain.com`)"
      - "traefik.http.routers.web.entrypoints=websecure"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
      - "traefik.http.services.web.loadbalancer.server.port=5173"
      - "traefik.http.routers.web.priority=1"

  docs:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.docs.rule=Host(`docs.yourdomain.com`)"
      - "traefik.http.routers.docs.entrypoints=websecure"
      - "traefik.http.routers.docs.tls.certresolver=letsencrypt"
      - "traefik.http.services.docs.loadbalancer.server.port=80"

volumes:
  traefik_certs:
```

:::note Router priority
The `web` router has `priority=1` (lowest) so that the more specific `/api` path prefix matches first. Traefik evaluates higher priority routes first.
:::

## Cloudflare Tunnel

If you use Cloudflare, you can skip managing TLS certificates entirely with [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

```bash
# Install cloudflared
# Then configure tunnels for each service:
cloudflared tunnel route dns cronicorn-tunnel app.yourdomain.com
cloudflared tunnel route dns cronicorn-tunnel docs.yourdomain.com
```

Add `cloudflared` to your compose override:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel run
    environment:
      TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
    networks:
      - cronicorn
```

Configure the tunnel ingress rules in the Cloudflare dashboard to point to the internal Docker hostnames (`cronicorn-api:3333`, `cronicorn-web:5173`, `cronicorn-docs:80`).
