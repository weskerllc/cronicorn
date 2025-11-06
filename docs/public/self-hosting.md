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

Create a `docker-compose.yml` file with the following configuration:

```yaml
services:
  db:
    image: postgres:17
    container_name: cronicorn-db
    restart: unless-stopped
    networks:
      - cronicorn
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: cronicorn
      POSTGRES_PASSWORD: your_secure_password_here
      POSTGRES_DB: cronicorn
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cronicorn"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - cronicorn-db:/var/lib/postgresql/data

  migrator:
    image: ghcr.io/weskerllc/cronicorn/migrator:latest
    container_name: cronicorn-migrator
    restart: no
    networks:
      - cronicorn
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://cronicorn:your_secure_password_here@db:5432/cronicorn

  api:
    image: ghcr.io/weskerllc/cronicorn/api:latest
    container_name: cronicorn-api
    restart: unless-stopped
    networks:
      - cronicorn
    depends_on:
      db:
        condition: service_healthy
      migrator:
        condition: service_completed_successfully
    environment:
      DATABASE_URL: postgresql://cronicorn:your_secure_password_here@db:5432/cronicorn
      PORT: 3333
      BETTER_AUTH_SECRET: generate_random_secret_here
      BETTER_AUTH_URL: http://localhost:3333
      WEB_URL: http://localhost:5173
      API_URL: http://localhost:3333
      GITHUB_CLIENT_ID: your_github_client_id
      GITHUB_CLIENT_SECRET: your_github_client_secret
      NODE_ENV: production
    ports:
      - "3333:3333"

  scheduler:
    image: ghcr.io/weskerllc/cronicorn/scheduler:latest
    container_name: cronicorn-scheduler
    restart: unless-stopped
    networks:
      - cronicorn
    depends_on:
      db:
        condition: service_healthy
      migrator:
        condition: service_completed_successfully
    environment:
      DATABASE_URL: postgresql://cronicorn:your_secure_password_here@db:5432/cronicorn
      NODE_ENV: production

  ai-planner:
    image: ghcr.io/weskerllc/cronicorn/ai-planner:latest
    container_name: cronicorn-ai-planner
    restart: unless-stopped
    networks:
      - cronicorn
    depends_on:
      db:
        condition: service_healthy
      migrator:
        condition: service_completed_successfully
    environment:
      DATABASE_URL: postgresql://cronicorn:your_secure_password_here@db:5432/cronicorn
      OPENAI_API_KEY: your_openai_api_key  # Optional - required for AI features
      AI_MODEL: gpt-4o-mini
      NODE_ENV: production

  web:
    image: ghcr.io/weskerllc/cronicorn/web:latest
    container_name: cronicorn-web
    restart: unless-stopped
    networks:
      - cronicorn
    depends_on:
      - api
    ports:
      - "5173:80"

volumes:
  cronicorn-db:

networks:
  cronicorn:
    driver: bridge
```

## Start Cronicorn

```bash
# Start all services
docker compose up -d

# Check logs
docker compose logs -f

# Stop services
docker compose down
```

## Access Points

- **Web Dashboard**: http://localhost:5173
- **API Server**: http://localhost:3333
- **API Documentation**: http://localhost:3333/reference

## Required Configuration

Update these values in your `docker-compose.yml`:

1. **Database Password**: Replace `your_secure_password_here`
2. **Auth Secret**: Replace `generate_random_secret_here` with a random string
3. **GitHub OAuth**: Add your `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
4. **OpenAI API Key**: Add `OPENAI_API_KEY` if using AI features

## Optional: Custom Domain

To use a custom domain, update these environment variables:

```yaml
BETTER_AUTH_URL: https://your-domain.com
WEB_URL: https://your-domain.com
API_URL: https://api.your-domain.com
```

---

**More detailed documentation coming soon**, including production deployment, scaling, and monitoring.
