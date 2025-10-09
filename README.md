# Cron MVP - AI HTTP Job Scheduler

An AI-powered HTTP request scheduler that supports dynamic scheduling based on runtime signals, endpoint responses, and manual overrides.

## 🚀 Quick Start

```bash
# Get the code
git clone <repository-url>
cd cron-mvp

# Install everything
pnpm install

# Start database
docker-compose up -d

# Set up database
pnpm migrate

# Start development
pnpm dev
```

API runs at `http://localhost:3333`. Everything uses our single `.env` file via dotenv CLI.

## 📋 Prerequisites

- Node.js >= 24.0.0
- pnpm >= 10.0.0
- Docker (for PostgreSQL)

## 🏗️ What This Is

A monorepo with clean architecture:

```
apps/           # API server + background scheduler
packages/       # Shared code in vertical slices
├── core-*      # Shared infrastructure
└── feature-*   # Business logic
```

**Key features:**

- Schedule HTTP requests with intervals
- AI-driven schedule adjustments
- API key & Oauth authentication

## 🛠️ Development

### Setup

1. **Database**: `docker-compose up -d` (runs on port 6666)
2. **Environment**: Copy `.env.example` to `.env` and configure (see Environment Variables below)
3. **Migrations**: `pnpm migrate`

### Environment Variables

**Optional**: All environment variables have working defaults for development. Create a `.env` file only if you want to customize:

```bash
# Database (defaults to localhost:6666 - matches docker-compose)
DATABASE_URL=postgresql://user:password@localhost:6666/cron_mvp

# Authentication (defaults work for basic testing)
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
AUTH_SECRET=your_32_character_random_string_for_session_signing

# Application (defaults to localhost:3333)
CRONICORN_API_URL=http://localhost:3333
NODE_ENV=development

# AI Features (leave blank to disable AI scheduling)
OPENAI_API_KEY=sk-your_openai_api_key_here
AI_MODEL=gpt-4o-mini
AI_ENABLED=true
```

**Quick Start**: The app works immediately with `pnpm dev` using defaults.

**For Real OAuth** (optional):
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App with:
   - Authorization callback URL: `http://localhost:3333/api/auth/callback/github`
3. Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to `.env`

**For AI Features** (optional):
- Add `OPENAI_API_KEY=sk-...` and `AI_ENABLED=true` to enable AI scheduling
- Without this, jobs use simple interval scheduling (still fully functional)

### Running Things

All commands run from the repo root. We use dotenv CLI so everything shares the same `.env` file.

- `pnpm dev` - Start API + scheduler in development
- `pnpm build` - Build for production
- `pnpm test` - Run all tests
- `pnpm studio` - Open database browser

Check `package.json` for all available scripts.

## 🧪 Testing

```bash
pnpm test              # All tests
pnpm test:coverage     # With coverage
```

We use transaction-per-test for clean database state.

## 🚀 Production Deployment

### Environment Configuration

**Required for Production:**

```bash
# Production Database (required - no default production DB)
DATABASE_URL=postgresql://username:password@your-db-host:5432/production_db

# Secure Authentication (required - defaults are for dev only)
AUTH_SECRET=secure_random_32_character_production_secret
GITHUB_CLIENT_ID=your_production_github_client_id
GITHUB_CLIENT_SECRET=your_production_github_client_secret

# Production Domain (required if different from localhost)
CRONICORN_API_URL=https://your-domain.com

# Runtime
NODE_ENV=production
```

**Optional for Production:**
```bash
# AI Features (leave blank to disable)
OPENAI_API_KEY=sk-your_production_openai_key
AI_ENABLED=true
AI_MODEL=gpt-4o-mini  # or gpt-4o for higher accuracy
```

### Docker Deployment

```bash
# Build and start production containers
docker-compose -f docker-compose-prod.yml up -d

# Run migrations in production
docker-compose -f docker-compose-prod.yml exec api pnpm migrate
```

### Health Checks

Verify deployment:

- API Health: `GET /health` should return 200
- Database: Check migration status
- Scheduler: Monitor logs for job execution
- AI Features: Test with an AI-enabled job

## 🤝 Contributing

1. Fork & create a feature branch
2. Write tests first
3. Follow our clean architecture patterns
4. Create ADRs for big decisions
5. Run tests: `pnpm test`

## 🎯 AI Scheduler Simulator

Explore the AI-driven scheduler's adaptive capabilities with a full e-commerce flash sale simulation:

```bash
cd packages/feature-endpoints
pnpm sim
```

**What you'll see:**
- **10 endpoints** orchestrating across 4 coordination tiers (Health, Investigation, Recovery, Alert)
- **40 minutes simulated** showing traffic surge → strain → critical → recovery phases
- **467 total runs** with adaptive intervals (1m→20s→1m), conditional activation, cooldowns, and alert escalation
- **18 assertions validating** all coordination patterns

**Learn more:**
- 📖 [Flash Sale Scenario Guide](./packages/feature-endpoints/flash-sale-scenario.md) - Complete walkthrough with minute-by-minute timeline
- 🏗️ [Architecture Documentation](./packages/feature-endpoints/ai-scheduler-architecture.md) - Deep dive into scheduler mechanics

## 📄 Documentation

- [Architecture Decisions](./.adr/) - Why we built things this way
- [Task Lists](./tasks/) - What's next, what's been done
- [More Context](./docs)

## � Support

Got questions? Open an issue or discussion on GitHub.

## 📄 License

ISC License.
