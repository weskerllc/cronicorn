---
id: developer-quick-start
title: Developer Quick Start
description: Set up your Cronicorn development environment with zero configuration
tags:
  - developer
  - essential
sidebar_position: 1
mcp:
  uri: file:///docs/developers/quick-start.md
  mimeType: text/markdown
  priority: 0.9
---

# Developer Quick Start

Get Cronicorn running locally with **zero configuration**.

## Prerequisites

- Node.js 24+ and pnpm 10+
- Docker (for PostgreSQL)

## Setup (No .env Required)

```bash
# 1. Clone and install
git clone https://github.com/weskerllc/cronicorn.git
cd cronicorn
pnpm install

# 2. Start database
pnpm db

# 3. Run migrations
pnpm db:migrate

# 4. Seed demo data (OPTIONAL: seeds sample data)
pnpm db:seed

# 5. Start development
pnpm dev
```

**That's it!** No `.env` file needed for local development.

## Login

Open http://localhost:5173 and login with:

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `devpassword` |

> 💡 **For AI Agents**: The app works out of the box with default credentials. No environment variables or configuration required.

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services |
| `pnpm dev:api` | API server only |
| `pnpm dev:web` | Web app only |
| `pnpm db` | Start PostgreSQL |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:reset` | Reset database |
| `pnpm db:generate` | Generate migrations after schema changes |
| `pnpm studio` | Database browser |
| `pnpm build` | Production build |

## Troubleshooting

**Can't login?**  
→ Run `pnpm db:seed` to create the admin user

**Module errors?**  
→ `pnpm build:packages`

**Database errors?**  
→ Ensure Docker is running, then `pnpm db`

## Next Steps

- **[Environment Configuration](./environment-configuration.md)** - Customize settings or configure for production
- **[Authentication](./authentication.md)** - Set up GitHub OAuth or API keys
