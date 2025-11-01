# MCP Server Architecture

## Hexagonal Architecture (Ports & Adapters)

This MCP server follows hexagonal architecture principles for clean separation of concerns and testability.

### Structure

```
src/
  ports/              # Interfaces (dependency inversion)
    api-client.ts     # ApiClient type + ApiError
  
  adapters/           # Concrete implementations
    http-api-client.ts # HTTP implementation of ApiClient
  
  tools/              # MCP tool registration
    api/              # 1:1 API endpoint mappings
      post-jobs.ts    # POST /jobs tool
    index.ts          # Tool registry (composition root)
```

### Key Components

#### Port: `ApiClient`

Defines the interface for HTTP communication:

```typescript
export type ApiClient = {
    fetch: <T = unknown>(path: string, options?: RequestInit) => Promise<T>;
};
```

**Benefits:**
- Type-safe generic responses
- Easy to mock for testing
- Swappable implementations

#### Adapter: `createHttpApiClient`

Factory function that creates an `ApiClient` implementation using native `fetch`:

```typescript
const apiClient = createHttpApiClient({
    baseUrl: "https://api.cronicorn.com",
    accessToken: credentials.access_token
});

// Type-safe usage
const job = await apiClient.fetch<JobResponse>("/jobs/123");
```

**Features:**
- Automatic authentication via Bearer token
- JSON content-type headers
- Throws `ApiError` with status codes
- Type-safe response parsing

### Dependency Injection

Tools receive `ApiClient` via constructor injection:

```typescript
export function registerPostJobs(server: McpServer, apiClient: ApiClient) {
    // Use apiClient.fetch<T>() with full type safety
}
```

**Benefits:**
- No `any` types needed
- Easy to unit test (inject mock)
- Clear dependencies

### Testing Strategy

1. **Unit Tests**: Mock `ApiClient` interface
2. **Integration Tests**: Use real `HttpApiClient` with test server
3. **E2E Tests**: Full OAuth flow with staging API

### Example: Adding a New Tool

```typescript
// tools/api/get-jobs.ts
import type { ApiClient } from "../../ports/api-client.js";
import { JobResponseSchema } from "@cronicorn/api-contracts/jobs";

export function registerGetJobs(server: McpServer, apiClient: ApiClient) {
    server.registerTool("GET_jobs", {
        description: "List all jobs",
        inputSchema: {},
        outputSchema: z.array(JobResponseSchema).shape,
    }, async () => {
        const jobs = await apiClient.fetch<JobResponse[]>("/jobs");
        return { content: [...], structuredContent: jobs };
    });
}
```

### Architecture Principles

1. **Dependency Inversion**: Tools depend on `ApiClient` interface, not concrete HTTP implementation
2. **Single Responsibility**: Each adapter has one job (HTTP client, auth, etc.)
3. **Type Safety**: No `any` types - generics provide compile-time safety
4. **Runtime Validation**: API contracts provide runtime safety via Zod schemas
5. **Testability**: Interfaces enable easy mocking

### Future Enhancements

- Add retry logic adapter (wraps HttpApiClient)
- Add rate limiting adapter
- Add request caching adapter
- Add telemetry/logging adapter (decorator pattern)
