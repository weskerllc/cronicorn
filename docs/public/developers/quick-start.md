---
id: developer-quick-start
title: Developer Quick Start
description: Set up your Cronicorn development environment in 4 steps
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

Get Cronicorn running locally in 4 steps.

## Prerequisites

- Node.js 24+ and pnpm 10+
- Docker (for PostgreSQL)

## Setup

```bash
# 1. Clone and install
git clone https://github.com/weskerllc/cronicorn.git
cd cronicorn
pnpm install  # Auto-builds packages

# 2. Configure authentication (optional - use defaults)
cp .env.example .env
# Edit .env and uncomment ADMIN_USER_EMAIL and ADMIN_USER_PASSWORD
# Or leave as-is to use GitHub OAuth (requires setup)

# 3. Start database
pnpm db

# 4. Run migrations
pnpm db:migrate

# 5. Start development
pnpm dev
```

**Login**: Open http://localhost:5173

- **Admin User**: Use email/password from your `.env` file
- **GitHub OAuth**: Click "Sign in with GitHub" (if configured)

> 💡 **Tip**: For local dev, uncomment the admin user credentials in `.env` for instant login without OAuth setup.

> ⚠️ You'll see a warning about `OPENAI_API_KEY` - this is normal. AI features are optional.

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services |
| `pnpm dev:api` | API server only |
| `pnpm dev:web` | Web app only |
| `pnpm db` | Start PostgreSQL |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:reset` | Reset db |
| `pnpm db:generate` | Generate migrations when you make schema changes |
| `pnpm studio` | Database Browser |
| `pnpm build` | Production build |

## Troubleshooting

**Can't login?**  
→ Check `.env` has either admin user credentials uncommented OR GitHub OAuth configured

**Module errors?**  
→ `pnpm build:packages`

**Database errors?**  
→ Ensure Docker is running, then `pnpm db`
