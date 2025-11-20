# ADR-0050: Dynamic JSON Body Templates for Endpoints

**Date:** 2025-11-20  
**Status:** Accepted

## Context

Cronicorn's AI scheduler adapts execution timing based on endpoint responses, but the request bodies sent to endpoints were always static. This limitation prevented several important use cases:

### Motivating Use Cases

1. **Status Reporting Endpoints**: An endpoint that posts system status to a monitoring service needs to send different status values ("healthy", "degraded", "critical") based on observations from other endpoints.

2. **Data-Driven API Calls**: An endpoint that triggers actions based on metrics from sibling endpoints (e.g., "start processing" when queue depth reaches threshold).

3. **Coordinated Workflows**: Multi-endpoint pipelines where one endpoint's response determines the next endpoint's request body (e.g., ETL pipelines, deployment orchestration).

4. **Dynamic Configuration Updates**: Endpoints that update remote configuration based on current system state observed by monitoring endpoints.

The problem: **How do we enable AI-controlled, data-driven request bodies while maintaining type safety, security, and backward compatibility?**

## Decision

**Implement a template-based system with three-tier priority for body resolution:**

1. **Body Templates** - User-defined templates with placeholders
2. **AI Body Hints** - AI-proposed resolved values (TTL-based)
3. **Static bodyJson** - Original static bodies (backward compatible)

### Core Components

#### 1. Template Syntax

We chose a **JSONPath-like syntax** with explicit delimiters:

```json
{
  "status": "{{$.self.latestResponse.health_status}}",
  "priority": "{{$.siblings['monitoring-endpoint'].latestResponse.priority_level}}",
  "timestamp": "{{$.now}}",
  "message": "Status is {{$.self.latestResponse.status}} at {{$.now}}"
}
```

**Supported Expressions:**
- `$.self.latestResponse.field` - Access this endpoint's latest response
- `$.siblings['endpoint-name'].latestResponse.field` - Access sibling endpoint responses
- `$.now` - Current ISO timestamp
- String interpolation with multiple templates in one string

**Why JSONPath-like?**
- **Familiar** - Developers know JSONPath from tools like jq, kubectl
- **Read-only** - No mutations, only data access
- **Predictable** - Clear scope of what can be accessed
- **No Code Execution** - Safe from injection attacks

#### 2. Domain Model Extensions

Added to `JobEndpoint` entity:

```typescript
export type JobEndpoint = {
  // ... existing fields ...
  
  // Static body (backward compatible)
  bodyJson?: JsonValue;
  
  // Dynamic body template (new)
  bodyTemplate?: JsonValue;
  bodyTemplateSchema?: JsonValue; // JSON Schema for validation
  
  // AI hints for resolved body (TTL-scoped)
  aiHintBodyResolved?: JsonValue;
  aiHintBodyExpiresAt?: Date;
  aiHintBodyReason?: string;
};
```

#### 3. Body Resolution Priority

**Scheduler resolution logic** (packages/domain/src/template/body-resolver.ts):

```typescript
export async function resolveEndpointBody(
  endpoint: JobEndpoint,
  runs: RunsRepo,
  now: Date,
): Promise<JsonValue | undefined> {
  // Priority 1: AI body hint (if not expired)
  if (endpoint.aiHintBodyResolved && endpoint.aiHintBodyExpiresAt > now) {
    return endpoint.aiHintBodyResolved;
  }

  // Priority 2: Body template (evaluate with context)
  if (endpoint.bodyTemplate) {
    const context = await buildTemplateContext(endpoint, runs, now);
    const result = evaluateBodyTemplate(endpoint.bodyTemplate, context);
    if (result.success) return result.value;
  }

  // Priority 3: Static bodyJson (fallback)
  return endpoint.bodyJson;
}
```

**Why this priority order?**
- **AI hints override templates** - Allows AI to correct or optimize specific values
- **Templates provide baseline** - User defines structure, AI fills dynamic values
- **Static fallback** - Existing endpoints continue working unchanged

#### 4. AI Tool: `propose_body_values`

Added to AI planner tool set:

```typescript
propose_body_values: tool({
  description: "Set dynamic body values for the next endpoint execution based on response data",
  schema: z.object({
    bodyValues: z.any().describe("Resolved body values to send"),
    ttlMinutes: z.number().positive().default(30),
    reason: z.string().optional(),
  }),
  execute: async (args) => {
    await jobs.writeAIBodyHint(endpointId, {
      resolvedBody: args.bodyValues,
      expiresAt: new Date(now.getTime() + args.ttlMinutes * 60 * 1000),
      reason: args.reason,
    });
  },
});
```

**When AI uses this:**
- Observes response data from this endpoint or siblings
- Determines appropriate body values based on current system state
- Sets resolved values with TTL (auto-expires like other hints)
- Provides reasoning for debugging/observability

#### 5. Template Evaluator

**Pure function** (packages/domain/src/template/evaluator.ts):

```typescript
export function evaluateBodyTemplate(
  template: JsonValue,
  context: TemplateContext,
): EvaluationResult
```

**Features:**
- Recursive evaluation (handles nested objects/arrays)
- Type preservation (numbers stay numbers, booleans stay booleans)
- String interpolation (`"Status: {{$.value}} at {{$.now}}"`)
- Graceful degradation (missing fields return unchanged template)
- Zero dependencies (pure TypeScript)

## Database Schema Changes

Migration: `0017_dynamic_body_templates.sql`

```sql
-- Template fields
ALTER TABLE "job_endpoints" ADD COLUMN "body_template" jsonb;
ALTER TABLE "job_endpoints" ADD COLUMN "body_template_schema" jsonb;

-- AI hint fields
ALTER TABLE "job_endpoints" ADD COLUMN "ai_hint_body_resolved" jsonb;
ALTER TABLE "job_endpoints" ADD COLUMN "ai_hint_body_expires_at" timestamp;
ALTER TABLE "job_endpoints" ADD COLUMN "ai_hint_body_reason" text;
```

**Storage considerations:**
- JSONB for efficient querying (if needed in future)
- Nullable - existing endpoints unaffected
- No indexes initially (templates evaluated at execution time)

## Consequences

### Positive

1. **Enables New Use Cases**
   - Status reporting with dynamic values
   - Data-driven API orchestration
   - Multi-endpoint coordination
   - Configuration updates based on system state

2. **Maintains Backward Compatibility**
   - Existing endpoints with `bodyJson` work unchanged
   - Migration is additive (no breaking changes)
   - Zero impact on endpoints not using templates

3. **Security**
   - No code execution - only data access
   - Read-only templates (no mutations)
   - Limited scope (self, siblings, now)
   - No arbitrary code injection possible

4. **Observability**
   - AI provides reasoning for body values
   - TTL-based hints auto-expire
   - Template evaluation logged in scheduler
   - Clear priority order for debugging

5. **Type Safety**
   - JSON Schema validation (bodyTemplateSchema)
   - Type-preserving evaluation
   - Compile-time checks in TypeScript

6. **Testability**
   - Pure functions (no I/O in evaluator)
   - 20 unit tests covering edge cases
   - Mockable dependencies (RunsRepo)
   - Integration-testable with in-memory repos

### Negative

1. **Complexity**
   - New concepts for users to learn (template syntax)
   - More moving parts in scheduler execution path
   - Potential for confusing debugging if templates misbehave

   **Mitigation:**
   - Clear documentation with examples
   - Template evaluation errors logged
   - Fallback to static body on evaluation failure

2. **Performance**
   - Additional RunsRepo queries for context building
   - Template evaluation overhead per execution

   **Mitigation:**
   - Context queries cached in single database round-trip
   - Evaluator is lightweight (no parser, just string replacement)
   - AI hints bypass template evaluation entirely

3. **Template Limitations**
   - No conditional logic in templates (`if/else`)
   - No arithmetic operations
   - No array transformations

   **Mitigation:**
   - AI can compute complex logic and use `propose_body_values`
   - Templates are for structure, AI for logic
   - Keep templates simple and maintainable

4. **Schema Validation Not Implemented**
   - `bodyTemplateSchema` field exists but not enforced yet

   **Future Work:**
   - Implement JSON Schema validation in body resolver
   - Validate before sending request
   - Provide clear error messages on validation failure

### Affected Code

**Modified Files:**
- `packages/domain/src/entities/endpoint.ts` - Entity definition
- `packages/adapter-drizzle/src/schema.ts` - Database schema
- `packages/adapter-drizzle/src/jobs-repo.ts` - Drizzle implementation
- `packages/domain/src/fixtures/in-memory-jobs-repo.ts` - In-memory implementation
- `packages/domain/src/ports/repos.ts` - JobsRepo port
- `packages/worker-scheduler/src/domain/scheduler.ts` - Body resolution before execution
- `packages/worker-ai-planner/src/tools.ts` - New AI tool

**New Files:**
- `packages/domain/src/template/evaluator.ts` - Template evaluation engine
- `packages/domain/src/template/body-resolver.ts` - Body resolution logic
- `packages/domain/src/template/types.ts` - Template context types
- `packages/domain/src/template/__tests__/evaluator.test.ts` - Unit tests (20 tests)
- `packages/adapter-drizzle/migrations/0017_dynamic_body_templates.sql` - Migration

**Test Updates:**
- `packages/services/src/dashboard/__tests__/manager.test.ts` - Added mock
- `packages/services/src/jobs/__tests__/manager.test.ts` - Added mock
- `packages/services/src/subscriptions/__tests__/manager.test.ts` - Added mock

## Examples

### Example 1: Status Reporting

**Scenario:** Endpoint posts system health to monitoring service.

**Template:**
```json
{
  "service": "payment-processor",
  "status": "{{$.self.latestResponse.status}}",
  "error_count": "{{$.self.latestResponse.errors}}",
  "timestamp": "{{$.now}}"
}
```

**Context (self response):**
```json
{
  "status": "degraded",
  "errors": 12,
  "latency_p99": 450
}
```

**Resolved Body:**
```json
{
  "service": "payment-processor",
  "status": "degraded",
  "error_count": 12,
  "timestamp": "2025-11-20T10:30:00Z"
}
```

### Example 2: Coordinated Workflow

**Scenario:** Data processor endpoint needs to know if upstream data fetch is ready.

**Template:**
```json
{
  "action": "process",
  "data_source": "{{$.siblings['data-fetcher'].latestResponse.source_id}}",
  "records_available": "{{$.siblings['data-fetcher'].latestResponse.record_count}}",
  "priority": "high"
}
```

**Context (sibling response from "data-fetcher"):**
```json
{
  "source_id": "src-12345",
  "record_count": 1500,
  "status": "ready"
}
```

**Resolved Body:**
```json
{
  "action": "process",
  "data_source": "src-12345",
  "records_available": 1500,
  "priority": "high"
}
```

### Example 3: AI Override

**Scenario:** AI observes critical situation and overrides template with specific values.

**User Template:**
```json
{
  "status": "{{$.self.latestResponse.status}}",
  "action": "monitor"
}
```

**AI Observes:** Error rate > 50%, decides to escalate.

**AI Calls:** `propose_body_values`
```json
{
  "bodyValues": {
    "status": "critical",
    "action": "page_on_call"
  },
  "ttlMinutes": 15,
  "reason": "Error rate exceeded 50% threshold (62 errors in last 5 mins)"
}
```

**Resolved Body:** Uses AI hint (overrides template)
```json
{
  "status": "critical",
  "action": "page_on_call"
}
```

## Alternatives Considered

### Option A: Code Execution (JavaScript/Python)

Allow users to write code snippets for body generation.

**Rejected because:**
- Security nightmare (arbitrary code execution)
- Sandboxing is complex and error-prone
- Hard to debug and maintain
- Violates principle of declarative configuration

### Option B: Hardcoded AI Logic per Endpoint Type

Build specialized AI analyzers for different endpoint types.

**Rejected because:**
- Not flexible - requires code changes for new patterns
- Doesn't scale to diverse use cases
- Users can't customize behavior
- Tight coupling between AI and endpoint types

### Option C: External Templating Engine (Handlebars, Mustache)

Use existing templating library.

**Rejected because:**
- Over-engineered for our needs (we just need data access)
- Adds dependency
- Requires learning full templating language
- Potential for Turing-complete complexity

### Option D: GraphQL-like Query Language

Define queries to fetch data, then build body.

**Rejected because:**
- Too complex for simple data access
- Requires query parser and executor
- Overkill for this use case
- Learning curve too steep

## Future Enhancements

### Phase 2: API Contracts & UI (Remaining Work)

- [ ] Add `bodyTemplate` and `bodyTemplateSchema` to API contracts
- [ ] UI template editor with syntax highlighting
- [ ] Template preview with example data
- [ ] Display resolved body values in run history

### Phase 3: JSON Schema Validation

- [ ] Implement validation in body resolver
- [ ] Validate resolved body against `bodyTemplateSchema`
- [ ] Clear error messages on validation failure
- [ ] Schema editor in UI

### Phase 4: Advanced Template Features (If Needed)

- [ ] Conditional expressions: `{{$.value > 10 ? 'high' : 'low'}}`
- [ ] Array operations: `{{$.array | length}}`
- [ ] String operations: `{{$.text | uppercase}}`
- [ ] Date formatting: `{{$.now | format('YYYY-MM-DD')}}`

**Note:** Only add if clear user demand. Keep templates simple by default.

## References

**Related ADRs:**
- ADR-0019: AI Query Tools for Response Data Access (foundation for this work)
- ADR-0002: Hexagonal Architecture Principles (ports/adapters pattern)
- ADR-0018: Decoupled AI Worker Architecture (AI tools pattern)

**Design Inspirations:**
- JSONPath (RFC 9535) - Path syntax
- Handlebars/Mustache - Delimiter syntax (`{{...}}`)
- Kubernetes - Declarative templates
- GitHub Actions - Interpolation syntax

**Testing:**
- 20 unit tests for template evaluator
- 100% coverage of core template logic
- Edge cases handled (missing fields, nested structures, type preservation)
