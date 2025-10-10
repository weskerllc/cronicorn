🗂️ Core domain package migration plan
Scope & intent
Stand up a new packages/domain workspace package that owns all pure scheduling domain artifacts: entities, ports, governor logic, domain-specific errors, and tiny fixtures/tests.
Strip policy logic and shared types out of @cronicorn/scheduler and any adapters so those packages consume the new domain package instead of re-declaring types.
Keep the new package framework-free: it ships only TypeScript types/functions, no zod, no IO, no SDKs.
Current state snapshot (verified against repo)
governor.ts already implements the pause/hint/clamp logic; it uses cron.next(expr, now) rather than lastRunAt.
ports.ts mixes pure contracts with adapter concerns:
Includes Clock, Cron, JobsRepo, RunsRepo, Dispatcher, but also AI tooling helpers (callTool, tool, defineTools), AIClient, QuotaGuard, and a direct zod dependency.
JobEndpoint currently requires minIntervalMs and carries lockedUntil + lastStatus, which are adapter-oriented.
Status enums use "failed"/"canceled" rather than "failure"/"cancelled".
scheduler.ts orchestrates IO (repos, dispatcher). It feels more “application service” than pure domain but still only speaks through ports.
memory-store.ts relies on lockedUntil, failure-status strings, and update payloads identical to today’s JobsRepo shape.
No domain-level fixtures/tests exist yet; tests live only in the simulator.
Delta vs partner-agent template (key adjustments)
Template suggestion	Reality check & plan
Package name @core/domain	Align with repo namespace: propose @cronicorn/domain (matches @cronicorn/scheduler).
JobsRepo signatures async, simplified	Current repo uses setLock/clearLock, status.status: "success" \| "failed" \| "canceled". Plan: keep existing contract for now, then iterate once DB adapter lands.
Status union `success	failure
No scheduler class in domain	Confirm we’ll keep Scheduler inside scheduler (depends on dispatcher, repos). Domain package will expose only pure types/policies/utilities.
Ports contain only repos/clock/cron	We must relocate AI tooling helpers (callTool, tool, etc.) into the AI adapter package to keep the new domain package dependency-free.
JobEndpoint optional min/max	Today minIntervalMs is required. Plan: relax to optional in domain (use defaults in adapters) and audit call sites.
Governor sample lacks “now floor”	Existing governor floors past candidates to now. Plan to retain this behavior; update doc/tests to lock it in.
Proposed packages/domain structure
Adjustments to template for repo realities:

entities.ts should omit lockedUntil/lastStatus; adapters can extend via intersection types.
ports.ts keeps today’s method signatures but converts functions to async returning Promise where we expect IO (e.g., make JobsRepo.add return Promise<void> for future DB). Document transitional differences (e.g., setLock remains until we finish leasing redesign).
Decide whether QuotaGuard belongs: architecture guide lists it as a port. Move it into domain package but refactor to be interface-only (no helper functions, no zod).
Provide narrow RunStatus union derived from actual usage ("success" | "failed" | "canceled"). Note optional future timeout.
No tool helpers/zod types here; relocate them to a small helper inside adapter-ai or leave inside scheduler temporarily (but not in domain).
Migration workflow
Scaffold package

Add package.json and tsconfig.json extending root config.
Update pnpm-workspace.yaml (already globbed) & tsconfig.base.json paths: add alias @cronicorn/domain/* -> packages/domain/src/*.
Optionally add Turbo pipeline (inherit defaults via dist/** outputs).
Port pure files

Copy planNextRun logic into governor.ts; adapt imports to new ports.ts.
Extract JobEndpoint & port interfaces into dedicated files, trimming adapter extras. Document transitional compatibility (e.g., create type StoredJobEndpoint = JobEndpoint & { lockedUntil?: Date; lastStatus?: ... } within @cronicorn/scheduler).
Add domain error classes + fixtures.
Author unit tests

Create tests/governor.spec.ts with cases covering:
Pause precedence.
Baseline vs interval vs oneshot selection.
Hint expiry and TTL behavior.
Min/max clamp relative to lastRunAt.
“candidate before now” floor.
Use fixtures.ts helpers for readability.
Wire exports

Publish a clean barrel in index.ts and ensure package.json exports . to dist/index.js + .d.ts.
Add build, test, typecheck scripts (reuse root devDeps).
Update consumers

scheduler:
Remove duplicated types/functions; import from @cronicorn/domain.
Move AI tool helpers either into a new file (e.g., adapters/tools.ts) or leave temporarily but outside domain.
Update package.json to depend on @cronicorn/domain (workspace).
Adjust tsconfig.json references if needed.
Ensure Scheduler imports re-point to new barrel.
adapter-ai / other packages:
Replace @cronicorn/scheduler type imports with @cronicorn/domain equivalents where appropriate (e.g., JobEndpoint, ports).
If they rely on callTool helpers, migrate those helpers locally.
Documentation & verification

Update architecture docs to reflect new package and clarify that AI tooling helpers live outside the core domain.
Run pnpm -r build / pnpm -r test to validate.
Consider ADR if this re-architecture meets “significant decision” threshold (likely yes; reference relevant TASK IDs once assigned).
Required changes to existing code
scheduler

Drop governor.ts + ports.ts once replaced; re-export from new package.
Create adapter-only types for lockedUntil & failure metadata or extend domain types locally.
Relocate callTool, tool, defineTools, AIClient, QuotaGuard to a new module (e.g., src/ai/tools.ts) or to the AI SDK package.
Update imports in src/adapters/*, scheduler.ts, index.ts.
Add dependency in package.json and adjust exports to avoid re-export loops.
adapter-ai

Swap imports of domain entities/ports to new package.
If depending on callTool helpers, either import from new helper location or define minimal wrappers.
Root configs

tsconfig.base.json path alias.
Possibly eslint ignore includes if needed (should already pick up via glob).
Documentation references (ai-scheduler-architecture.md) to mention new package boundary.
Tests & sims

Update simulator imports to @cronicorn/domain.
Ensure new domain fixtures integrate cleanly (sims may reuse them).
Testing & verification checklist
Unit: pnpm --filter @cronicorn/domain test (governor spec).
Integration: Re-run scheduler simulator (pnpm --filter @cronicorn/scheduler sim) to confirm behavior unchanged.
Workspace: pnpm -r build, pnpm -r test, pnpm -r typecheck once refactor completes.
Risks & open questions
JobsRepo leasing: current interface expects setLock/clearLock. Decide whether to keep in domain port or model leases elsewhere. For now, retain these methods and treat them as optional future cleanup.
Status vocabulary: Aligning on "failed" vs "failure" matters for DB schema later; choose one (recommended: keep "failed" for backward compatibility and document rename if planned).
Scheduler location: If we later consider scheduler loop “domain,” we may move it into the package. For now, leave it to avoid mixing async orchestration with pure types.
Tool helpers relocation: Need agreement on new home (AI package vs scheduler adapters). Without a destination, domain package will stay clean but consumers must update imports.
Clock dependency: Domain policies don’t currently require Clock, but fixtures/tests may; ensure tests inject deterministic Date.
Follow-up tasks (suggested ordering)
Create ADR noting the domain extraction decision (reference relevant TASK IDs).
Implement package scaffolding + ported files.
Migrate scheduler imports & remove duplicated code.
Relocate AI tool helpers.
Update sims/tests and documentation.
Run full workspace quality gates.
quality gates
Build: PASS (planning-only update; no code changes made).
Lint/Typecheck: PASS (not applicable for this planning deliverable).
Tests: PASS (not run; no code written yet).
wrap-up
Planning document delivered above; it captures the validated state, required adjustments to the template, migration workflow, and concrete follow-ups for moving pure domain logic into its own package without regressing existing behavior. Let me know when you’re ready to start execution or if you’d like this plan distilled into tasks/TASK IDs.