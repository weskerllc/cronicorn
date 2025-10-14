# Core Service Research

This document consolidates the user-facing and agent-facing capabilities the platform must provide, grounded in the current documentation and codebase. Each service definition includes:
- **Purpose & Workflows**: Why the service matters and the scenarios it must unlock.
- **Required Actions**: High-confidence operations we need to expose (REST + MCP friendly).
- **Current Coverage**: What already exists in the repo today.
- **Gaps & Considerations**: Key deltas to close before the service is shippable.
- **References**: Source material backing the conclusions.

## Research Inputs
- AI-driven flash sale walkthrough showing multi-tier endpoint coordination and adaptive cadence ([docs/flash-sale-scenario.md](docs/flash-sale-scenario.md); [docs/ai-scheduler-architecture.md](docs/ai-scheduler-architecture.md)).
- Current API surface and backlog highlighting job CRUD maturity ([apps/api/src/routes/jobs](apps/api/src/routes/jobs); [docs/api-phase2-completion.md](docs/api-phase2-completion.md)).
- Scheduler, repository, and adapter implementations that run workloads today ([packages/domain](packages/domain); [packages/scheduler](packages/scheduler); [packages/adapter-drizzle](packages/adapter-drizzle); [apps/scheduler/src/index.ts](apps/scheduler/src/index.ts)).
- Dual-auth design for human + machine access ([docs/dual-auth-architecture.md](docs/dual-auth-architecture.md)).

## 1. Job Lifecycle Service
- **Purpose & Workflows**: Provide a durable container for user intent ("Daily sales report" or "Flash sale orchestrator") and let humans or agents manage that container end to end. Critical for onboarding API-first users and scaffolding MCP tool discovery. Current workflows only create lone endpoints without reusable job metadata.
- **Required Actions**:
  - `create_job` (name, description, tags, owner, default cadence archetype).
  - `list_jobs`, `get_job_summary` (with counts of endpoints, last run, health).
  - `update_job_profile` (rename, retag, adjust defaults, attach shared secrets).
  - `delete_job` / `archive_job` (soft delete to preserve run history).
- **Current Coverage**: `POST /jobs` creates an endpoint and fabricates a `jobId`, but no persistent job record or read/update APIs exist ([jobs.routes.ts](apps/api/src/routes/jobs/jobs.routes.ts); [JobsManager.createJob](packages/services/src/jobs/manager.ts)). The Phase 2 checklist calls out the missing read/update/delete endpoints ([docs/api-phase2-completion.md](docs/api-phase2-completion.md)).
- **Gaps & Considerations**:
  - Introduce a real `jobs` table and entity; today every endpoint gets a random `jobId` with a "TODO: Proper job grouping" note ([packages/services/src/jobs/manager.ts](packages/services/src/jobs/manager.ts)).
  - Ensure responses surface metadata AI agents can reason about (descriptions, tags, automation policies).
  - Wire lifecycle hooks into auth (tenant isolation, API key scope) per dual-auth design ([docs/dual-auth-architecture.md](docs/dual-auth-architecture.md)).

## 2. Endpoint Orchestration Service
- **Purpose & Workflows**: Manage the individual `JobEndpoint` instances that do the actual work—HTTP calls, diagnostics, recovery actions. The flash sale scenario demonstrates ten coordinated endpoints with tiering and dependencies that users must configure explicitly ([docs/flash-sale-scenario.md](docs/flash-sale-scenario.md)).
- **Required Actions**:
  - `add_endpoint_to_job` (baseline cadence, HTTP config, guardrails, tier labels, dependency graph).
  - `update_endpoint_config` (change method/url, guardrails, retry policy, metadata).
  - `remove_endpoint` / `disable_endpoint` (retains history but stops scheduling).
  - `define_endpoint_relationships` (express dependencies, shared observability channels, tiers).
- **Current Coverage**: Domain models and repos store endpoints with cadence, hints, and request data ([packages/domain/src/entities/endpoint.ts](packages/domain/src/entities/endpoint.ts); [packages/adapter-drizzle/src/jobs-repo.ts](packages/adapter-drizzle/src/jobs-repo.ts)). However the API layer only supports creation; no endpoint-level update, dependency metadata, or deletion workflows exist.
- **Gaps & Considerations**:
  - Add endpoint CRUD routes/services once the job container exists (see API checklist).
  - Extend storage model for dependency metadata (e.g., tier, prerequisite endpoints) so the scheduler or AI planners can reason about coordination.
  - Provide schema descriptions suitable for MCP tool definitions (clear field intents, enums for tiers, etc.).

## 3. Adaptive Scheduling Control Service
- **Purpose & Workflows**: Give humans and AI agents direct control over cadence, pauses, and manual nudges—the same primitives the internal planner uses (`propose_interval`, `propose_next_time`, `pause_until`) ([docs/ai-scheduler-architecture.md §7.1](docs/ai-scheduler-architecture.md); [packages/scheduler/src/sim/scenarios.ts](packages/scheduler/src/sim/scenarios.ts)). This is essential for incident response, experimentation, and external AI copilots.
- **Required Actions**:
  - `apply_interval_hint` (interval, TTL, reason) → writes `aiHintIntervalMs` and nudges `nextRunAt`.
  - `schedule_one_shot_run` (timestamp or relative delay, TTL, reason) → sets `aiHintNextRunAt`.
  - `pause_or_resume_endpoint` (until timestamp, reason) → manages `pausedUntil` and resets cadence when resuming.
  - `trigger_immediate_run` / `reset_failure_state` for manual interventions.
  - `clear_adaptive_hints` (force return to baseline).
- **Current Coverage**: JobsRepo exposes the necessary methods (`writeAIHint`, `setNextRunAtIfEarlier`, `setPausedUntil`) and the scheduler honors them, but only the simulator exercises the flow. No public API or MCP surface exists for users.
- **Gaps & Considerations**:
  - Ship authenticated endpoints and MCP tools that call these ports, capturing audit metadata (who/what applied the hint).
  - Harmonize with QuotaGuard when AI-driven hints come from hosted models ([packages/domain/src/ports/services.ts](packages/domain/src/ports/services.ts)).
  - Define safety rails (respect min/max clamps already in governor) and conflict resolution when multiple agents issue hints.

## 4. Execution Visibility & Insights Service
- **Purpose & Workflows**: Surface run history, durations, failures, and the adaptive decisions that led to them so humans/agents can diagnose and close the loop. The worker already writes runs via `RunsRepo`, and the API backlog includes listing runs ([packages/adapter-drizzle/src/runs-repo.ts](packages/adapter-drizzle/src/runs-repo.ts); [docs/api-phase2-completion.md](docs/api-phase2-completion.md)).
- **Required Actions**:
  - `list_runs` (filter by job, endpoint, status, time range) with pagination.
  - `get_run_details` (status, duration, error message, hint source).
  - `summarize_endpoint_health` (MTTR/MTBF, failure streaks, current cadence source).
  - `export_run_metrics` or `stream_run_events` for downstream analytics/AI retraining.
- **Current Coverage**: Runs table tracks status/duration but lacks API exposure. Flash sale simulator produces snapshots but nothing surfaces to users. No aggregation logic exists yet.
- **Gaps & Considerations**:
  - Implement GET `/jobs/:id/runs` and related queries (already scoped in Phase 2 plan).
  - Annotate run records with governor decision (`source`) so insights can attribute cadence (data available in scheduler but not persisted yet).
  - Provide MCP-readable schemas so agents can pull histories and adapt plans autonomously.

## 5. Access & Automation Surface Service
- **Purpose & Workflows**: Ensure humans, services, and third-party AI agents can authenticate and discover the above actions safely. Dual-auth via Better Auth already unifies GitHub OAuth and API keys ([docs/dual-auth-architecture.md](docs/dual-auth-architecture.md)), but we also need a first-class MCP surface for AI orchestration.
- **Required Actions**:
  - `create_api_key`, `list_api_keys`, `revoke_api_key` (already provided by Better Auth routes but we must document and expose via UI/MCP catalogs).
  - `describe_service_catalog` (enumerate available actions + schemas for AI agents).
  - `register_agent_identity` / `assign_permissions` (so quotas and audit trails can distinguish human vs automation).
  - `fetch_openapi_spec` / `fetch_mcp_manifest` (single source for tool metadata).
- **Current Coverage**: Auth middleware enforces unified sessions (`requireAuth` in [jobs.index.ts](apps/api/src/routes/jobs/jobs.index.ts)). Better Auth supplies API key CRUD endpoints, but our product surface does not yet advertise or scope them for scheduler-specific permissions. No MCP server exists yet.
- **Gaps & Considerations**:
  - Layer domain-specific scopes on top of Better Auth (e.g., endpoint:read/write, scheduling:control) before exposing high-impact actions to external agents.
  - Design and ship an MCP server that wraps the actions above and reuses JobsManager/services for implementation.
  - Integrate QuotaGuard + telemetry to monitor agent usage and prevent runaway costs.

---

**Next Steps**
1. Stand up the Job Lifecycle and Endpoint Orchestration services to unblock CRUD parity (aligns with API Phase 2 backlog).
2. Expose Adaptive Scheduling Control actions over both REST and the forthcoming MCP server so users and AI agents share the same primitives.
3. Layer observability and access controls to make the scheduling loop auditable and automation-friendly.
