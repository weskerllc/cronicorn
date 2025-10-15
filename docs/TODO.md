 # Adaptive AI Scheduler - Development Roadmap

## Current State (Completed ✅)

- ✅ **Phase 1: Adapter Layer** - All adapters complete (Drizzle, Cron, HTTP, System Clock, AI SDK)
- ✅ **Phase 2.1: Worker App** - Production scheduler worker with all adapters wired
- ✅ **Phase 2.2: API Foundation** - Hono API with Better Auth (OAuth + API keys), POST /jobs complete
- ✅ **Phase 3.1: Services Layer** - `@cronicorn/services` package with framework-agnostic business logic

See `.adr/` folder for detailed decision records on completed work.

## Next: API CRUD Routes & Service Actions

### Phase 4.2: Complete CRUD Routes

**Jobs Lifecycle**:
- GET /jobs/:id - Fetch job details
- GET /jobs - List user's jobs  
- PATCH /jobs/:id - Update job metadata
- DELETE /jobs/:id - Archive job

**Endpoint Management**:
- GET /jobs/:jobId/endpoints - List endpoints for a job
- PATCH /endpoints/:id - Update endpoint config
- DELETE /endpoints/:id - Delete endpoint

**Adaptive Control** (Future):
- POST /endpoints/:id/hints/interval - Apply interval hint
- POST /endpoints/:id/hints/one-shot - Schedule one-shot run
- POST /endpoints/:id/pause - Pause/resume endpoint
- DELETE /endpoints/:id/hints - Clear adaptive hints

**Execution Visibility** (Future):
- GET /runs - List execution history
- GET /runs/:id - Get run details
- GET /endpoints/:id/health - Endpoint health summary

See `docs/use-cases-and-actions.md` for complete action definitions.

---

## Architecture Decisions

All major architectural decisions are documented in the `.adr/` folder. Key patterns:

- **Auth**: Better Auth with dual authentication (OAuth + API Keys) - See ADR-0011
- **File Structure**: Vertical slices (feature folders own routes + schemas)
- **Transactions**: Manual transaction-per-route (explicit, not middleware)
- **OpenAPI**: `@hono/zod-openapi` for type-safe auto-generated docs

See `.adr/` folder and architecture docs for details.

---

## Reference Documents

- **Architecture**: `docs/ai-scheduler-architecture.md` - Comprehensive architecture guide
- **Use Cases**: `docs/use-cases-and-actions.md` - 6 use cases with 17 public actions
- **Auth Guide**: `docs/dual-auth-architecture.md` - Dual authentication (OAuth + API keys)
- **Cross-Origin Auth**: `docs/cross-origin-auth-setup.md` - Cross-origin setup for web UI
- **Best Practices**: `docs/package-json-best-practices.md`, `docs/typescript-project-references-setup.md`
- **ADRs**: `.adr/` folder - All architectural decisions with rationale
