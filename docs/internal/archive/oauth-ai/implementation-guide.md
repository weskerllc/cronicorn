# OAuth Device Flow Implementation Guide

**Complete step-by-step implementation plan for adding OAuth Device Authorization Flow to Cronicorn using Better Auth's built-in plugin.**

---

## Table of Contents

1. [Phase 1: Backend Setup](#phase-1-backend-setup)
2. [Phase 2: Frontend UI](#phase-2-frontend-ui)
3. [Phase 3: MCP Server Integration](#phase-3-mcp-server-integration)
4. [Phase 4: Documentation](#phase-4-documentation)
5. [Phase 5: Testing](#phase-5-testing)
6. [Phase 6: Deployment](#phase-6-deployment)

---

## Phase 1: Backend Setup (Day 1)

### Step 1.1: Install Better Auth Device Flow Plugin

The plugin is already part of `better-auth`, so no additional installation needed.

### Step 1.2: Update Auth Configuration

**File:** `apps/api/src/auth/config.ts`

```typescript
import { schema } from "@cronicorn/adapter-drizzle";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, deviceAuthorization } from "better-auth/plugins"; // ADD deviceAuthorization

import type { Env } from "../lib/config";
import type { Database } from "../lib/db";

export function createAuth(config: Env, db: Database) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...schema,
        apikey: schema.apiKey,
      },
    }),
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    trustedOrigins: [config.WEB_URL],
    socialProviders: {
      github: {
        clientId: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        redirectURI: `${config.BETTER_AUTH_URL}/api/auth/callback/github`,
      },
    },
    plugins: [
      apiKey({
        apiKeyHeaders: "x-api-key",
        rateLimit: {
          enabled: true,
          timeWindow: 60 * 1000,
          maxRequests: 100,
        },
      }),
      // ADD THIS: Device Authorization Flow for AI agents
      deviceAuthorization({
        expiresIn: "30m",      // Device code valid for 30 minutes
        interval: "5s",        // Minimum polling interval
        userCodeLength: 8,     // XXXX-XXXX format
        
        // Validate known clients
        validateClient: async (clientId) => {
          const knownClients = [
            "github-copilot",
            "claude-desktop",
            "cursor",
            "cronicorn-cli",
          ];
          return knownClients.includes(clientId);
        },
        
        // Log device auth requests for monitoring
        onDeviceAuthRequest: async (clientId, scope) => {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: "device_auth_request",
            clientId,
            scope,
          }));
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
```

### Step 1.3: Run Database Migration

Better Auth automatically handles schema migrations for the device flow. Run:

```bash
cd apps/api
pnpm db:migrate
```

This will create the necessary tables:
- `device_codes` - Stores device codes and user codes
- OAuth token tables (if not already exist)

### Step 1.4: Update Authentication Middleware (Optional)

**File:** `apps/api/src/auth/middleware.ts`

Our existing middleware should already support OAuth tokens via Better Auth's `getSession()`, but let's verify:

```typescript
import type { Context, Next } from "hono";
import type { Auth } from "./config";

/**
 * Require authentication via API key OR OAuth token
 * 
 * Supports two auth methods:
 * 1. API Key: x-api-key header (from dashboard, never expires)
 * 2. OAuth Token: Authorization: Bearer header (from device flow, expires in 1h)
 */
export function requireAuth(auth: Auth) {
  return async (c: Context, next: Next) => {
    // Try API key first
    const apiKey = c.req.header("x-api-key");
    if (apiKey) {
      const session = await auth.api.validateAPIKey({
        headers: c.req.raw.headers,
      });
      
      if (session?.user) {
        c.set("userId", session.user.id);
        c.set("session", session);
        return next();
      }
    }

    // Try OAuth bearer token
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    
    if (session?.user) {
      c.set("userId", session.user.id);
      c.set("session", session);
      return next();
    }

    // Neither worked
    return c.json({ 
      error: "Unauthorized",
      message: "Provide either x-api-key header or Authorization: Bearer header"
    }, 401);
  };
}
```

### Step 1.5: Test Backend Endpoints

Start the API server:

```bash
cd apps/api
pnpm dev
```

Test device code request:

```bash
curl -X POST http://localhost:3333/api/auth/device/code \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "github-copilot",
    "scope": "openid profile email"
  }'
```

Expected response:

```json
{
  "device_code": "abc123...",
  "user_code": "WDJB-MJHT",
  "verification_uri": "http://localhost:3333/api/auth/device",
  "verification_uri_complete": "http://localhost:3333/api/auth/device?user_code=WDJB-MJHT",
  "expires_in": 1800,
  "interval": 5
}
```

---

## Phase 2: Frontend UI (Day 2)

### Step 2.1: Create Device Approval Page

**File:** `apps/web/src/pages/device/approve.tsx`

```typescript
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Shield } from "lucide-react";

export default function DeviceApprovalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userCode = searchParams.get("user_code");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    clientName: string;
    scopes: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if user is authenticated
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isPending && !session?.user) {
      const redirectUrl = `/device/approve?user_code=${userCode}`;
      router.push(`/sign-in?callbackURL=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    // Verify device code
    if (userCode && session?.user) {
      verifyDeviceCode();
    }
  }, [session, isPending, userCode]);

  const verifyDeviceCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/device?user_code=${userCode}`);
      const data = await response.json();

      if (response.ok) {
        // Map client_id to friendly name
        const clientNames: Record<string, string> = {
          "github-copilot": "GitHub Copilot",
          "claude-desktop": "Claude Desktop",
          "cursor": "Cursor",
          "cronicorn-cli": "Cronicorn CLI",
        };

        setDeviceInfo({
          clientName: clientNames[data.client_id] || data.client_id,
          scopes: data.scope?.split(" ") || [],
        });
      } else {
        setError(data.error || "Invalid or expired device code");
      }
    } catch (err) {
      setError("Failed to verify device code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await authClient.device.approve({
        userCode: userCode!,
      });

      setSuccess("Device approved successfully! You can close this window.");
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to approve device");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await authClient.device.deny({
        userCode: userCode!,
      });

      setSuccess("Device access denied.");
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to deny device");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isPending || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <CardTitle>Success</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{success}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <CardTitle>Device Authorization</CardTitle>
          </div>
          <CardDescription>
            A device is requesting access to your Cronicorn account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {deviceInfo && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Device Code:</span>
                  <code className="text-lg font-mono font-bold">{userCode}</code>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Application:</span>
                  <span className="font-semibold">{deviceInfo.clientName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Requested Permissions:</span>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  {deviceInfo.scopes.map((scope) => (
                    <li key={scope}>{scope}</li>
                  ))}
                </ul>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  By approving, you allow <strong>{deviceInfo.clientName}</strong> to access your Cronicorn account with the permissions listed above.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDeny}
            disabled={isProcessing || !deviceInfo}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Deny"
            )}
          </Button>

          <Button
            onClick={handleApprove}
            disabled={isProcessing || !deviceInfo}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Approve"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### Step 2.2: Add Better Auth Client Plugin

**File:** `apps/web/src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/react";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333",
  plugins: [
    deviceAuthorizationClient(), // ADD THIS
  ],
});
```

### Step 2.3: Create Connected Devices Dashboard Section

**File:** `apps/web/src/pages/settings/connected-devices.tsx`

```typescript
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Laptop, Terminal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ConnectedDevice {
  id: string;
  clientId: string;
  clientName: string;
  createdAt: Date;
  lastUsedAt: Date;
  scopes: string[];
}

export default function ConnectedDevicesPage() {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      // Get all active sessions
      const { data: sessions } = await authClient.listSessions();
      
      // Filter OAuth device sessions
      const deviceSessions = sessions?.filter(s => 
        s.clientId && s.clientId !== "web"
      ) || [];

      const clientNames: Record<string, string> = {
        "github-copilot": "GitHub Copilot",
        "claude-desktop": "Claude Desktop",
        "cursor": "Cursor",
        "cronicorn-cli": "Cronicorn CLI",
      };

      setDevices(deviceSessions.map(s => ({
        id: s.id,
        clientId: s.clientId!,
        clientName: clientNames[s.clientId!] || s.clientId!,
        createdAt: new Date(s.createdAt),
        lastUsedAt: new Date(s.lastUsedAt || s.createdAt),
        scopes: s.scopes || [],
      })));
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const revokeDevice = async (sessionId: string) => {
    try {
      await authClient.revokeSession({ sessionId });
      await fetchDevices();
    } catch (error) {
      console.error("Failed to revoke device:", error);
    }
  };

  const getDeviceIcon = (clientId: string) => {
    if (clientId.includes("copilot") || clientId.includes("cursor")) {
      return <Laptop className="h-5 w-5" />;
    }
    if (clientId.includes("cli")) {
      return <Terminal className="h-5 w-5" />;
    }
    return <Smartphone className="h-5 w-5" />;
  };

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>🤖 Connected AI Agents & Devices</CardTitle>
          <CardDescription>
            Manage devices and applications that have access to your Cronicorn account via OAuth
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : devices.length === 0 ? (
            <Alert>
              <AlertDescription>
                No connected devices. Authorize a device using the device flow to see it here.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getDeviceIcon(device.clientId)}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold">{device.clientName}</div>
                      
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <div>
                          Authorized {formatDistanceToNow(device.createdAt, { addSuffix: true })}
                        </div>
                        <div>
                          Last used {formatDistanceToNow(device.lastUsedAt, { addSuffix: true })}
                        </div>
                      </div>

                      {device.scopes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {device.scopes.map((scope) => (
                            <span
                              key={scope}
                              className="text-xs bg-secondary px-2 py-0.5 rounded"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeDevice(device.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 2.4: Add Route to Next.js

**File:** `apps/web/src/app/device/approve/page.tsx`

```typescript
import DeviceApprovalPage from "@/pages/device/approve";

export default function Page() {
  return <DeviceApprovalPage />;
}
```

**File:** `apps/web/src/app/settings/connected-devices/page.tsx`

```typescript
import ConnectedDevicesPage from "@/pages/settings/connected-devices";

export default function Page() {
  return <ConnectedDevicesPage />;
}
```

---

## Phase 3: MCP Server Integration (Day 3)

### Step 3.1: Create MCP Server Package

```bash
cd apps
mkdir mcp-server
cd mcp-server
pnpm init
```

**File:** `apps/mcp-server/package.json`

```json
{
  "name": "@cronicorn/mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "cronicorn-mcp": "./dist/index.js"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-auth": "^1.3.0",
    "dotenv": "^16.4.5",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

### Step 3.2: Implement Device Flow Authentication

**File:** `apps/mcp-server/src/auth/device-flow.ts`

```typescript
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import open from "open";
import fs from "fs/promises";
import path from "path";
import os from "os";

const authClient = createAuthClient({
  baseURL: process.env.CRONICORN_API_URL || "https://cronicorn.com",
  plugins: [deviceAuthorizationClient()],
});

// Token storage path
const TOKEN_DIR = path.join(os.homedir(), ".cronicorn");
const TOKEN_FILE = path.join(TOKEN_DIR, "credentials.json");

interface StoredCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export async function authenticate(): Promise<string> {
  // Try to load existing token
  const existingToken = await loadToken();
  if (existingToken) {
    // Check if expired
    if (Date.now() < existingToken.expires_at) {
      return existingToken.access_token;
    }

    // Try to refresh
    const refreshed = await refreshToken(existingToken.refresh_token);
    if (refreshed) {
      return refreshed;
    }
  }

  // Start device flow
  return performDeviceFlow();
}

async function performDeviceFlow(): Promise<string> {
  console.log("🔐 Cronicorn Authentication");
  console.log("⏳ Requesting device authorization...\n");

  // Request device code
  const { data, error } = await authClient.device.code({
    client_id: "cronicorn-cli",
    scope: "openid profile email jobs:read jobs:write endpoints:write runs:read",
  });

  if (error || !data) {
    throw new Error(`Authentication failed: ${error?.error_description}`);
  }

  const {
    device_code,
    user_code,
    verification_uri_complete,
    interval = 5,
  } = data;

  console.log("📱 Please authorize this device");
  console.log(`\nCode: ${user_code}`);
  console.log(`\nVisit: ${verification_uri_complete}\n`);

  // Open browser
  if (verification_uri_complete) {
    console.log("🌐 Opening browser...\n");
    try {
      await open(verification_uri_complete);
    } catch {
      console.log("⚠️  Failed to open browser automatically");
    }
  }

  console.log(`⏳ Waiting for authorization (polling every ${interval}s)...\n`);

  // Poll for token
  const token = await pollForToken(device_code, interval);

  // Store token
  await storeToken({
    access_token: token.access_token,
    refresh_token: token.refresh_token!,
    expires_at: Date.now() + token.expires_in * 1000,
  });

  console.log("✅ Authentication successful!\n");
  return token.access_token;
}

async function pollForToken(
  deviceCode: string,
  interval: number
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  let pollingInterval = interval;

  while (true) {
    await new Promise(resolve => setTimeout(resolve, pollingInterval * 1000));

    const { data, error } = await authClient.device.token({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
      client_id: "cronicorn-cli",
    });

    if (data?.access_token) {
      return data as any;
    }

    if (error) {
      switch (error.error) {
        case "authorization_pending":
          // Continue polling
          break;
        case "slow_down":
          pollingInterval += 5;
          console.log(`⚠️  Slowing down polling to ${pollingInterval}s`);
          break;
        case "access_denied":
          throw new Error("Access was denied by the user");
        case "expired_token":
          throw new Error("Device code has expired. Please try again.");
        default:
          throw new Error(error.error_description || error.error);
      }
    }
  }
}

async function refreshToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${authClient.baseURL}/api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: "cronicorn-cli",
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    await storeToken({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    });

    return data.access_token;
  } catch {
    return null;
  }
}

async function loadToken(): Promise<StoredCredentials | null> {
  try {
    const content = await fs.readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function storeToken(credentials: StoredCredentials): Promise<void> {
  await fs.mkdir(TOKEN_DIR, { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(credentials, null, 2));
  await fs.chmod(TOKEN_FILE, 0o600); // Restrict permissions
}

export async function logout(): Promise<void> {
  try {
    await fs.unlink(TOKEN_FILE);
    console.log("✅ Logged out successfully");
  } catch {
    console.log("No active session found");
  }
}
```

### Step 3.3: Create MCP Server

**File:** `apps/mcp-server/src/index.ts`

```typescript
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { authenticate, logout } from "./auth/device-flow.js";

// Get access token
let accessToken: string;

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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_job",
        description: "Create a new job with adaptive scheduling",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Job name" },
            description: { type: "string", description: "Job description" },
          },
          required: ["name"],
        },
      },
      {
        name: "add_endpoint",
        description: "Add an HTTP endpoint to a job",
        inputSchema: {
          type: "object",
          properties: {
            jobId: { type: "string", description: "Job ID" },
            name: { type: "string", description: "Endpoint name" },
            url: { type: "string", description: "HTTP URL to call" },
            method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
            baselineIntervalMs: { type: "number", description: "Baseline interval in milliseconds" },
          },
          required: ["jobId", "name", "url", "baselineIntervalMs"],
        },
      },
      {
        name: "list_jobs",
        description: "List all jobs",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "logout",
        description: "Logout and clear stored credentials",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Special case: logout
    if (name === "logout") {
      await logout();
      return {
        content: [{ type: "text", text: "Logged out successfully" }],
      };
    }

    // For all other tools, ensure we have a valid token
    if (!accessToken) {
      throw new Error("Not authenticated. Please restart the MCP server to authenticate.");
    }

    // Call Cronicorn API
    const apiUrl = process.env.CRONICORN_API_URL || "https://cronicorn.com";
    let endpoint = "";
    let method = "GET";
    let body: any = null;

    switch (name) {
      case "create_job":
        endpoint = "/api/v1/jobs";
        method = "POST";
        body = { name: args.name, description: args.description };
        break;
      case "add_endpoint":
        endpoint = `/api/v1/jobs/${args.jobId}/endpoints`;
        method = "POST";
        body = {
          name: args.name,
          url: args.url,
          method: args.method || "GET",
          baselineIntervalMs: args.baselineIntervalMs,
        };
        break;
      case "list_jobs":
        endpoint = "/api/v1/jobs";
        method = "GET";
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
      content: [{
        type: "text",
        text: JSON.stringify(data, null, 2),
      }],
    };
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`,
      }],
      isError: true,
    };
  }
});

async function main() {
  // Authenticate on startup
  console.error("Starting Cronicorn MCP Server...");
  accessToken = await authenticate();
  console.error("Authenticated successfully!");
  console.error("Ready to accept requests.\n");

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

### Step 3.4: Test MCP Server

```bash
cd apps/mcp-server
pnpm install
pnpm dev
```

This should:
1. Print authentication instructions
2. Open browser to device approval page
3. Wait for user to approve
4. Start MCP server

---

## Phase 4: Documentation (Day 4)

### Step 4.1: Update ai.txt

**File:** `public/ai.txt` (or `docs/ai-integration.md`)

```markdown
# Cronicorn - AI Integration Guide

## Quick Start (30 seconds)

Cronicorn supports OAuth 2.0 Device Authorization Flow for frictionless AI agent integration.

### Authentication Flow

1. **Request device code:**
   ```bash
   curl -X POST https://cronicorn.com/api/auth/device/code \
     -H "Content-Type: application/json" \
     -d '{
       "client_id": "your-client-id",
       "scope": "openid profile email jobs:read jobs:write"
     }'
   ```

2. **Show user the verification URL and code:**
   ```
   Visit: https://cronicorn.com/device/approve?user_code=WDJB-MJHT
   Or enter code at: https://cronicorn.com/device/approve
   ```

3. **Poll for access token:**
   ```bash
   curl -X POST https://cronicorn.com/api/auth/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
       "device_code": "...",
       "client_id": "your-client-id"
     }'
   ```

4. **Use access token:**
   ```bash
   curl https://cronicorn.com/api/v1/jobs \
     -H "Authorization: Bearer <access_token>"
   ```

## Registered OAuth Clients

Pre-registered clients (no client_secret required):
- `github-copilot` - GitHub Copilot
- `claude-desktop` - Claude Desktop
- `cursor` - Cursor
- `cronicorn-cli` - Cronicorn CLI

## Integration Patterns

[... rest of ai.txt content from previous research doc ...]
```

### Step 4.2: Update README

**File:** `README.md`

Add section on AI agent authentication:

```markdown
## 🤖 AI Agent Integration

Cronicorn supports OAuth Device Flow for seamless AI agent integration.

### Quick Setup

1. **Your AI agent requests authorization:**
   ```
   POST /api/auth/device/code
   ```

2. **User authorizes in browser:**
   ```
   Visit: https://cronicorn.com/device/approve
   Enter code: WDJB-MJHT
   ```

3. **Agent polls for token:**
   ```
   POST /api/auth/token
   ```

4. **Agent uses token:**
   ```
   Authorization: Bearer <token>
   ```

**Total time:** ~30 seconds

See [AI Integration Guide](./docs/ai-integration.md) for details.
```

---

## Phase 5: Testing (Day 4-5)

### Step 5.1: Unit Tests

**File:** `apps/api/src/auth/__tests__/device-flow.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createAuth } from "../config";
import { createDatabase } from "../../lib/db";
import { loadConfig } from "../../lib/config";

describe("Device Authorization Flow", () => {
  let auth: ReturnType<typeof createAuth>;

  beforeEach(() => {
    const config = loadConfig();
    const db = createDatabase(config);
    auth = createAuth(config, db);
  });

  it("should issue device code", async () => {
    const response = await fetch(`${auth.baseURL}/api/auth/device/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "github-copilot",
        scope: "openid profile email",
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    expect(data).toHaveProperty("device_code");
    expect(data).toHaveProperty("user_code");
    expect(data).toHaveProperty("verification_uri");
    expect(data).toHaveProperty("expires_in");
    expect(data).toHaveProperty("interval");
  });

  it("should reject invalid client_id", async () => {
    const response = await fetch(`${auth.baseURL}/api/auth/device/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "invalid-client",
        scope: "openid profile email",
      }),
    });

    expect(response.ok).toBe(false);
  });
});
```

### Step 5.2: Integration Test

Create end-to-end test that:
1. Requests device code
2. Simulates user approval
3. Polls for token
4. Uses token to call API

### Step 5.3: Manual Testing Checklist

- [ ] Device code request works
- [ ] User code is valid format (8 chars, no ambiguous chars)
- [ ] Device approval page loads
- [ ] User can approve device
- [ ] User can deny device
- [ ] Token polling works
- [ ] Token polling handles authorization_pending
- [ ] Token polling handles slow_down
- [ ] Token polling handles access_denied
- [ ] Token polling handles expired_token
- [ ] Access token works for API calls
- [ ] Refresh token works
- [ ] Connected devices dashboard shows devices
- [ ] Revoking device works
- [ ] MCP server authentication flow works end-to-end

---

## Phase 6: Deployment (Day 5)

### Step 6.1: Environment Variables

Ensure these are set in production:

```bash
BETTER_AUTH_SECRET=<secure-random-secret>
BETTER_AUTH_URL=https://cronicorn.com
WEB_URL=https://cronicorn.com
GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-client-secret>
```

### Step 6.2: Database Migration

Run migrations in production:

```bash
pnpm migrate
```

### Step 6.3: Deploy API

Deploy updated API with device flow plugin.

### Step 6.4: Deploy Web UI

Deploy updated web app with device approval page and connected devices dashboard.

### Step 6.5: Publish MCP Server

Publish MCP server to npm:

```bash
cd apps/mcp-server
pnpm build
npm publish --access public
```

### Step 6.6: Documentation

Update:
- [ ] API documentation
- [ ] User guides
- [ ] Developer documentation
- [ ] ai.txt/ai-integration.md
- [ ] README.md
- [ ] CHANGELOG.md

---

## Success Metrics

### User Experience
- [ ] Time to onboard with AI agent: < 1 minute
- [ ] Device approval success rate: > 95%
- [ ] User satisfaction: "Easy to connect AI agents"

### Technical
- [ ] Device code expiration: 30 minutes
- [ ] Token polling interval: 5 seconds
- [ ] Access token expiration: 1 hour
- [ ] Refresh token expiration: 30 days
- [ ] Zero security incidents

### Adoption
- [ ] Track OAuth adoption rate among AI agent users
- [ ] Monitor device flow usage vs API key usage
- [ ] Track which clients are most popular

---

## Rollback Plan

If issues arise:

1. **Disable device flow plugin:**
   ```typescript
   // Comment out in auth/config.ts
   // deviceAuthorization({ ... }),
   ```

2. **Hide UI pages:**
   ```typescript
   // Add middleware to block access
   ```

3. **Redeploy API without plugin**

4. **Communicate with users who started device flow**

---

## Future Enhancements

### Phase 2 (Future)
- [ ] Dynamic client registration (allow any client)
- [ ] Scoped permissions (read-only, write-only, etc.)
- [ ] Device location tracking
- [ ] Usage analytics per device
- [ ] Email notifications on new device authorization
- [ ] Rate limiting per device
- [ ] Suspicious activity detection

### Phase 3 (Future)
- [ ] MCP server with more advanced tools
- [ ] CLI tool with device flow
- [ ] Browser extension
- [ ] Mobile app support

---

## Resources

- [Better Auth Device Flow Docs](https://better-auth.com/docs/plugins/device-authorization)
- [OAuth 2.0 Device Flow RFC](https://www.rfc-editor.org/rfc/rfc8628.html)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [Our Research Doc](./research-oauth-device-flow.md)
- [Better Auth Investigation](./better-auth-investigation.md)

---

## Questions?

Contact: [your-email@cronicorn.com](mailto:your-email@cronicorn.com)
