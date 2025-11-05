# MCP Tool Quick Reference

## Template for New Tools

```typescript
import type { YourRequest, YourResponse } from "@cronicorn/api-contracts/...";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// 1. Define schemas once
const [YourRequestSchema, requestShape] = createSchemaAndShape({
    field1: z.string().describe("Field description"),
    field2: z.number().optional(),
    // ... other fields
});

const [YourResponseSchema, responseShape] = createSchemaAndShape({
    id: z.string(),
    // ... other fields
});

// 2. Type check (optional but recommended)
const _inputCheck: z.ZodType<YourRequest> = YourRequestSchema;
const _outputCheck: z.ZodType<YourResponse> = YourResponseSchema;

// 3. Register tool
export function registerYourTool(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "toolName",              // e.g., "createJob", "getJob"
        title: "Human Readable Title",
        description: "What this tool does and when to use it",
        inputSchema: requestShape,
        outputSchema: responseShape,
        inputValidator: YourRequestSchema,
        outputValidator: YourResponseSchema,
        method: "POST",                      // GET | POST | PATCH | DELETE | PUT
        path: "/resource",                   // or (input) => `/resource/${input.id}`
        successMessage: (result) => `✅ Success!`,  // optional
    });
}
```

## Common Patterns

### Static Path
```typescript
path: "/jobs"
```

### Dynamic Path
```typescript
path: (input) => `/jobs/${input.jobId}/endpoints/${input.endpointId}`
```

### Input Transformation
```typescript
transformInput: (input) => ({
    ...input,
    timestamp: new Date().toISOString(),
})
```

### Custom Success Message
```typescript
successMessage: (job) => `✅ Created "${job.name}" (ID: ${job.id})`
```

## HTTP Methods

- **POST** - Create resource
- **GET** - Retrieve resource (don't include body)
- **PATCH** - Update resource partially
- **PUT** - Replace resource completely
- **DELETE** - Remove resource

## Field Descriptions

Add `.describe()` for better AI context:

```typescript
name: z.string().min(1).describe("Job name (1-255 characters)"),
enabled: z.boolean().describe("Whether the endpoint is active"),
intervalMs: z.number().positive().describe("Execution interval in milliseconds"),
```

## Validation Modifiers

```typescript
z.string()                    // Required string
z.string().optional()         // Optional string
z.string().min(1).max(100)    // Length constraints
z.number().positive()         // Positive numbers only
z.number().int()              // Integers only
z.enum(["a", "b", "c"])       // Enum values
z.array(z.string())           // Array of strings
z.object({ ... })             // Nested object
```

## Complete Example: PATCH endpoint

```typescript
const [UpdateJobRequestSchema, updateRequestShape] = createSchemaAndShape({
    jobId: z.string().describe("Job ID to update"),
    name: z.string().min(1).max(255).optional().describe("New job name"),
    status: z.enum(["active", "paused"]).optional().describe("New status"),
});

const [JobResponseSchema, jobResponseShape] = createSchemaAndShape({
    id: z.string(),
    name: z.string(),
    status: z.enum(["active", "paused", "archived"]),
    updatedAt: z.string().datetime(),
});

export function registerPatchJob(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "PATCH_jobs_jobId",
        title: "Update Job",
        description: "Update job name or status",
        inputSchema: updateRequestShape,
        outputSchema: jobResponseShape,
        inputValidator: UpdateJobRequestSchema,
        outputValidator: JobResponseSchema,
        method: "PATCH",
        path: (input) => `/jobs/${input.jobId}`,
        transformInput: (input) => {
            const { jobId, ...body } = input;
            return body; // Remove jobId from body (it's in path)
        },
        successMessage: (job) => `✅ Updated job "${job.name}"`,
    });
}
```

## Complete Example: GET with Query Parameters

```typescript
const [ListJobsRequestSchema, listJobsInputShape] = createSchemaAndShape({
    status: z.enum(["active", "paused", "archived"]).optional().describe("Filter by status"),
    limit: z.number().int().positive().optional().describe("Max results"),
});

const [ListJobsResponseSchema, listJobsResponseShape] = createSchemaAndShape({
    jobs: z.array(JobResponseSchema),
    total: z.number().int(),
});

export function registerListJobs(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "listJobs",
        title: "List Jobs",
        description: "List all jobs with optional filtering",
        inputSchema: listJobsInputShape,
        outputSchema: listJobsResponseShape,
        inputValidator: ListJobsRequestSchema,
        outputValidator: ListJobsResponseSchema,
        method: "GET",
        path: "/jobs", // Query params automatically added from input
        successMessage: (result) => `✅ Found ${result.jobs.length} job(s)`,
    });
}
```

## Complete Example: DELETE with 204 No Content

```typescript
const [DeleteEndpointRequestSchema, deleteEndpointInputShape] = createSchemaAndShape({
    id: z.string().describe("Endpoint ID to delete"),
});

// Empty response for 204 No Content
const [EmptyResponseSchema, emptyResponseShape] = createSchemaAndShape({});

export function registerDeleteEndpoint(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "DELETE_endpoints_id",
        title: "Delete Endpoint",
        description: "Permanently delete an endpoint",
        inputSchema: deleteEndpointInputShape,
        outputSchema: emptyResponseShape,
        inputValidator: DeleteEndpointRequestSchema,
        outputValidator: EmptyResponseSchema,
        method: "DELETE",
        path: (input) => `/endpoints/${input.id}`,
        successMessage: () => `✅ Endpoint deleted successfully`,
    });
}
```

## Checklist for New Tools

- [ ] Import helpers: `import { registerApiTool, createSchemaAndShape } from "../helpers/index.js"`
- [ ] Define input schema with `createSchemaAndShape`
- [ ] Define output schema with `createSchemaAndShape`
- [ ] Add type checks against API contracts
- [ ] Use `.describe()` on all fields
- [ ] Choose correct HTTP method
- [ ] Use dynamic path if needed
- [ ] Add custom success message
- [ ] Export registration function
- [ ] Register in `tools/index.ts`

## Error Handling

**Automatic** - the helper handles:
- ✅ API errors (4xx, 5xx status codes)
- ✅ Validation errors (Zod parse failures)
- ✅ Network errors
- ✅ Generic exceptions

No try-catch needed in your tool file!

## See Also

- `helpers/README.md` - Full documentation
- `api/post-jobs.ts` - Real implementation
- `helpers/MIGRATION_SUMMARY.md` - Before/after comparison
