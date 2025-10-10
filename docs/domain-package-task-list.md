# Core Domain Package Implementation Tasks

> Planning checklist to extract the pure scheduler domain into a dedicated `@cronicorn/domain` workspace package. Each task includes an owner placeholder and recommended acceptance criteria. Update status columns as work progresses.

## 1. Decision Record & Planning

- [ ] **Draft ADR for domain extraction**  \
  _Owner:_ <!-- assign -->  \
  _Details:_ Capture motivation, scope, and referenced TASK IDs for moving pure scheduling logic into a standalone package. Link to this task list.  \
  _Done when:_ ADR merged and task IDs created in `.tasks/`.
- [ ] **Map dependencies and consumers**  \
  _Owner:_  \
  _Details:_ Enumerate current consumers of `planNextRun`, `JobEndpoint`, and ports (scheduler, AI adapter, sims). Note any external packages that must be updated.

## 2. Workspace Scaffolding

- [ ] **Create `packages/domain` structure**  \
  _Owner:_  \
  _Details:_ Add `package.json`, `tsconfig.json`, `src/` tree, `tests/` folder per plan. Ensure scripts (`build`, `test`, `typecheck`) point to root toolchain.
- [ ] **Update monorepo tooling**  \
  _Owner:_  \
  _Details:_ Amend `tsconfig.base.json` paths with `@cronicorn/domain/*`, verify `pnpm-workspace.yaml` glob coverage, ensure Turbo sees new package outputs.  \
  _Done when:_ `pnpm -r build` includes new package without failures.

## 3. Domain Source Migration

- [ ] **Port entities to `src/entities.ts`**  \
  _Owner:_  \
  _Details:_ Move `JobEndpoint` and related types from scheduler, removing adapter-only fields (`lockedUntil`, `lastStatus`). Introduce `RunStatus` union based on current usage. Document optional fields vs required defaults.
- [ ] **Define ports in `src/ports.ts`**  \
  _Owner:_  \
  _Details:_ Recreate interfaces for `Clock`, `Cron`, `JobsRepo`, `RunsRepo`, `Dispatcher`, `QuotaGuard` (interface-only). Align method signatures with existing scheduler behavior and mark transitional TODOs (e.g., leasing redesign, status vocabulary).
- [ ] **Relocate `planNextRun` into `src/governor.ts`**  \
  _Owner:_  \
  _Details:_ Copy logic, adjust parameter types, preserve "pause wins", hint TTL, min/max clamping, and "floor to now" behavior. Document `PlanSource` union.
- [ ] **Add domain errors & fixtures**  \
  _Owner:_  \
  _Details:_ Create `errors.ts` (`NotFoundError`, `CronError`, `InvalidStateError`) and `fixtures.ts` (`at()`, `makeEndpoint()`), exporting via barrel.
- [ ] **Create public barrel `src/index.ts`**  \
  _Owner:_  \
  _Details:_ Re-export entities, ports, governor, errors, fixtures for consumers.

## 4. Unit Testing

- [ ] **Author `tests/governor.spec.ts`**  \
  _Owner:_  \
  _Details:_ Use Vitest + fixtures to cover pause precedence, baseline selection, hint expiry, min/max clamping, and candidate-before-now behavior.  \
  _Done when:_ `pnpm --filter @cronicorn/domain test` passes locally.
- [ ] **Set up package-level test tooling**  \
  _Owner:_  \
  _Details:_ Ensure Vitest config auto-discovers tests (root config may already suffice). Add npm script aliases if necessary.

## 5. Scheduler Package Refactor

- [ ] **Replace imports with `@cronicorn/domain`**  \
  _Owner:_  \
  _Details:_ Update `packages/scheduler` to consume new domain exports (`JobEndpoint`, ports, `planNextRun`). Remove redundant type definitions and keep scheduler-specific extensions (`StoredJobEndpoint = JobEndpoint & { lockedUntil?: Date; lastStatus?: ... }`).
- [ ] **Relocate AI tool helpers**  \
  _Owner:_  \
  _Details:_ Move `callTool`, `tool`, `defineTools`, `AIClient`, and related zod dependencies into an adapter-focused module (scheduler adapters or `feature-ai-vercel-sdk`). Replace imports accordingly.
- [ ] **Audit memory store & adapters**  \
  _Owner:_  \
  _Details:_ Update `memory-store.ts` to extend the refined domain types, ensuring leasing fields remain local. Confirm update payloads match new port signatures.
- [ ] **Adjust package metadata**  \
  _Owner:_  \
  _Details:_ Add workspace dependency on `@cronicorn/domain` in scheduler `package.json`; remove now-unused deps (`zod`?) if relocated.

## 6. AI Adapter Updates

- [ ] **Align Vercel AI SDK package with new domain exports**  \
  _Owner:_  \
  _Details:_ Replace imports of scheduler internals with `@cronicorn/domain`. If tool helpers moved here, wire them appropriately.
- [ ] **Verify planner tooling contracts**  \
  _Owner:_  \
  _Details:_ Ensure tools write hints using updated port interfaces (`writeAIHint`, `setNextRunAtIfEarlier`, `setPausedUntil`). Update types/tests as needed.

## 7. Sims & Integration

- [ ] **Update simulator imports**  \
  _Owner:_  \
  _Details:_ Point `packages/scheduler/src/sim` files to the new domain package. Confirm scenario still compiles and runs.
- [ ] **Smoke test flash sale scenario**  \
  _Owner:_  \
  _Details:_ Run `pnpm --filter @cronicorn/scheduler sim` (or equivalent) to verify behavior unchanged; capture diff in log output if any.

## 8. Documentation & Communication

- [ ] **Refresh architecture docs**  \
  _Owner:_  \
  _Details:_ Update `docs/ai-scheduler-architecture.md` and related diagrams to reflect the dedicated domain package boundary and new helper locations.
- [ ] **Add README section for `@cronicorn/domain`**  \
  _Owner:_  \
  _Details:_ Document package purpose, exports, and how other packages should depend on it.
- [ ] **Coordinate release notes / changeset**  \
  _Owner:_  \
  _Details:_ Add changeset entry summarizing the extraction and any breaking type changes (e.g., status union).

## 9. Validation & Rollout

- [ ] **Run workspace quality gates**  \
  _Owner:_  \
  _Details:_ Execute `pnpm -r build`, `pnpm -r test`, `pnpm -r typecheck`, ensuring new package participates.
- [ ] **Publish or tag packages**  \
  _Owner:_  \
  _Details:_ If packages are versioned, update versions and publish/tag once tests pass.
- [ ] **Post-merge follow-up**  \
  _Owner:_  \
  _Details:_ Monitor CI, update `.tasks/` statuses, and flag any downstream repos that must upgrade.

---

### Optional Enhancements

- [ ] **Explore lease abstraction improvements** (e.g., move `setLock/clearLock` into dedicated adapter contract).  \
  _Owner:_  \
  _Notes:_ Consider a follow-up ADR.
- [ ] **Add timeout/run cancellation status support** once domain consumers need it.  \
  _Owner:_
