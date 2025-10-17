# Quickstart Guide

Get Cronicorn running locally in 5 minutes.

## Prerequisites

- Node.js 18+ and pnpm
- Docker (for PostgreSQL)
- GitHub OAuth app (for authentication)

## Setup Steps

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/cronicorn
cd cronicorn
pnpm install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

**Required variables**:
```bash
# Database (uses Docker PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:6666/db

# GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Generate a secret (run this in terminal)
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

### 3. Start Database

```bash
# Start PostgreSQL in Docker
pnpm db

# Run migrations
pnpm db:migrate
```

**Verify**: Database should be running on `localhost:6666`

### 4. Build Packages

```bash
# Build all TypeScript packages
pnpm build
```

### 5. Start Services

```bash
# Terminal 1: API server
cd apps/api
pnpm dev

# Terminal 2: Scheduler worker
cd apps/scheduler
pnpm dev

# Terminal 3: Web UI (optional)
cd apps/web
pnpm dev
```

## Verify Setup

### Test API Health

```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### Create a Test Job

First, create an API key:

1. Navigate to `http://localhost:5173`
2. Sign in with GitHub
3. Go to Settings → API Keys → Create New
4. Copy the key (shown only once!)

Then create a job:

```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Health Check",
    "endpoints": [{
      "name": "API Health",
      "url": "http://localhost:3000/api/health",
      "method": "GET",
      "baselineIntervalMs": 60000
    }]
  }'
```

### Watch Scheduler Logs

The scheduler should claim and execute your job every 60 seconds:

```bash
cd apps/scheduler
pnpm dev
# Look for: [scheduler] claimed endpoints: ["endpoint_abc123"]
```

## Docker Compose (Alternative)

Run everything in Docker:

```bash
# Start all services
pnpm docker:dev

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down
```

Services available:
- API: `http://localhost:3000`
- Web UI: `http://localhost:5173`
- Database: `localhost:6666`

## Common Commands

### Database
```bash
pnpm db              # Start database
pnpm db:down         # Stop database
pnpm db:reset        # Destroy and recreate
pnpm db:migrate      # Run migrations
```

### Development
```bash
pnpm build           # Build all packages
pnpm dev             # Start all services (Turbo)
pnpm test            # Run tests
pnpm typecheck       # Check TypeScript
```

### Docker
```bash
pnpm docker:dev      # Start dev stack
pnpm docker:prod     # Start production stack
pnpm docker:logs     # Follow logs
pnpm docker:down     # Stop all containers
```

## Environment Configuration

### Development (.env)
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:6666/db
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=db

# Auth
BETTER_AUTH_URL=http://localhost:3000
WEB_URL=http://localhost:5173
BETTER_AUTH_SECRET=<generate-with-openssl>

# GitHub OAuth (dev)
GITHUB_CLIENT_ID=dev-client-id
GITHUB_CLIENT_SECRET=dev-client-secret

# Optional: AI features
OPENAI_API_KEY=sk-...
```

### Production (.env.production)
```bash
# Database (external or Docker)
DATABASE_URL=postgresql://user:password@db.example.com:5432/prod

# Auth (production domains)
BETTER_AUTH_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
BETTER_AUTH_SECRET=<strong-random-secret>

# GitHub OAuth (production)
GITHUB_CLIENT_ID=prod-client-id
GITHUB_CLIENT_SECRET=prod-client-secret

# Optional
OPENAI_API_KEY=sk-prod-...
```

## GitHub OAuth Setup

### Development

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Cronicorn Dev
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Save client ID and secret to `.env`

### Production

Create a separate OAuth app with production URLs:
- **Homepage URL**: `https://yourdomain.com`
- **Callback URL**: `https://api.yourdomain.com/api/auth/callback/github`

## Project Structure

```
apps/
├─ api/              # REST API server (port 3000)
├─ scheduler/        # Background worker (executes jobs)
├─ ai-planner/       # AI analysis worker (optional)
└─ web/              # React frontend (port 5173)

packages/
├─ domain/           # Core scheduling logic
├─ services/         # Business logic
└─ adapter-*/        # Infrastructure (DB, HTTP, etc)
```

## Next Steps

- **[Architecture Guide](./architecture.md)** - Understand the system design
- **[Authentication](./authentication.md)** - OAuth & API key setup
- **[Use Cases](./use-cases.md)** - See real-world examples
- **[Contributing](./contributing.md)** - Development workflow

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check Docker is running
docker ps

# Restart database
pnpm db:down
pnpm db
pnpm db:migrate
```

### Build Errors

```bash
# Clean and rebuild
rm -rf packages/*/dist apps/*/dist
find . -name "tsconfig.tsbuildinfo" -delete
pnpm install
pnpm build
```

### OAuth Redirect Issues

- Verify `BETTER_AUTH_URL` matches your API domain
- Check GitHub OAuth callback URL matches exactly
- Ensure `WEB_URL` in API `.env` matches frontend domain

---

**Still stuck?** Check [existing issues](https://github.com/yourusername/cronicorn/issues) or open a new one.
