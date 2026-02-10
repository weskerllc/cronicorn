# Jira Tasks: Dynamic Body Schema Feature

## Epic: Dynamic Body Schema - AI-Powered Request Body Population

**Epic Description:** Enable endpoints to define a body schema with natural language descriptions that the AI agent uses to dynamically populate request bodies based on context (last run time, previous responses, etc.).

---

## Phase 1: Database & Domain Foundation

### CRON-001: Create database migration for dynamic body schema columns
**Type:** Task
**Story Points:** 2
**Dependencies:** None

**Description:**
Add new columns to the `job_endpoints` table to support AI-populated request bodies.

**Acceptance Criteria:**
- [ ] Migration file created at `packages/adapter-drizzle/migrations/0021_dynamic_body_schema.sql`
- [ ] Columns added:
  - `body_schema JSONB` - Optional example structure for AI
  - `body_description TEXT` - Natural language instructions
  - `ai_body JSONB` - AI-populated body values
  - `ai_body_expires_at TIMESTAMP WITH TIME ZONE` - TTL for AI body
  - `ai_body_reason TEXT` - AI's explanation for chosen values
- [ ] Partial index created on `ai_body_expires_at WHERE ai_body_expires_at IS NOT NULL`
- [ ] Migration runs successfully with `pnpm db:migrate`

---

### CRON-002: Update Drizzle schema with dynamic body columns
**Type:** Task
**Story Points:** 1
**Dependencies:** CRON-001

**Description:**
Update the Drizzle ORM schema definition to include the new columns.

**Acceptance Criteria:**
- [ ] `packages/adapter-drizzle/src/schema.ts` updated with all 5 new columns on `jobEndpoints` table
- [ ] Columns use correct types: `jsonb()`, `text()`, `timestamp()`
- [ ] Index definition added for `aiBodyExpiresAt`
- [ ] Types exported correctly (`JobEndpointRow` includes new fields)
- [ ] `pnpm build:packages` succeeds

---

### CRON-003: Extend JobEndpoint domain entity
**Type:** Task
**Story Points:** 1
**Dependencies:** None

**Description:**
Add new fields to the `JobEndpoint` type in the domain layer.

**Acceptance Criteria:**
- [ ] `packages/domain/src/entities/endpoint.ts` updated with:
  - `bodySchema?: JsonValue`
  - `bodyDescription?: string`
  - `aiBody?: JsonValue`
  - `aiBodyExpiresAt?: Date`
  - `aiBodyReason?: string`
- [ ] Fields are optional (backwards compatible)
- [ ] `pnpm build:packages` succeeds

---

### CRON-004: Add writeAiBody and clearAiBody to JobsRepo port
**Type:** Task
**Story Points:** 1
**Dependencies:** CRON-003

**Description:**
Define the repository interface methods for AI body operations.

**Acceptance Criteria:**
- [ ] `packages/domain/src/ports/repos.ts` updated with:
  ```typescript
  writeAiBody: (id: string, body: {
    value: JsonValue;
    expiresAt: Date;
    reason?: string;
  }) => Promise<void>;
  clearAiBody: (id: string) => Promise<void>;
  ```
- [ ] Methods added in the "AI steering" section of `JobsRepo` type
- [ ] `pnpm build:packages` succeeds

---

### CRON-005: Implement writeAiBody and clearAiBody in DrizzleJobsRepo
**Type:** Task
**Story Points:** 2
**Dependencies:** CRON-002, CRON-004

**Description:**
Implement the AI body repository methods in the Drizzle adapter.

**Acceptance Criteria:**
- [ ] `packages/adapter-drizzle/src/jobs-repo.ts` implements `writeAiBody()`:
  - Sets `aiBody`, `aiBodyExpiresAt`, `aiBodyReason`
- [ ] `clearAiBody()` implemented:
  - Sets all three AI body fields to `null`
- [ ] `rowToEntity()` updated to map new columns to domain entity
- [ ] `updateEndpoint()` handles `bodySchema` and `bodyDescription` in patch
- [ ] Unit tests pass

---

## Phase 2: Scheduler Integration

### CRON-006: Implement body resolution logic in scheduler
**Type:** Task
**Story Points:** 3
**Dependencies:** CRON-005

**Description:**
Update the scheduler to resolve the effective request body before dispatching.

**Acceptance Criteria:**
- [ ] `packages/worker-scheduler/src/domain/scheduler.ts` updated
- [ ] New private method `resolveEffectiveBody(ep, now)` that returns:
  - `effectiveEndpoint` with resolved `bodyJson`
  - `bodySource` as `"ai" | "static" | "none"`
- [ ] Priority order: Fresh AI body > static bodyJson > no body
- [ ] AI body is "fresh" if `aiBodyExpiresAt > now`
- [ ] `handleEndpoint()` uses resolved body for dispatch
- [ ] Debug logging includes `bodySource`
- [ ] Existing behavior unchanged when no AI body present

---

### CRON-007: Write scheduler body resolution tests
**Type:** Task
**Story Points:** 3
**Dependencies:** CRON-006

**Description:**
Write integration tests for the scheduler's body resolution logic.

**Acceptance Criteria:**
- [ ] Test: AI body takes precedence when fresh (not expired)
- [ ] Test: Falls back to static `bodyJson` when AI body expired
- [ ] Test: Falls back to static `bodyJson` when no AI body set
- [ ] Test: No body sent when neither AI body nor static body configured
- [ ] Tests use transaction-per-test pattern
- [ ] All tests pass with `pnpm test`

---

## Phase 3: AI Planner Integration

### CRON-008: Add set_body tool to AI Planner
**Type:** Task
**Story Points:** 3
**Dependencies:** CRON-005

**Description:**
Add a new tool that allows the AI to set dynamic request bodies.

**Acceptance Criteria:**
- [ ] `packages/worker-ai-planner/src/tools.ts` updated with `set_body` tool:
  ```typescript
  set_body: tool({
    description: "Set the request body for the next execution(s)...",
    schema: z.object({
      body: z.record(z.string(), z.unknown()),
      ttlMinutes: z.number().positive().default(60),
      reason: z.string().optional(),
    }),
    execute: async (args) => {
      await jobs.writeAiBody(endpointId, {
        value: args.body,
        expiresAt: new Date(now + args.ttlMinutes * 60 * 1000),
        reason: args.reason,
      });
      return `Set request body (expires in ${args.ttlMinutes} minutes)`;
    },
  })
  ```
- [ ] Tool properly scoped to current endpoint via closure

---

### CRON-009: Add clear_body tool to AI Planner
**Type:** Task
**Story Points:** 1
**Dependencies:** CRON-008

**Description:**
Add a tool that allows the AI to clear AI-set body and revert to static config.

**Acceptance Criteria:**
- [ ] `clear_body` tool added to `tools.ts`:
  ```typescript
  clear_body: tool({
    description: "Clear AI-set body, reverting to static bodyJson",
    schema: z.object({}),
    execute: async () => {
      await jobs.clearAiBody(endpointId);
      return "Cleared AI body, will use static bodyJson";
    },
  })
  ```

---

### CRON-010: Update AI prompt builder with body schema context
**Type:** Task
**Story Points:** 3
**Dependencies:** CRON-008

**Description:**
Update the AI analysis prompt to include body schema information when present.

**Acceptance Criteria:**
- [ ] `packages/worker-ai-planner/src/planner.ts` `buildAnalysisPrompt()` updated
- [ ] When endpoint has `bodyDescription`, include in prompt:
  - Show `bodySchema` (if present)
  - Show `bodyDescription`
  - Show current `aiBody` status (if active)
  - Instruct AI to use `set_body` when dynamic body needed
- [ ] Context includes: `lastRunAt`, `lastResponseBody`, current time
- [ ] Tool documentation section updated to list `set_body` and `clear_body`

---

### CRON-011: Write AI tool tests for body tools
**Type:** Task
**Story Points:** 2
**Dependencies:** CRON-009

**Description:**
Write unit tests for the `set_body` and `clear_body` tools.

**Acceptance Criteria:**
- [ ] Test: `set_body` writes correct values to repo
- [ ] Test: `set_body` calculates expiry correctly from TTL
- [ ] Test: `clear_body` clears all AI body fields
- [ ] Tests use mocked `JobsRepo`
- [ ] All tests pass

---

## Phase 4: API Contracts

### CRON-012: Update endpoint API schemas
**Type:** Task
**Story Points:** 2
**Dependencies:** CRON-003

**Description:**
Update API contracts to support body schema fields.

**Acceptance Criteria:**
- [ ] `packages/api-contracts/src/jobs/schemas.ts` updated
- [ ] Request schemas include:
  - `bodySchema: z.any().optional()`
  - `bodyDescription: z.string().max(2000).optional()`
- [ ] Response schema includes (read-only):
  - `aiBody`, `aiBodyExpiresAt`, `aiBodyReason`
- [ ] Both `AddEndpointRequestSchema` and `UpdateEndpointRequestSchema` updated
- [ ] `EndpointResponseSchema` includes new fields
- [ ] `pnpm build:packages` succeeds

---

### CRON-013: Update API handlers for body schema
**Type:** Task
**Story Points:** 1
**Dependencies:** CRON-012

**Description:**
Ensure API handlers pass through body schema fields correctly.

**Acceptance Criteria:**
- [ ] Create endpoint handler passes `bodySchema` and `bodyDescription`
- [ ] Update endpoint handler passes `bodySchema` and `bodyDescription`
- [ ] Get endpoint response includes all body schema fields
- [ ] Manual test: Create endpoint with body schema, verify stored correctly

---

## Phase 5: Web UI

### CRON-014: Add Dynamic Body section to endpoint create form
**Type:** Task
**Story Points:** 3
**Dependencies:** CRON-012

**Description:**
Add UI fields for body schema configuration when creating endpoints.

**Acceptance Criteria:**
- [ ] `apps/web/src/routes/_authed/jobs.$jobId.endpoints.new.tsx` updated
- [ ] New "Dynamic Body" section with:
  - Textarea for `bodySchema` (optional JSON example) with JSON validation
  - Textarea for `bodyDescription` (natural language instructions)
- [ ] Help text: "Describe what the request body should contain. The AI will populate it based on context."
- [ ] Fields are optional
- [ ] Form submits correctly with new fields

---

### CRON-015: Add body schema fields to endpoint edit form
**Type:** Task
**Story Points:** 2
**Dependencies:** CRON-014

**Description:**
Add the same Dynamic Body fields to the endpoint edit form.

**Acceptance Criteria:**
- [ ] `apps/web/src/routes/_authed/endpoints.$id.edit.tsx` updated
- [ ] Same fields as create form
- [ ] Fields pre-populated with existing values
- [ ] Updates save correctly

---

### CRON-016: Update endpoint detail view with body schema info
**Type:** Task
**Story Points:** 2
**Dependencies:** CRON-012

**Description:**
Show body schema configuration and current AI body status on endpoint detail page.

**Acceptance Criteria:**
- [ ] Endpoint detail view shows:
  - `bodySchema` (formatted JSON) if present
  - `bodyDescription` if present
  - Current `aiBody` with expiry time if active
  - `aiBodyReason` if present
- [ ] Clear visual distinction between static and AI-populated body
- [ ] Expiry shown in human-readable format (e.g., "Expires in 45 minutes")

---

## Phase 6: Testing & Documentation

### CRON-017: Write E2E test for AI body population flow
**Type:** Task
**Story Points:** 5
**Dependencies:** CRON-010, CRON-013

**Description:**
Write end-to-end test verifying the complete AI body flow.

**Acceptance Criteria:**
- [ ] E2E test in `apps/e2e/tests/`:
  1. Create endpoint with `bodyDescription`
  2. Trigger AI analysis (or wait for cycle)
  3. Verify AI calls `set_body` (check AI session logs)
  4. Trigger endpoint execution
  5. Verify AI body used in request (mock endpoint or check logs)
- [ ] Test passes with `pnpm test:e2e`

---

### CRON-018: Write E2E test for body fallback behavior
**Type:** Task
**Story Points:** 3
**Dependencies:** CRON-017

**Description:**
Test that scheduler falls back to static body when AI body expires.

**Acceptance Criteria:**
- [ ] E2E test:
  1. Create endpoint with both static `bodyJson` and `bodyDescription`
  2. Set AI body with short TTL
  3. Wait for AI body to expire
  4. Trigger execution
  5. Verify static body used (not expired AI body)
- [ ] Test passes

---

### CRON-019: Create ADR for Dynamic Body Schema feature
**Type:** Task
**Story Points:** 2
**Dependencies:** None (can be done in parallel)

**Description:**
Document the architectural decision for the dynamic body schema feature.

**Acceptance Criteria:**
- [ ] ADR created at `.adr/00XX-dynamic-body-schema.md`
- [ ] Documents:
  - Context: Why we need dynamic body population
  - Decision: AI-first approach with natural language descriptions
  - Alternatives considered (templating, variables)
  - Consequences (pros/cons)
  - Body resolution priority order
- [ ] Follows existing ADR format

---

## Task Summary

| Phase | Tasks | Total Points |
|-------|-------|--------------|
| Phase 1: Database & Domain | CRON-001 to CRON-005 | 7 |
| Phase 2: Scheduler | CRON-006 to CRON-007 | 6 |
| Phase 3: AI Planner | CRON-008 to CRON-011 | 9 |
| Phase 4: API | CRON-012 to CRON-013 | 3 |
| Phase 5: Web UI | CRON-014 to CRON-016 | 7 |
| Phase 6: Testing & Docs | CRON-017 to CRON-019 | 10 |
| **Total** | **19 tasks** | **42 points** |

---

## Dependency Graph

```
CRON-001 → CRON-002 → CRON-005
                  ↘
CRON-003 → CRON-004 → CRON-005 → CRON-006 → CRON-007
                          ↓
                    CRON-008 → CRON-009 → CRON-011
                          ↓
                    CRON-010 → CRON-017 → CRON-018

CRON-003 → CRON-012 → CRON-013 → CRON-017
                ↓
          CRON-014 → CRON-015
                ↓
          CRON-016

CRON-019 (independent - can run in parallel)
```

---

## Suggested Sprint Breakdown

### Sprint 1: Foundation (13 points)
- CRON-001, CRON-002, CRON-003, CRON-004, CRON-005
- CRON-006, CRON-007

### Sprint 2: AI & API (12 points)
- CRON-008, CRON-009, CRON-010, CRON-011
- CRON-012, CRON-013

### Sprint 3: UI & Testing (17 points)
- CRON-014, CRON-015, CRON-016
- CRON-017, CRON-018, CRON-019
