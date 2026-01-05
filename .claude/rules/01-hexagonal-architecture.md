---
applyTo: '**'
---

# Hexagonal Architecture (Ports & Adapters)

**Full architecture details:** See `docs/public/technical/system-architecture.md`

## Quick Reference

**Cronicorn uses hexagonal architecture with clean separation:**
- **Domain** (`packages/domain/**`) - Pure logic, no I/O, only Zod
- **Ports** - Interfaces defined in domain
- **Adapters** (`packages/adapter-*/**`) - Infrastructure implementations
- **Services** (`packages/services/**`) - Business orchestration
- **Composition Roots** (`apps/*/src/index.ts`) - Wire dependencies

**Rule**: Domain never imports infrastructure. All I/O goes through ports.

## Decision Matrix: Where Does Code Go?

| You want to… | Put logic in… | Notes |
|---|---|---|
| Add a scheduling rule | **Domain** (`packages/domain/`) | Pure; unit tests |
| Add a tool action | **Ports + Adapter** | Tools write state |
| New endpoint type | **Dispatcher adapter** + **planner** | Execute in dispatcher |
| Enforce quotas | **Planner/Dispatcher wrapper** | Don't touch governor |
| Persist in DB | **Jobs/Runs repo adapter** (`packages/adapter-drizzle/`) | Leases, indexes |
| Use OpenAI SDK | **Planner adapter** (`packages/adapter-ai/`) | Domain only sees tools |
| Observability | **Logger adapter** (`packages/adapter-pino/`) | No SDKs in domain |
| Business logic | **Services** (`packages/services/`) | Orchestrates repos, enforces rules |

**Golden Rule**: **IO/library → Adapter/Root**. **Scheduling/policy → Domain**. **Business rules → Services**.

## Workspace Mapping

See `docs/public/developers/workspace-structure.md` for complete package details.

**Quick lookup:**
- Domain logic → `packages/domain/**`
- Infrastructure → `packages/adapter-*/**`
- Business layer → `packages/services/**`
- Wiring → `apps/*/src/index.ts`

## Domain Purity Rules

```typescript
// ✅ GOOD - Domain depends only on ports and Zod
import type { Clock, JobsRepo } from './ports';
import { z } from 'zod';

// ❌ BAD - Domain imports infrastructure
import { drizzle } from 'drizzle-orm';
import fetch from 'node-fetch';
import pino from 'pino';
```

## Testing Strategy

- **Unit tests**: Domain with mocked ports
- **Contract tests**: Adapters meet port interfaces
- **Integration tests**: Transaction-per-test with real DB

**See `docs/public/developers/quality-checks.md` for testing standards.**

## References

- **System architecture**: `docs/public/technical/system-architecture.md`
- **Workspace structure**: `docs/public/developers/workspace-structure.md`
- **ADR-0002**: `.adr/0002-hexagonal-architecture-principles.md`
