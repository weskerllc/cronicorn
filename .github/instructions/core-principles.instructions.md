---
applyTo: '**'
---

# Core Principles

## Development Philosophy

- **Prefer boring, proven solutions** over clever or "future-proof" abstractions
- **One clear path > many configurable paths** - avoid over-engineering
- **YAGNI**: Don't build options, layers, or APIs until the third real use
- **Keep files and functions small** (aim < 150 lines/file, < 40 lines/function)

## Architecture Patterns

- **Request-scoped transactions**: Every API route/worker operation opens a transaction at the boundary
- **Vertical slices**: Each feature owns its ports, repositories, and managers with clear separation
- **Clean layering**: Contracts (API DTOs) → Managers (business logic) → Repos (DB access)
- **Pragmatic typing**: Use DB types directly in ports when domain models closely align

## Development Workflow

1. **Plan in ./.tasks/<doc>.md**: Break features into hierarchical TASK-X.Y.Z IDs
2. **Implement incrementally**: Focus on vertical slices (complete features end-to-end)
3. **Test continuously**: Unit tests mock ports; integration tests use transaction-per-test
4. **Document decisions**: Create ADRs for architectural choices with task ID references

## Quality Standards

- **Before commit**: Run relevant tests, ensure no lint errors
- **Before merge**: Full test suite passes, ADR created for decisions
- **After implementation**: Update ./.tasks/<doc>.md status, verify task completion

## Technology Choices

- **Monorepo**: pnpm workspaces with TypeScript project references
- **API**: Hono framework with zod-openapi for type-safe endpoints
- **Database**: Drizzle ORM with PostgreSQL, migration-based schema changes
- **Testing**: Vitest with coverage, transaction-per-test for DB tests</content>