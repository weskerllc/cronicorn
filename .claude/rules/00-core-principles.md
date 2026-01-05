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

1. **Test continuously**: Unit tests mock ports; integration tests use transaction-per-test
2. **Document decisions**: Create ADRs for architectural choices with task ID references

## Quality Standards

See **`docs/public/developers/quality-checks.md`** for complete requirements.

## Technology Choices

See **`docs/public/developers/workspace-structure.md`** for complete requirements.
