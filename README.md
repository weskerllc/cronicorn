
# Cron MVP - AI HTTP Job Scheduler

An AI-powered HTTP request scheduler that supports dynamic scheduling based on runtime signals, endpoint responses, and manual overrides.

## 🚀 Quick Start

```bash
# Get the code
git clone https://github.com/bcanfield/mvpmvp.git
cd mvpmvp

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

## 🔄 CI/CD

The project uses GitHub Actions for automated releases and deployments.

### Automated Release Process

When code is merged to `main`:
1. CI workflow runs tests and quality checks
2. Semantic-release automatically versions and creates a GitHub release
3. Release workflow triggers on the published release and builds Docker images
4. Docker images are published to GitHub Container Registry with version tags
5. Release notes are automatically updated with Docker image information

The release workflow automatically triggers when semantic-release publishes a release - no manual setup required!

### Docker Images

All services are automatically built and published as Docker images with each release:

```bash
# Pull images by version (recommended)
docker pull ghcr.io/bcanfield/mvpmvp/api:v1.2.3
docker pull ghcr.io/bcanfield/mvpmvp/scheduler:v1.2.3
docker pull ghcr.io/bcanfield/mvpmvp/ai-planner:v1.2.3
docker pull ghcr.io/bcanfield/mvpmvp/web:v1.2.3
```

**Documentation:**
- 📖 [Quick Reference Guide](./docs/DOCKER_QUICK_REFERENCE.md) - How to use the Docker workflow
- 🚀 [Optimization Guide](./docs/DOCKER_BUILD_OPTIMIZATION.md) - Technical details on caching & performance
- 📊 [Before/After Comparison](./docs/DOCKER_WORKFLOW_COMPARISON.md) - What changed and why

**Key Features:**
- Multi-tier caching (70-80% faster builds)
- Automatic release notes updates with image details
- SBOM and provenance attestations for security
- Multi-platform support (amd64 & arm64)

See [Docker Quick Reference](./docs/DOCKER_QUICK_REFERENCE.md) for complete usage instructions.

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

This project is licensed under the Fair Source License, Version 0.9.

**TL;DR:** You can freely use, modify, and self-host this software for any purpose. However, you cannot offer it as a commercial hosted service to compete with the original project.

**Permitted:**
- ✅ Use for personal, business, or organizational purposes
- ✅ Self-host for your own infrastructure
- ✅ Modify and distribute the source code
- ✅ Include as a component in larger services

**Not Permitted:**
- ❌ Sell hosted access to this software as a standalone product
- ❌ Offer "Cronicorn-as-a-Service" commercially
- ❌ Compete directly by hosting this as a paid service

See the [LICENSE](./LICENSE) file for full details.

For commercial hosting licenses, please contact the repository maintainer.
