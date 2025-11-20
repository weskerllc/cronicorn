# ADR-0051: JSON Schema-Driven Body Generation (Supersedes ADR-0050)

**Date:** 2025-11-20  
**Status:** Accepted (Supersedes ADR-0050)

## Context

ADR-0050 implemented dynamic body templates using a custom `{{...}}` syntax. After review, this approach had significant limitations:

**Problems with Custom Template Syntax:**
1. **Not industry-standard** - AI agents don't inherently know our custom `{{$.path}}` syntax
2. **No standard validation** - Required building custom validators
3. **Limited AI integration** - AI had to learn our syntax instead of using familiar tools
4. **Form validation challenges** - No existing libraries to validate template syntax in UIs

**User Feedback:**
> "I think i would prefer to use json schema. Where a json schema can be provided - with natural language descriptions of each field - etc. That an ai agent can interpret how to 'populate' a body that meets the schema."

This aligns with industry standards:
- **OpenAI, Anthropic, LangChain** - All use JSON Schema for tool definitions
- **AI agents already understand JSON Schema** - It's part of their training
- **Standard validators exist** - JSON Schema has validators in every language
- **Form validation** - Extensive tooling (React JSON Schema Form, etc.)

## Decision

**Replace custom template syntax with JSON Schema-driven body generation:**

1. **Users provide a JSON Schema** (`bodySchema`) describing the request body structure
2. **AI observes endpoint responses** and generates bodies conforming to the schema
3. **Schema includes natural language descriptions** that guide AI decisions
4. **Standard JSON Schema validation** ensures conformance

### Example

**Before (ADR-0050 - Custom Template Syntax):**
```json
{
  "bodyTemplate": {
    "status": "{{$.self.latestResponse.status}}",
    "priority": "{{$.siblings['monitoring'].latestResponse.priority}}"
  }
}
```

**After (ADR-0051 - JSON Schema):**
```json
{
  "bodySchema": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": ["healthy", "degraded", "critical"],
        "description": "Current system health status. Use 'critical' if error rate > 50%, 'degraded' if > 10%, otherwise 'healthy'. Check self.latestResponse.error_rate"
      },
      "priority": {
        "type": "string",
        "enum": ["low", "normal", "high", "critical"],
        "description": "Alert priority level based on monitoring endpoint. Read siblings['monitoring'].latestResponse.priority_level"
      },
      "timestamp": {
        "type": "string",
        "format": "date-time",
        "description": "Current timestamp in ISO 8601 format"
      }
    },
    "required": ["status", "priority"]
  }
}
```

**AI generates body:**
```json
{
  "status": "critical",
  "priority": "high",
  "timestamp": "2025-11-20T10:30:00Z"
}
```

## Implementation Changes

### 1. Domain Model

**Removed:**
- `bodyTemplate` field (was for template strings)
- `BodyTemplate` type
- `TemplateExpression` type

**Added/Renamed:**
- `bodySchema` field (JSON Schema describing body structure)
- `BodySchema` type

**Kept:**
- `aiHintBodyResolved` (AI-generated body)
- `aiHintBodyExpiresAt` (TTL for generated body)
- `aiHintBodyReason` (AI's reasoning)

### 2. Database Schema

**Migration 0018:**
```sql
-- Drop body_template column (no longer used)
ALTER TABLE "job_endpoints" DROP COLUMN IF EXISTS "body_template";

-- Rename body_template_schema to body_schema
ALTER TABLE "job_endpoints" RENAME COLUMN "body_template_schema" TO "body_schema";
```

### 3. Body Resolution

**Simplified logic** (no template evaluation needed):

```typescript
export async function resolveEndpointBody(
  endpoint: JobEndpoint,
  runs: RunsRepo,
  now: Date,
): Promise<JsonValue | undefined> {
  // Priority 1: AI-generated body (if not expired)
  if (endpoint.aiHintBodyResolved && endpoint.aiHintBodyExpiresAt > now) {
    return endpoint.aiHintBodyResolved;
  }

  // Priority 2: Static bodyJson (fallback)
  return endpoint.bodyJson;
}
```

**No more template evaluation** - AI does all the work.

### 4. AI Tool Updates

**Updated `propose_body_values` tool:**

```typescript
propose_body_values: tool({
  description: "Generate a request body based on observations. The endpoint has a bodySchema (JSON Schema) describing expected structure and field meanings. Observe response data, then generate a conforming body.",
  schema: z.object({
    bodyValues: z.any().describe("Generated body. Must conform to bodySchema. Use field descriptions to determine values."),
    ttlMinutes: z.number().positive().default(30),
    reason: z.string().optional().describe("What you observed and why you chose these values"),
  }),
  execute: async (args) => {
    await jobs.writeAIBodyHint(endpointId, {
      resolvedBody: args.bodyValues,
      expiresAt: new Date(now.getTime() + args.ttlMinutes * 60 * 1000),
      reason: args.reason,
    });
  },
})
```

## Consequences

### Positive

1. **Industry Standard**
   - AI agents already know JSON Schema (OpenAI, Anthropic use it)
   - No custom syntax to learn or validate
   - Extensive tooling ecosystem

2. **Better AI Integration**
   - Natural language descriptions guide AI decisions
   - AI can use standard JSON Schema validation
   - Familiar tool for all modern AI frameworks

3. **Simpler Implementation**
   - No template parser needed
   - No custom evaluator logic
   - Fewer lines of code to maintain

4. **Form Validation**
   - React JSON Schema Form for UI
   - Standard validators (ajv, joi, etc.)
   - Better error messages

5. **Flexibility**
   - AI can use complex logic (not limited by template syntax)
   - Descriptions can include conditional logic instructions
   - AI can adapt based on observations

### Negative

1. **AI Dependency**
   - User can't directly control values (AI generates them)
   - Requires AI to be active for dynamic bodies
   - **Mitigation:** Static `bodyJson` always works as fallback

2. **Description Quality**
   - Poor descriptions = poor AI decisions
   - Users must write clear instructions
   - **Mitigation:** Provide templates and examples

3. **No Deterministic Templates**
   - Can't guarantee same input → same output
   - AI might make different decisions each time
   - **Mitigation:** AI reasoning logged, TTL limits variability

### Comparison to ADR-0050

| Aspect | ADR-0050 (Templates) | ADR-0051 (JSON Schema) |
|--------|----------------------|------------------------|
| **Syntax** | Custom `{{...}}` | JSON Schema (standard) |
| **Validation** | Custom parser needed | Standard validators |
| **AI Knowledge** | Must learn syntax | Already knows it |
| **Control** | Deterministic | AI-driven |
| **Complexity** | Template evaluator | Just AI generation |
| **Form UI** | Custom builder | Standard form libraries |
| **Industry Use** | Novel | OpenAI, Anthropic, etc. |

## Migration Path

**For Phase 2 (API & UI):**

1. **API accepts both `bodyJson` and `bodySchema`**
   - `bodyJson` - Static body (works immediately)
   - `bodySchema` - JSON Schema (AI generates bodies)

2. **UI provides JSON Schema editor**
   - Visual editor for schema (React JSON Schema Form)
   - Example schemas for common patterns
   - Schema validation before save

3. **AI Planner reads `bodySchema`**
   - Includes schema in endpoint context
   - AI uses descriptions to guide generation
   - Validates generated body against schema

## Examples

### Example 1: Status Reporting

**User provides schema:**
```json
{
  "type": "object",
  "properties": {
    "service": {
      "type": "string",
      "const": "payment-processor",
      "description": "Service name (fixed value)"
    },
    "status": {
      "type": "string",
      "enum": ["healthy", "degraded", "critical"],
      "description": "Health status based on error rate from self.latestResponse.error_rate: <5% = healthy, 5-20% = degraded, >20% = critical"
    },
    "error_count": {
      "type": "integer",
      "description": "Total errors from self.latestResponse.errors"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": ["service", "status", "error_count", "timestamp"]
}
```

**AI observes:**
- `self.latestResponse.error_rate = 0.15` (15%)
- `self.latestResponse.errors = 42`

**AI generates:**
```json
{
  "service": "payment-processor",
  "status": "degraded",
  "error_count": 42,
  "timestamp": "2025-11-20T10:30:00Z"
}
```

### Example 2: ETL Coordination

**User provides schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "const": "process"
    },
    "source_file": {
      "type": "string",
      "description": "File path from siblings['data-fetcher'].latestResponse.file_path"
    },
    "record_count": {
      "type": "integer",
      "description": "Number of records from siblings['data-fetcher'].latestResponse.records"
    },
    "checksum": {
      "type": "string",
      "description": "File checksum from siblings['data-fetcher'].latestResponse.checksum"
    }
  },
  "required": ["action", "source_file", "record_count", "checksum"]
}
```

**AI observes sibling** `data-fetcher`:
```json
{
  "file_path": "/data/export_2025-11-20.csv",
  "records": 15000,
  "checksum": "a3f5b8c2",
  "status": "ready"
}
```

**AI generates:**
```json
{
  "action": "process",
  "source_file": "/data/export_2025-11-20.csv",
  "record_count": 15000,
  "checksum": "a3f5b8c2"
}
```

## Alternatives Reconsidered

### Why Not Keep Template Syntax?

1. **Learning Curve** - Users and AI must learn custom syntax
2. **Validation** - Must build custom validators for templates
3. **Tooling** - No existing UI components or libraries
4. **AI Limitation** - AI less effective with unfamiliar syntax

### Why Not Use JMESPath?

1. **Still custom** - Wrapping expressions in strings
2. **Less AI-friendly** - AI agents more familiar with JSON Schema
3. **No form builders** - JSON Schema has extensive UI tooling
4. **Validation** - Still need custom integration

## References

**Related ADRs:**
- ADR-0050: Dynamic JSON Body Templates (superseded by this ADR)
- ADR-0019: AI Query Tools for Response Data Access
- ADR-0018: Decoupled AI Worker Architecture

**Industry Standards:**
- [JSON Schema](https://json-schema.org/) - Core specification
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling) - Uses JSON Schema
- [Anthropic Claude Tools](https://docs.anthropic.com/claude/docs/tool-use) - Uses JSON Schema
- [React JSON Schema Form](https://rjsf-team.github.io/react-jsonschema-form/) - UI component library

**Migration:**
- Existing endpoints with `bodyJson` continue working
- New endpoints can use `bodySchema`
- Template evaluator kept for backward compatibility (but deprecated)
