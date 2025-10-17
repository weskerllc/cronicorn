# Contributing Guide

Welcome! This guide helps you understand the development workflow and make effective contributions.

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm (package manager)
- Docker (for PostgreSQL)
- GitHub account (for OAuth)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/bcanfield/mvpmvp
cd mvpmvp

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start database
pnpm db
pnpm db:migrate

# Build all packages
pnpm build
```

See [Quickstart Guide](./quickstart.md) for detailed setup instructions.

## Project Structure

```
apps/                   # Runnable applications
  api/                  # REST API server
  scheduler/            # Background worker
  ai-planner/           # AI analysis worker
  web/                  # React frontend
  migrator/             # DB migration runner

packages/               # Shared libraries
  domain/               # Pure business logic
  services/             # Framework-agnostic services
  adapter-*/            # Infrastructure implementations
  worker-*/             # Background worker logic

.adr/                   # Architectural Decision Records
.github/instructions/   # AI agent guidance
docs/                   # Public documentation
```

## Architecture Principles

### Hexagonal (Ports & Adapters)
- **Domain**: Pure logic, no IO dependencies
- **Ports**: Interface contracts
- **Adapters**: Infrastructure implementations
- **Apps**: Composition roots that wire everything together

See [Architecture Guide](./architecture.md) for details.

### Key Rules
1. **Domain never imports from adapters or apps**
2. **Adapters implement ports from domain**
3. **Apps inject concrete adapters into domain**
4. **Services are framework-agnostic**

Example:
```typescript
// ✅ Good
import { JobsRepo } from "@cronicorn/domain";
import { DrizzleJobsRepo } from "@cronicorn/adapter-drizzle";

const repo: JobsRepo = new DrizzleJobsRepo(db);

// ❌ Bad
import { DrizzleJobsRepo } from "@cronicorn/domain";
```

## Development Workflow

### Making Changes

1. **Create a branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make minimal changes**:
   - Change as few lines as possible
   - Don't refactor unrelated code
   - Don't fix unrelated bugs or tests

3. **Write tests**:
   - Unit tests for pure logic
   - Contract tests for adapters
   - Integration tests for API routes
   - See [Testing Strategy](.github/instructions/testing-strategy.instructions.md)

4. **Run checks**:
   ```bash
   pnpm typecheck    # TypeScript type checking
   pnpm test         # Run all tests
   pnpm build        # Verify builds
   ```

5. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: add feature X"
   ```

   Use conventional commit format:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `refactor:` code refactoring
   - `test:` add/update tests
   - `chore:` maintenance

6. **Push and create PR**:
   ```bash
   git push origin feature/my-feature
   ```

### Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm -F @cronicorn/domain test

# Watch mode
pnpm -F @cronicorn/domain test --watch

# Coverage
pnpm -F @cronicorn/domain test --coverage
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package (auto-builds dependencies)
pnpm -F @cronicorn/api build

# Clean build
find . -name "tsconfig.tsbuildinfo" -delete
rm -rf packages/*/dist apps/*/dist
pnpm build
```

### Database Migrations

```bash
# Generate migration from schema changes
pnpm -F @cronicorn/adapter-drizzle generate

# Apply migrations
pnpm db:migrate

# Reset database (destructive!)
pnpm db:reset
```

## Common Tasks

### Adding a New Package

```bash
# Create package directory
mkdir -p packages/my-package/src

# Create package.json
cat > packages/my-package/package.json << EOF
{
  "name": "@cronicorn/my-package",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run"
  }
}
EOF

# Create tsconfig.json
cat > packages/my-package/tsconfig.json << EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../domain" }
  ],
  "include": ["src/**/*"]
}
EOF

# Create entry point
touch packages/my-package/src/index.ts

# Add to root tsconfig.json references
```

### Adding a New Adapter

1. Create package: `packages/adapter-myservice/`
2. Implement port from domain
3. Add contract tests (if applicable)
4. Export from `src/index.ts`
5. Wire into composition root (app)

### Adding a New API Route

1. Create handler in `apps/api/src/routes/`
2. Define Zod schemas for validation
3. Mount in `apps/api/src/app.ts`
4. Add integration tests
5. Update OpenAPI docs (automatic via `@hono/zod-openapi`)

## Code Style

### TypeScript
- Use `type` for simple types, `interface` for extensible contracts
- Prefer explicit return types on public APIs
- Use `const` by default, `let` only when needed
- Avoid `any` (use `unknown` then narrow)

### Naming
- **Files**: kebab-case (`job-manager.ts`)
- **Types**: PascalCase (`JobEndpoint`)
- **Functions**: camelCase (`planNextRun`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_BATCH_SIZE`)

### Comments
- Add comments only when necessary to explain "why"
- Prefer self-documenting code over comments
- Use JSDoc for public API documentation

## Architectural Decision Records (ADRs)

Document significant decisions:

1. Create ADR in `.adr/` folder
2. Use template format (see existing ADRs)
3. Include:
   - **Context**: Why did we need to make this decision?
   - **Decision**: What did we decide?
   - **Consequences**: What changed? What tradeoffs?
   - **References**: Related task IDs

Example filename: `.adr/0022-my-decision.md`

See [ADR Process](.github/instructions/adr-process.instructions.md) for details.

## Tech Debt Logging

For any uncertainty or future work needed:

1. Open `docs/archive/_RUNNING_TECH_DEBT.md`
2. Add entry with context and proposed solution
3. Reference in code comments if relevant

Don't leave TODO comments in code - log them centrally.

## Pull Request Guidelines

### PR Description
- Explain **what** changed and **why**
- Link to related issues
- Note any breaking changes
- Include screenshots for UI changes

### PR Size
- Keep PRs focused and small
- One concern per PR
- Split large changes into multiple PRs

### Review Process
1. CI must pass (tests, typecheck, build)
2. At least one approval required
3. Address review comments
4. Squash commits before merge

## Getting Help

- **Documentation**: Check `docs/` folder first
- **ADRs**: See `.adr/` for design decisions
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions

## Code of Conduct

- Be respectful and constructive
- Focus on the code, not the person
- Assume good intentions
- Help newcomers get oriented

## License

By contributing, you agree that your contributions will be licensed under the project's license (see LICENSE file).

---

**Questions?** Open a discussion or issue. We're here to help!
