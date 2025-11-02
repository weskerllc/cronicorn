# 1:1 API Tool Pattern

**Status:** Validated against MCP TypeScript SDK best practices ✅  
**Last Updated:** 2024-01-10

## Overview

This document defines the validated pattern for creating MCP tools that map 1:1 to Cronicorn API endpoints. Use this as a template for all new API endpoint tools.

## Pattern Benefits

- **Minimal transformation:** Direct mapping reduces complexity and bugs
- **Type-safe end-to-end:** Compile-time + runtime validation
- **Hexagonal architecture:** Clean separation of concerns via ports
- **Single source of truth:** Reuses API contract schemas
- **Consistent UX:** All tools follow same patterns

## Validated Example

```typescript
/**
 * POST /jobs - Create a new job
 *
 * 1:1 mapping to API endpoint - no transformation layer
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";

import { CreateJobRequestSchema, JobResponseSchema } from "@cronicorn/api-contracts/jobs";

import type { ApiClient } from "../../ports/api-client.js";

import { ApiError } from "../../ports/api-client.js";

type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;
type JobResponse = z.infer<typeof JobResponseSchema>;

export function registerPostJobs(server: McpServer, apiClient: ApiClient) {
    server.registerTool(
        "POST_jobs",
        {
            title: "Create Job",
            description: "Create a new job. Jobs are containers for endpoints that execute on schedules. After creating a job, use POST_jobs_jobId_endpoints to add executable endpoints.",
            // MCP requires plain object with Zod schemas as values (not .shape directly)
            inputSchema: { ...CreateJobRequestSchema.shape },
            outputSchema: { ...JobResponseSchema.shape },
        },
        async (params) => {
            try {
                // Validate input using API contract schema
                const validatedInput: CreateJobRequest = CreateJobRequestSchema.parse(params);

                // Call API endpoint directly - type-safe response
                const response = await apiClient.fetch<JobResponse>("/jobs", {
                    method: "POST",
                    body: JSON.stringify(validatedInput),
                });

                // Validate response using API contract schema for runtime safety
                const validatedResponse = JobResponseSchema.parse(response);

                return {
                    content: [
                        {
                            type: "text",
                            text: `✅ Created job "${validatedResponse.name}" (ID: ${validatedResponse.id})`,
                        },
                    ],
                    structuredContent: validatedResponse,
                };
            }
            catch (error) {
                // Handle API errors (4xx, 5xx responses)
                if (error instanceof ApiError) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `API Error (${error.statusCode}): ${error.message}`,
                            },
                        ],
                        isError: true,
                    };
                }

                // Handle validation errors or other unexpected errors
                const message = error instanceof Error ? error.message : String(error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${message}`,
                        },
                    ],
                    isError: true,
                };
            }
        },
    );
}
```

## Pattern Requirements

### 1. Tool Registration

```typescript
server.registerTool(
    "POST_jobs",  // Tool name: HTTP_METHOD + path_segments
    {
        title: "Create Job",  // Human-readable action (verb-based)
        description: "...",   // What it does + next steps
        inputSchema: { ...RequestSchema.shape },   // ✅ Spread .shape
        outputSchema: { ...ResponseSchema.shape }, // ✅ Spread .shape
    },
    async (params) => { /* handler */ }
);
```

**Schema Definition Rules:**
- ✅ **DO:** Use `{ ...CreateJobRequestSchema.shape }` to spread Zod fields
- ❌ **DON'T:** Use `.shape` directly: `CreateJobRequestSchema.shape`
- ❌ **DON'T:** Define inline unless schemas differ from API contracts

### 2. Error Handling (REQUIRED)

All tools MUST wrap handler logic in try/catch and return proper MCP error responses:

```typescript
try {
    // Validation + API call + response validation
    return {
        content: [...],
        structuredContent: result,
    };
}
catch (error) {
    // Handle API errors specifically
    if (error instanceof ApiError) {
        return {
            content: [{
                type: "text",
                text: `API Error (${error.statusCode}): ${error.message}`,
            }],
            isError: true,  // ← CRITICAL: Signals error to MCP client
        };
    }

    // Handle validation and unexpected errors
    const message = error instanceof Error ? error.message : String(error);
    return {
        content: [{
            type: "text",
            text: `Error: ${message}`,
        }],
        isError: true,
    };
}
```

### 3. Response Format

All successful responses MUST include:

```typescript
return {
    content: [
        {
            type: "text",
            text: "✅ Human-readable summary"  // For logging/debugging
        }
    ],
    structuredContent: validatedResponse  // For programmatic access
};
```

### 4. Type Safety

- Import request/response schemas from `@cronicorn/api-contracts`
- Validate inputs: `const validatedInput = RequestSchema.parse(params)`
- Type API calls: `apiClient.fetch<ResponseType>(...)`
- Validate outputs: `const validatedResponse = ResponseSchema.parse(response)`

## Naming Conventions

### Tool Names
- Format: `{HTTP_METHOD}_{path_segments}`
- Examples:
  - `POST_jobs` → POST /jobs
  - `GET_jobs_jobId` → GET /jobs/:jobId
  - `POST_jobs_jobId_endpoints` → POST /jobs/:jobId/endpoints
  - `PATCH_jobs_jobId_endpoints_endpointId` → PATCH /jobs/:jobId/endpoints/:endpointId

**Rationale:** Explicit mapping makes debugging and tracing easier.

**Alternative:** Verb-based names (`create-job`) are more AI-friendly but less traceable. Can add as aliases later.

### File Structure
```
src/tools/api/
  post-jobs.ts              # POST /jobs
  get-jobs.ts               # GET /jobs
  get-jobs-id.ts            # GET /jobs/:jobId
  post-jobs-id-endpoints.ts # POST /jobs/:jobId/endpoints
  ...
```

## Import Guidelines

Follow ESLint import sorting:

```typescript
// 1. External package types
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";

// 2. Internal package values
import { RequestSchema, ResponseSchema } from "@cronicorn/api-contracts/...";

// 3. Local types (separate from values)
import type { ApiClient } from "../../ports/api-client.js";

// 4. Local values
import { ApiError } from "../../ports/api-client.js";

// 5. Type aliases
type MyRequest = z.infer<typeof RequestSchema>;
type MyResponse = z.infer<typeof ResponseSchema>;
```

## Testing Strategy

### Unit Tests (with mocked ApiClient)
```typescript
import { describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPostJobs } from "./post-jobs.js";

describe("POST_jobs tool", () => {
    it("creates job successfully", async () => {
        const mockApiClient = {
            fetch: vi.fn().mockResolvedValue({ id: "job-1", name: "Test" }),
        };
        
        const server = new McpServer({ name: "test", version: "1.0.0" });
        registerPostJobs(server, mockApiClient);
        
        // Test the registered tool
        // ...
    });
    
    it("handles API errors gracefully", async () => {
        const mockApiClient = {
            fetch: vi.fn().mockRejectedValue(new ApiError(404, "Not found")),
        };
        
        // Verify isError: true in response
        // ...
    });
});
```

## Common Pitfalls

### ❌ Using .shape directly
```typescript
// DON'T
inputSchema: CreateJobRequestSchema.shape
```

### ❌ Missing error handling
```typescript
// DON'T - tool will crash on errors
async (params) => {
    const input = RequestSchema.parse(params);  // Throws on invalid input
    const response = await apiClient.fetch(...); // Throws on 4xx/5xx
    return { content: [...] };
}
```

### ❌ Forgetting isError flag
```typescript
// DON'T
catch (error) {
    return {
        content: [{ type: "text", text: `Error: ${error}` }]
        // Missing isError: true
    };
}
```

## Migration Checklist

When converting existing custom tools to 1:1 pattern:

- [ ] Schema definitions use `{ ...Schema.shape }`
- [ ] Comprehensive try/catch wrapper
- [ ] API errors return `isError: true`
- [ ] Validation errors return `isError: true`
- [ ] Response includes both `content` and `structuredContent`
- [ ] Input validation before API call
- [ ] Output validation after API call
- [ ] Type-safe API call with generic
- [ ] Imports follow ESLint sorting
- [ ] File named after endpoint (e.g., `post-jobs.ts`)
- [ ] Tool name follows convention (e.g., `POST_jobs`)
- [ ] Added unit tests with error cases

## Future Improvements

1. **Error Handler Wrapper:** Extract common error handling to reduce duplication
2. **Schema Generator:** Auto-generate tools from OpenAPI spec
3. **Tool Aliases:** Add verb-based aliases (`create-job` → `POST_jobs`)
4. **Batch Operations:** Support multiple API calls in single tool
5. **Streaming Responses:** Support SSE for long-running operations

## References

- [MCP TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [POST_jobs implementation](../src/tools/api/post-jobs.ts)
- [ApiClient port definition](../src/ports/api-client.ts)
- [HTTP ApiClient adapter](../src/adapters/http-api-client.ts)
