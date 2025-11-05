# MCP Tool Helpers

Reusable utilities for creating MCP tools that wrap API endpoints with minimal boilerplate.

## Problem

Creating MCP tools manually involves a lot of repetitive code:
- Schema duplication (MCP shape vs runtime validator)
- Error handling boilerplate (ApiError + generic errors)
- Response formatting (success/error structure)
- Validation steps (input → API call → response)

**Before (manual):** ~110 lines per tool  
**After (with helpers):** ~25 lines per tool  
**Reduction:** 77% less code

## Helpers

### 1. `registerApiTool` - Standard API Tool Registration

Handles the entire lifecycle of an API tool with automatic error handling.

```typescript
import { registerApiTool } from "../helpers/api-tool.js";

registerApiTool(server, apiClient, {
  name: "createJob",
  title: "Create Job",
  description: "Create a new job...",
  
  // MCP schemas (ZodRawShape for registration)
  inputSchema: { name: z.string(), ... },
  outputSchema: { id: z.string(), ... },
  
  // Runtime validators (ZodType for validation)
  inputValidator: CreateJobRequestSchema,
  outputValidator: JobResponseSchema,
  
  // API config
  method: "POST",
  path: "/jobs",
  
  // Optional customization
  successMessage: (job) => `Created "${job.name}"`,
  transformInput: (input) => ({ ...input, extra: "data" })
});
```

**Features:**
- ✅ Automatic input validation
- ✅ Automatic output validation
- ✅ Standardized error handling (ApiError + generic errors)
- ✅ Consistent response format
- ✅ Type-safe success messages
- ✅ Optional input transformation
- ✅ Dynamic path generation (string or function)

**Path Examples:**

```typescript
// Static path
path: "/jobs"

// Dynamic path with params
path: (input) => `/jobs/${input.jobId}/endpoints`
```

### 2. `createSchemaAndShape` - Eliminate Schema Duplication

Define Zod schemas once, get both validator and MCP shape.

```typescript
import { createSchemaAndShape } from "../helpers/schema-utils.js";

// Define once, use twice
const [schema, shape] = createSchemaAndShape({
  name: z.string().min(1),
  age: z.number().optional(),
});

registerApiTool(server, apiClient, {
  inputSchema: shape,        // For MCP registration
  inputValidator: schema,    // For runtime validation
  // ...
});
```

### 3. `toShape` - Extract Shape from Existing Schema

Convert an existing Zod object schema to MCP shape.

```typescript
import { toShape } from "../helpers/schema-utils.js";

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

registerApiTool(server, apiClient, {
  inputSchema: toShape(schema),
  inputValidator: schema,
  // ...
});
```

## Complete Example

**Before (manual - 110 lines):**

```typescript
// See post-jobs.ts for full manual implementation
export function registerPostJobs(server: McpServer, apiClient: ApiClient) {
  server.registerTool(
    "createJob",
    {
      title: "Create Job",
      description: "...",
      inputSchema: { ... },
      outputSchema: { ... },
    },
    async (params) => {
      try {
        const validatedInput = CreateJobRequestSchema.parse(params);
        const response = await apiClient.fetch("/jobs", {
          method: "POST",
          body: JSON.stringify(validatedInput),
        });
        const validatedResponse = JobResponseSchema.parse(response);
        return {
          content: [{ type: "text", text: `✅ Created...` }],
          structuredContent: validatedResponse,
        };
      } catch (error) {
        if (error instanceof ApiError) {
          return {
            content: [{ type: "text", text: `API Error...` }],
            isError: true,
          };
        }
        // ... more error handling
      }
    }
  );
}
```

**After (with helpers - 25 lines):**

```typescript
import { registerApiTool } from "../helpers/api-tool.js";
import { createSchemaAndShape } from "../helpers/schema-utils.js";

const [CreateJobRequestSchema, createJobInputShape] = createSchemaAndShape({
  name: z.string().min(1).max(255).describe("Job name"),
  description: z.string().max(1000).optional().describe("Job description"),
});

const [JobResponseSchema, jobResponseShape] = createSchemaAndShape({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  // ... other fields
});

export function registerPostJobs(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "createJob",
    title: "Create Job",
    description: "Create a new job...",
    inputSchema: createJobInputShape,
    outputSchema: jobResponseShape,
    inputValidator: CreateJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "POST",
    path: "/jobs",
    successMessage: (job) => `✅ Created job "${job.name}" (ID: ${job.id})`,
  });
}
```

## Advanced Patterns

### Dynamic Paths

For endpoints with path parameters:

```typescript
registerApiTool(server, apiClient, {
  name: "PATCH_jobs_jobId",
  path: (input) => `/jobs/${input.jobId}`,
  // ...
});
```

### Input Transformation

Transform input before sending to API (e.g., add defaults, compute values):

```typescript
registerApiTool(server, apiClient, {
  transformInput: (input) => ({
    ...input,
    createdAt: new Date().toISOString(),
    source: "mcp-server",
  }),
  // ...
});
```

### Type Safety with API Contracts

Ensure schemas match API contract types:

```typescript
import type { CreateJobRequest } from "@cronicorn/api-contracts/jobs";

const [schema, shape] = createSchemaAndShape({
  name: z.string().min(1),
  // ...
});

// Type check to ensure compatibility
const _check: z.ZodType<CreateJobRequest> = schema;
```

## Best Practices

1. **Always use `createSchemaAndShape`** for new tools (eliminates duplication)
2. **Add `.describe()` to schema fields** for better AI context
3. **Provide custom `successMessage`** for better UX
4. **Type-check against API contracts** using `satisfies` or const assertion
5. **Use dynamic paths** for endpoints with parameters
6. **Keep tool files small** (one tool per file)

## Migration Guide

To migrate an existing manual tool:

1. Import helpers:
   ```typescript
   import { registerApiTool } from "../helpers/api-tool.js";
   import { createSchemaAndShape } from "../helpers/schema-utils.js";
   ```

2. Convert separate schema definitions:
   ```typescript
   // Before
   const InputSchema = z.object({ ... });
   const inputShape = { ... }; // duplicate!
   
   // After
   const [InputSchema, inputShape] = createSchemaAndShape({ ... });
   ```

3. Replace `server.registerTool` with `registerApiTool`:
   ```typescript
   // Before: manual error handling, validation, etc.
   server.registerTool("name", config, async (params) => { ... });
   
   // After: declarative config
   registerApiTool(server, apiClient, { ... });
   ```

4. Delete manual error handling code (now automatic)

5. Move success message to config:
   ```typescript
   successMessage: (output) => `✅ Created "${output.name}"`
   ```

## Testing

The helpers are tested through the tools that use them. When testing a tool:

```typescript
import { test, expect } from "vitest";
import { createMockApiClient } from "../__tests__/mocks.js";

test("createJob creates job successfully", async () => {
  const mockClient = createMockApiClient({
    "/jobs": { method: "POST", response: { id: "123", name: "Test" } }
  });
  
  // Tool registration happens in your tool file
  // Test by calling the tool and verifying response structure
});
```

## Files

- `helpers/api-tool.ts` - Main registration helper
- `helpers/schema-utils.ts` - Schema deduplication utilities
- `api/post-jobs-best-practice.example.ts` - Complete example
- `api/post-jobs-refactored.example.ts` - Step-by-step refactoring
- `api/post-jobs.ts` - Original manual implementation (for comparison)
