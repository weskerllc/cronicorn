# MCP Server Architecture

**Package:** `@cronicorn/mcp-server`

**Location:** `/apps/mcp-server`

**Purpose:** Model Context Protocol server that enables AI agents to interact with Cronicorn via natural language.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent (Claude, etc.)                   │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Protocol (stdio/SSE)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  @cronicorn/mcp-server                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Tools     │  │     Auth     │  │  API Client  │      │
│  │ - create_job │  │ - OAuth Flow │  │ - HTTP Calls │      │
│  │ - list_jobs  │  │ - Token Mgmt │  │ - Error Hdl  │      │
│  │ - pause_job  │  │ - Refresh    │  │ - Retry      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (OAuth + API calls)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Cronicorn API (Better Auth + Hono)              │
│  /api/auth/device/*    /api/v1/jobs/*                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
apps/mcp-server/
├── package.json
├── tsconfig.json
├── README.md
├── .env.example
├── src/
│   ├── index.ts              # Entry point, MCP server initialization
│   ├── auth/
│   │   ├── device-flow.ts    # OAuth device flow implementation
│   │   ├── token-store.ts    # Token persistence (~/.cronicorn/credentials.json)
│   │   └── token-refresh.ts  # Auto-refresh logic
│   ├── api/
│   │   ├── client.ts         # Minimal API client (fetch wrapper)
│   │   └── types.ts          # Request/response types
│   ├── tools/
│   │   ├── index.ts          # Tool registry
│   │   ├── create-job.ts     # create_job tool implementation
│   │   ├── list-jobs.ts      # list_jobs tool implementation
│   │   ├── pause-job.ts      # pause_job tool implementation
│   │   ├── get-job-health.ts # (Phase 2)
│   │   └── add-endpoint.ts   # (Phase 2)
│   ├── utils/
│   │   ├── logger.ts         # Console logging
│   │   └── errors.ts         # Error formatting
│   └── types/
│       └── mcp.ts            # MCP protocol types
└── tests/
    ├── auth/
    │   └── device-flow.test.ts
    ├── api/
    │   └── client.test.ts
    └── tools/
        ├── create-job.test.ts
        └── list-jobs.test.ts
```

---

## Core Components

### 1. MCP Server Initialization

**File:** `src/index.ts`

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createJobTool, listJobsTool, pauseJobTool } from "./tools/index.js";
import { ensureAuthenticated } from "./auth/device-flow.js";
import { CronicornClient } from "./api/client.js";
import { loadTokens } from "./auth/token-store.js";

async function main() {
  console.error("🤖 Cronicorn MCP Server starting...");

  // Ensure user is authenticated
  const tokens = await ensureAuthenticated();
  const client = new CronicornClient({
    baseUrl: process.env.CRONICORN_API_URL || "https://cronicorn.com",
    accessToken: tokens.access_token,
  });

  // Initialize MCP server
  const server = new Server(
    {
      name: "cronicorn",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  const tools = [createJobTool, listJobsTool, pauseJobTool];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    try {
      const result = await tool.execute(request.params.arguments, client);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("✅ Cronicorn MCP Server ready");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

**Key Responsibilities:**
- Initialize MCP SDK server
- Ensure OAuth authentication before accepting tool calls
- Register tool handlers
- Connect stdio transport
- Handle graceful shutdown

---

### 2. OAuth Device Flow

**File:** `src/auth/device-flow.ts`

```typescript
import { loadTokens, saveTokens, clearTokens } from "./token-store.js";
import open from "open";

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function ensureAuthenticated() {
  // Check for existing valid tokens
  const existing = await loadTokens();
  if (existing && existing.expires_at > Date.now()) {
    console.error("✅ Using cached credentials");
    return existing;
  }

  // If expired, try refresh
  if (existing?.refresh_token) {
    console.error("🔄 Refreshing expired token...");
    try {
      const refreshed = await refreshToken(existing.refresh_token);
      return refreshed;
    } catch (error) {
      console.error("⚠️  Token refresh failed, re-authenticating...");
      await clearTokens();
    }
  }

  // Start device flow
  console.error("🔐 Starting OAuth authorization...");
  return await deviceFlow();
}

async function deviceFlow() {
  const baseUrl = process.env.CRONICORN_API_URL || "https://cronicorn.com";

  // Step 1: Request device code
  const codeRes = await fetch(`${baseUrl}/api/auth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: "cronicorn-mcp" }),
  });

  if (!codeRes.ok) {
    throw new Error(`Device code request failed: ${codeRes.statusText}`);
  }

  const codeData: DeviceCodeResponse = await codeRes.json();

  // Step 2: Prompt user to approve
  console.error("\n📋 User Code:", codeData.user_code);
  console.error(`🌐 Opening browser to: ${codeData.verification_uri}`);
  console.error(
    "⏳ Waiting for approval... (expires in",
    codeData.expires_in,
    "seconds)\n"
  );

  // Auto-open browser
  try {
    await open(codeData.verification_uri);
  } catch {
    console.error(
      "❌ Could not open browser automatically. Please visit the URL above."
    );
  }

  // Step 3: Poll for token
  const token = await pollForToken(
    codeData.device_code,
    codeData.interval,
    codeData.expires_in,
    baseUrl
  );

  // Step 4: Save tokens
  const expiresAt = Date.now() + token.expires_in * 1000;
  await saveTokens({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: expiresAt,
    user_id: "unknown", // TODO: Decode JWT to get user_id
  });

  console.error("✅ Authorization successful!");

  return {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: expiresAt,
  };
}

async function pollForToken(
  deviceCode: string,
  intervalSec: number,
  expiresIn: number,
  baseUrl: string
): Promise<TokenResponse> {
  const maxAttempts = Math.floor(expiresIn / intervalSec);
  let attempts = 0;

  while (attempts < maxAttempts) {
    await sleep(intervalSec * 1000);
    attempts++;

    const res = await fetch(`${baseUrl}/api/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceCode,
        client_id: "cronicorn-mcp",
      }),
    });

    if (res.ok) {
      return await res.json();
    }

    const error = await res.json();

    if (error.error === "authorization_pending") {
      // Still waiting, continue polling
      process.stderr.write(".");
      continue;
    }

    if (error.error === "slow_down") {
      // Increase interval
      intervalSec += 5;
      continue;
    }

    if (error.error === "access_denied") {
      throw new Error("Authorization denied by user");
    }

    if (error.error === "expired_token") {
      throw new Error("Device code expired. Please try again.");
    }

    throw new Error(`Token polling failed: ${error.error_description}`);
  }

  throw new Error("Authorization timeout");
}

async function refreshToken(refreshToken: string) {
  const baseUrl = process.env.CRONICORN_API_URL || "https://cronicorn.com";

  const res = await fetch(`${baseUrl}/api/auth/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    throw new Error("Token refresh failed");
  }

  const data: TokenResponse = await res.json();
  const expiresAt = Date.now() + data.expires_in * 1000;

  await saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    user_id: "unknown",
  });

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Key Responsibilities:**
- Check for existing valid tokens
- Initiate OAuth device flow if needed
- Auto-open browser to approval page
- Poll token endpoint with exponential backoff
- Handle token refresh when expired
- Save tokens securely

---

### 3. Token Storage

**File:** `src/auth/token-store.ts`

```typescript
import fs from "fs/promises";
import path from "path";
import os from "os";

const TOKEN_DIR = path.join(os.homedir(), ".cronicorn");
const TOKEN_FILE = path.join(TOKEN_DIR, "credentials.json");

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in ms
  user_id: string;
}

export async function saveTokens(tokens: TokenData): Promise<void> {
  await fs.mkdir(TOKEN_DIR, { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), {
    mode: 0o600, // Read/write for owner only
  });
}

export async function loadTokens(): Promise<TokenData | null> {
  try {
    const data = await fs.readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null; // File doesn't exist
    }
    throw error;
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await fs.rm(TOKEN_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export function getTokenPath(): string {
  return TOKEN_FILE;
}
```

**Key Responsibilities:**
- Store tokens in `~/.cronicorn/credentials.json`
- Enforce file permissions (0o600)
- Handle missing file gracefully
- Provide token path for debugging

---

### 4. API Client

**File:** `src/api/client.ts`

```typescript
interface ClientConfig {
  baseUrl: string;
  accessToken: string;
}

export class CronicornClient {
  constructor(private config: ClientConfig) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(
        error.message || `API request failed: ${res.statusText}`
      );
    }

    return res.json();
  }

  // Jobs
  async createJob(data: CreateJobInput): Promise<Job> {
    return this.request("POST", "/api/v1/jobs", data);
  }

  async listJobs(filters?: ListJobsFilters): Promise<Job[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.name) params.set("name", filters.name);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));

    const query = params.toString();
    const path = query ? `/api/v1/jobs?${query}` : "/api/v1/jobs";

    return this.request("GET", path);
  }

  async getJob(jobId: string): Promise<Job> {
    return this.request("GET", `/api/v1/jobs/${jobId}`);
  }

  async pauseJob(jobId: string, data: PauseJobInput): Promise<Job> {
    return this.request("POST", `/api/v1/jobs/${jobId}/pause`, data);
  }

  // Endpoints (Phase 2)
  async addEndpoint(jobId: string, data: AddEndpointInput): Promise<Endpoint> {
    return this.request("POST", `/api/v1/jobs/${jobId}/endpoints`, data);
  }

  // Health (Phase 2)
  async getJobHealth(jobId: string): Promise<JobHealth> {
    return this.request("GET", `/api/v1/jobs/${jobId}/health`);
  }
}

// Types (imported from @cronicorn/api-contracts if available)
export interface CreateJobInput {
  name: string;
  endpoints: Array<{
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }>;
  schedule?: {
    cron?: string;
    intervalMs?: number;
  };
  timezone?: string;
  description?: string;
}

export interface ListJobsFilters {
  status?: "active" | "paused" | "failing";
  name?: string;
  limit?: number;
  offset?: number;
}

export interface PauseJobInput {
  until?: string; // ISO timestamp
  reason?: string;
}

export interface AddEndpointInput {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface Job {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  // ... other fields
}

export interface Endpoint {
  id: string;
  url: string;
  method: string;
  // ... other fields
}

export interface JobHealth {
  jobId: string;
  successRate: number;
  avgDurationMs: number;
  lastRunAt: string;
  // ... other fields
}
```

**Key Responsibilities:**
- Wrap Cronicorn API endpoints
- Inject OAuth bearer token
- Parse JSON responses
- Throw formatted errors
- Type-safe request/response

---

### 5. MCP Tools

**File:** `src/tools/create-job.ts`

```typescript
import { CronicornClient } from "../api/client.js";

export const createJobTool = {
  name: "create_job",
  description:
    "Create a new job in Cronicorn with one or more HTTP endpoints. The job will execute on the specified schedule.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Human-readable job name (e.g., 'daily-backup')",
      },
      endpoints: {
        type: "array",
        description: "HTTP endpoints to call when job executes",
        items: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Target URL to call",
            },
            method: {
              type: "string",
              enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
              description: "HTTP method (default: GET)",
            },
            headers: {
              type: "object",
              description: "Custom headers as key-value pairs",
            },
            body: {
              type: "string",
              description: "Request body (JSON string)",
            },
          },
          required: ["url"],
        },
        minItems: 1,
      },
      schedule: {
        type: "object",
        description: "Schedule configuration (cron or interval)",
        properties: {
          cron: {
            type: "string",
            description: "Cron expression (e.g., '0 2 * * *' for 2am daily)",
          },
          intervalMs: {
            type: "number",
            description: "Interval in milliseconds (e.g., 300000 for 5 minutes)",
          },
        },
      },
      timezone: {
        type: "string",
        description: "IANA timezone (e.g., 'America/New_York', default: UTC)",
      },
      description: {
        type: "string",
        description: "Optional description of job purpose",
      },
    },
    required: ["name", "endpoints"],
  },

  async execute(args: any, client: CronicornClient) {
    const job = await client.createJob({
      name: args.name,
      endpoints: args.endpoints,
      schedule: args.schedule,
      timezone: args.timezone,
      description: args.description,
    });

    return {
      success: true,
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        nextRunAt: job.nextRunAt,
      },
      message: `Job '${job.name}' created successfully. ID: ${job.id}`,
    };
  },
};
```

**File:** `src/tools/list-jobs.ts`

```typescript
export const listJobsTool = {
  name: "list_jobs",
  description:
    "List all jobs, optionally filtered by status or name. Returns basic job information.",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["active", "paused", "failing"],
        description: "Filter by job status",
      },
      name: {
        type: "string",
        description: "Search by job name (substring match)",
      },
      limit: {
        type: "number",
        description: "Maximum number of jobs to return (default: 20)",
        default: 20,
      },
      offset: {
        type: "number",
        description: "Pagination offset (default: 0)",
        default: 0,
      },
    },
  },

  async execute(args: any, client: CronicornClient) {
    const jobs = await client.listJobs({
      status: args.status,
      name: args.name,
      limit: args.limit || 20,
      offset: args.offset || 0,
    });

    return {
      success: true,
      count: jobs.length,
      jobs: jobs.map((j) => ({
        id: j.id,
        name: j.name,
        status: j.status,
        lastRunAt: j.lastRunAt,
        nextRunAt: j.nextRunAt,
      })),
    };
  },
};
```

**File:** `src/tools/pause-job.ts`

```typescript
export const pauseJobTool = {
  name: "pause_job",
  description:
    "Pause a job until a specific time or indefinitely. Paused jobs will not execute.",
  inputSchema: {
    type: "object",
    properties: {
      jobId: {
        type: "string",
        description: "ID of the job to pause",
      },
      until: {
        type: "string",
        description:
          "ISO timestamp to resume job (e.g., '2024-02-01T09:00:00Z'). Omit to pause indefinitely.",
      },
      reason: {
        type: "string",
        description: "Optional reason for pausing",
      },
    },
    required: ["jobId"],
  },

  async execute(args: any, client: CronicornClient) {
    const job = await client.pauseJob(args.jobId, {
      until: args.until,
      reason: args.reason,
    });

    return {
      success: true,
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        pausedUntil: job.pausedUntil,
      },
      message: args.until
        ? `Job paused until ${args.until}`
        : "Job paused indefinitely",
    };
  },
};
```

**File:** `src/tools/index.ts`

```typescript
export { createJobTool } from "./create-job.js";
export { listJobsTool } from "./list-jobs.js";
export { pauseJobTool } from "./pause-job.js";

// Phase 2:
// export { getJobHealthTool } from "./get-job-health.js";
// export { addEndpointTool } from "./add-endpoint.js";
```

**Key Responsibilities:**
- Define MCP tool schemas (name, description, inputSchema)
- Implement `execute()` function
- Call API client with validated args
- Format results for AI agent consumption
- Handle errors gracefully

---

## Package Configuration

**File:** `apps/mcp-server/package.json`

```json
{
  "name": "@cronicorn/mcp-server",
  "version": "1.0.0",
  "description": "Model Context Protocol server for Cronicorn",
  "type": "module",
  "bin": {
    "cronicorn-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest",
    "prepublishOnly": "pnpm build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "cronicorn",
    "ai",
    "scheduler",
    "oauth"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/cronicorn/cronicorn",
    "directory": "apps/mcp-server"
  },
  "license": "MIT",
  "files": ["dist", "README.md"]
}
```

**Key Points:**
- `"type": "module"` for ESM support
- `"bin"` entry for `npx @cronicorn/mcp-server`
- Minimal dependencies (MCP SDK + `open` for browser launch)
- Published files: `dist/` and `README.md`

---

## TypeScript Configuration

**File:** `apps/mcp-server/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## Testing Strategy

### Unit Tests

**Test OAuth Device Flow:**
```typescript
// tests/auth/device-flow.test.ts
import { describe, it, expect, vi } from "vitest";
import { deviceFlow } from "../../src/auth/device-flow.js";

describe("deviceFlow", () => {
  it("should initiate device flow and poll for token", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: "abc123",
          user_code: "ABCD-EFGH",
          verification_uri: "https://cronicorn.com/device",
          expires_in: 1800,
          interval: 5,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "token_xxx",
          refresh_token: "refresh_xxx",
          expires_in: 3600,
        }),
      });

    const result = await deviceFlow();

    expect(result.access_token).toBe("token_xxx");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
```

**Test API Client:**
```typescript
// tests/api/client.test.ts
import { describe, it, expect, vi } from "vitest";
import { CronicornClient } from "../../src/api/client.js";

describe("CronicornClient", () => {
  it("should create job via API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "job_123", name: "test-job" }),
    });

    const client = new CronicornClient({
      baseUrl: "https://api.test.com",
      accessToken: "token_xxx",
    });

    const job = await client.createJob({
      name: "test-job",
      endpoints: [{ url: "https://example.com" }],
    });

    expect(job.id).toBe("job_123");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.test.com/api/v1/jobs",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_xxx",
        }),
      })
    );
  });
});
```

**Test MCP Tools:**
```typescript
// tests/tools/create-job.test.ts
import { describe, it, expect, vi } from "vitest";
import { createJobTool } from "../../src/tools/create-job.js";
import { CronicornClient } from "../../src/api/client.js";

describe("create_job tool", () => {
  it("should execute and return formatted result", async () => {
    const mockClient = {
      createJob: vi.fn().mockResolvedValue({
        id: "job_123",
        name: "daily-backup",
        status: "active",
        nextRunAt: "2024-02-01T02:00:00Z",
      }),
    };

    const result = await createJobTool.execute(
      {
        name: "daily-backup",
        endpoints: [{ url: "https://example.com/backup" }],
        schedule: { cron: "0 2 * * *" },
      },
      mockClient as any
    );

    expect(result.success).toBe(true);
    expect(result.job.id).toBe("job_123");
    expect(mockClient.createJob).toHaveBeenCalledWith({
      name: "daily-backup",
      endpoints: [{ url: "https://example.com/backup" }],
      schedule: { cron: "0 2 * * *" },
    });
  });
});
```

### Integration Tests

**Test End-to-End Flow (Manual):**
```bash
# 1. Start local API
cd apps/api
pnpm dev

# 2. Build MCP server
cd apps/mcp-server
pnpm build

# 3. Run MCP server
CRONICORN_API_URL=http://localhost:3333 node dist/index.js

# 4. Verify OAuth flow triggers browser
# 5. Approve in browser
# 6. Verify tokens saved to ~/.cronicorn/credentials.json
```

---

## Environment Variables

**File:** `apps/mcp-server/.env.example`

```bash
# Cronicorn API URL (default: https://cronicorn.com)
CRONICORN_API_URL=https://cronicorn.com

# Optional: Override client ID (default: cronicorn-mcp)
# CRONICORN_CLIENT_ID=custom-client-id

# Optional: Enable debug logging
# DEBUG=true
```

**Usage:**
- Production: `CRONICORN_API_URL` defaults to prod API
- Self-hosted: User sets in MCP config's `"env"` object
- Local dev: Set in `.env` or pass inline

---

## Error Handling

### Network Errors
```typescript
try {
  const res = await fetch(url);
} catch (error) {
  if (error.code === "ECONNREFUSED") {
    throw new Error(
      "Could not connect to Cronicorn API. Check your internet connection or CRONICORN_API_URL."
    );
  }
  throw error;
}
```

### API Errors
```typescript
if (!res.ok) {
  const error = await res.json();
  if (res.status === 401) {
    throw new Error("Authentication failed. Please re-run authorization.");
  }
  if (res.status === 429) {
    throw new Error(`Rate limit exceeded. ${error.message}`);
  }
  throw new Error(error.message || `API error: ${res.statusText}`);
}
```

### Tool Execution Errors
```typescript
// In tool execute()
try {
  const result = await client.createJob(args);
  return { success: true, job: result };
} catch (error) {
  return {
    success: false,
    error: error.message,
    hint: "Check that all required fields are provided and the API is reachable.",
  };
}
```

---

## Logging

**File:** `src/utils/logger.ts`

```typescript
export const logger = {
  info: (msg: string, meta?: any) => {
    console.error(`ℹ️  ${msg}`, meta ? JSON.stringify(meta) : "");
  },
  warn: (msg: string, meta?: any) => {
    console.error(`⚠️  ${msg}`, meta ? JSON.stringify(meta) : "");
  },
  error: (msg: string, meta?: any) => {
    console.error(`❌ ${msg}`, meta ? JSON.stringify(meta) : "");
  },
  debug: (msg: string, meta?: any) => {
    if (process.env.DEBUG) {
      console.error(`🐛 ${msg}`, meta ? JSON.stringify(meta) : "");
    }
  },
};
```

**Why `console.error`?**
- MCP uses `stdout` for protocol messages
- Logs must go to `stderr` to avoid corrupting protocol stream

---

## Publishing to npm

### Preparation
```bash
# 1. Build package
cd apps/mcp-server
pnpm build

# 2. Verify package contents
npm pack --dry-run

# 3. Test locally with npx
npx /path/to/cronicorn-mcp-server-1.0.0.tgz
```

### Publishing
```bash
# 1. Login to npm
npm login

# 2. Publish
npm publish --access public

# 3. Verify
npx @cronicorn/mcp-server --version
```

### CI/CD Automation
```yaml
# .github/workflows/publish-mcp-server.yml
name: Publish MCP Server

on:
  push:
    tags:
      - "mcp-server-v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: "https://registry.npmjs.org"

      - run: pnpm install
      - run: pnpm -F @cronicorn/mcp-server build
      - run: pnpm -F @cronicorn/mcp-server publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Documentation

**File:** `apps/mcp-server/README.md`

```markdown
# @cronicorn/mcp-server

Model Context Protocol (MCP) server for [Cronicorn](https://cronicorn.com) - the adaptive job scheduler.

## Quick Start

### 1. Install & Authenticate

```bash
npx -y @cronicorn/mcp-server
```

This will:
- Open your browser for OAuth authorization
- Save credentials securely to `~/.cronicorn/credentials.json`
- Start the MCP server

### 2. Add to Your AI Agent

**Claude Desktop:**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"]
    }
  }
}
```

Restart Claude Desktop.

**VS Code Copilot:**

Add to `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"]
    }
  }
}
```

### 3. Try It

Ask your AI agent:

> "Create a job that hits https://example.com/backup every day at 2am UTC"

## Self-Hosted Instance

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"],
      "env": {
        "CRONICORN_API_URL": "https://your-instance.com"
      }
    }
  }
}
```

## Available Tools

- **create_job** - Create jobs with natural language
- **list_jobs** - Query your jobs
- **pause_job** - Temporarily stop execution

[Full documentation](https://cronicorn.com/docs/ai-integration)

## Troubleshooting

**Browser didn't open?**

Manually visit the URL shown in the terminal.

**"Authentication failed"?**

Delete `~/.cronicorn/credentials.json` and re-run.

**Self-hosted not working?**

Verify `CRONICORN_API_URL` points to your instance.

## Development

```bash
git clone https://github.com/cronicorn/cronicorn
cd cronicorn/apps/mcp-server
pnpm install
pnpm dev
```

## License

MIT
```

---

## Future Enhancements

### Phase 2: Additional Tools
- `get_job_health` - Execution statistics
- `add_endpoint` - Add to existing job
- `resume_job` - Unpause job
- `delete_job` - Remove job

### Phase 3: Advanced Features
- **Resource Discovery** - List resources (`mcp://cronicorn/jobs`)
- **Prompts** - Pre-built templates (`create-backup-job`)
- **Sampling** - AI suggestions for optimizations

### Phase 4: Observability
- Structured logging (JSON)
- OpenTelemetry tracing
- Metrics export (Prometheus)

---

## Summary

**Location:** `/apps/mcp-server`

**Entry:** `src/index.ts` (MCP server + OAuth + tool registry)

**Core Logic:**
- `auth/device-flow.ts` - OAuth device flow
- `auth/token-store.ts` - Token persistence
- `api/client.ts` - Minimal API wrapper
- `tools/*.ts` - MCP tool implementations

**MVP Tools:** `create_job`, `list_jobs`, `pause_job`

**Testing:** Unit tests for auth, API, tools; manual E2E

**Publishing:** `npm publish` from monorepo, automated via CI

**Documentation:** Comprehensive README with examples
