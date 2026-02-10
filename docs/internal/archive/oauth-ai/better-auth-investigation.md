# Better Auth OAuth Device Flow Investigation

## Summary

✅ **Better Auth DOES support OAuth 2.0 Device Authorization Flow via the `deviceAuthorization` plugin!**

This plugin was specifically designed for input-constrained devices and is perfect for our AI agent authentication use case.

---

## Better Auth Device Flow Plugin

### Installation

Better Auth has a built-in `deviceAuthorization` plugin that implements the complete OAuth 2.0 Device Flow (RFC 8628).

```typescript
import { betterAuth } from "better-auth";
import { deviceAuthorization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    deviceAuthorization({
      expiresIn: "30m",      // Device code expiration (default: 15 minutes)
      interval: "5s",        // Minimum polling interval (default: 5 seconds)
      userCodeLength: 8,     // User code length (default: 8)
      deviceCodeExpiresIn: 600, // Alternative expiration in seconds
      pollingInterval: 5,    // Alternative interval in seconds
    }),
  ],
});
```

---

## Endpoints Provided by Plugin

The `deviceAuthorization` plugin automatically creates these endpoints:

### 1. **POST /device/code** - Request Device Code

**Request:**
```json
{
  "client_id": "github-copilot",
  "scope": "openid profile email"
}
```

**Response:**
```json
{
  "device_code": "GmR_zT_G5_Jq_e_s_q_E_n_R_l_x_Z_r_s_y_u_o_P_w_e_s_L_a_c_i",
  "user_code": "ABCD-EFGH",
  "verification_uri": "https://cronicorn.com/device",
  "verification_uri_complete": "https://cronicorn.com/device?user_code=ABCD-EFGH",
  "expires_in": 1800,
  "interval": 5
}
```

### 2. **GET /device** - Verify User Code

**Request:**
```http
GET /device?user_code=ABCD-EFGH
```

**Response:**
```json
{
  "status": "verified"
}
```

### 3. **POST /device/approve** - User Approves Device

**Request:**
```json
{
  "userCode": "ABCD-EFGH"
}
```

**Response:**
```json
{
  "message": "Device approved successfully"
}
```

### 4. **POST /device/deny** - User Denies Device

**Request:**
```json
{
  "userCode": "ABCD-EFGH"
}
```

**Response:**
```json
{
  "message": "Device denied successfully"
}
```

### 5. **POST /device/token** - Poll for Token

**Request:**
```json
{
  "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
  "device_code": "GmR_zT_G5_Jq_e_s_q_E_n_R_l_x_Z_r_s_y_u_o_P_w_e_s_L_a_c_i",
  "client_id": "github-copilot"
}
```

**Response (Pending):**
```json
{
  "error": "authorization_pending",
  "error_description": "User has not yet authorized the device"
}
```

**Response (Success):**
```json
{
  "access_token": "eyJraWQiOiJmQ1...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJraWQiOiJmQ1...",
  "scope": "openid profile email"
}
```

**Response (Denied):**
```json
{
  "error": "access_denied",
  "error_description": "User denied the authorization request"
}
```

**Response (Expired):**
```json
{
  "error": "expired_token",
  "error_description": "Device code has expired"
}
```

---

## Client-Side Usage

Better Auth also provides client-side helpers for device flow:

```typescript
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  baseURL: "https://cronicorn.com",
  plugins: [deviceAuthorizationClient()],
});

// Request device code
const { data } = await authClient.device.code({
  client_id: "github-copilot",
  scope: "openid profile email jobs:read jobs:write",
});

console.log("Visit:", data.verification_uri);
console.log("Enter code:", data.user_code);

// Poll for token
const result = await authClient.device.token({
  grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  device_code: data.device_code,
  client_id: "github-copilot",
});

if (result.data?.access_token) {
  console.log("Authorized!", result.data.access_token);
}
```

---

## Advanced Configuration

### Custom Code Generation

```typescript
deviceAuthorization({
  generateDeviceCode: async () => {
    // Custom device code generation (secure random bytes)
    return crypto.randomBytes(32).toString("hex");
  },
  
  generateUserCode: async () => {
    // Custom user code generation
    // Default uses: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
    // (excludes 0, O, 1, I to avoid confusion)
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += charset[Math.floor(Math.random() * charset.length)];
    }
    return code;
  }
})
```

### Client Validation

```typescript
deviceAuthorization({
  validateClient: async (clientId) => {
    // Check if client is authorized for device flow
    const client = await db.oauth_clients.findOne({ id: clientId });
    return client && client.allowDeviceFlow;
  },
  
  onDeviceAuthRequest: async (clientId, scope) => {
    // Log device authorization requests
    await logDeviceAuthRequest(clientId, scope);
  }
})
```

---

## Database Schema

Better Auth automatically handles the database schema for device authorization. No manual table creation needed!

The plugin manages:
- Device codes
- User codes
- Device approval status
- Token issuance

---

## How It Works with Our Current Setup

### Current Cronicorn Auth Setup

```typescript
// apps/api/src/auth/config.ts
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
    ],
  });
}
```

### Updated Setup with Device Flow

```typescript
// apps/api/src/auth/config.ts
import { deviceAuthorization } from "better-auth/plugins"; // ADD THIS

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
      // ADD THIS
      deviceAuthorization({
        expiresIn: "30m",      // 30 minutes for user to authorize
        interval: "5s",        // Poll every 5 seconds
        userCodeLength: 8,     // XXXX-XXXX format
      }),
    ],
  });
}
```

---

## Authentication Middleware Updates

Our existing middleware already supports multiple auth methods. We just need to ensure OAuth tokens work:

```typescript
// apps/api/src/auth/middleware.ts

export async function requireAuth(c: Context, next: Next) {
  const auth = c.get("auth");

  // Try API key first (x-api-key header)
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

  // Try OAuth bearer token (Authorization: Bearer ...)
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    
    if (session?.user) {
      c.set("userId", session.user.id);
      c.set("session", session);
      return next();
    }
  }

  // Neither worked
  return c.json({ error: "Unauthorized" }, 401);
}
```

**Note:** Better Auth's device flow automatically issues JWT tokens that can be validated via `auth.api.getSession()`. No additional token validation logic needed!

---

## Advantages of Using Better Auth's Plugin

### ✅ What We Get for Free

1. **Complete RFC 8628 Implementation**
   - Proper device code generation
   - User code generation (no ambiguous characters)
   - Token polling with error handling
   - Automatic expiration

2. **Database Schema Management**
   - Automatic migrations
   - Proper indexing
   - Device code storage
   - Token management

3. **Client-Side Helpers**
   - TypeScript client library
   - Built-in polling logic
   - Error handling

4. **Security Best Practices**
   - Cryptographically secure code generation
   - Rate limiting support
   - Token expiration
   - Scope validation

5. **Integration with Existing Auth**
   - Works alongside GitHub OAuth
   - Works alongside API keys
   - Shares same session management
   - Unified user model

---

## What We Still Need to Build

### 1. **Device Approval UI Page**

Better Auth provides the backend endpoints, but we need a frontend page for users to approve devices.

```typescript
// apps/web/src/pages/device/approve.tsx

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-client";

export default function DeviceApprovalPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const userCode = searchParams.get("user_code");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await authClient.device.approve({
        userCode: userCode,
      });
      alert("Device approved successfully!");
      window.location.href = "/dashboard";
    } catch (error) {
      alert("Failed to approve device");
    }
    setIsProcessing(false);
  };
  
  const handleDeny = async () => {
    setIsProcessing(true);
    try {
      await authClient.device.deny({
        userCode: userCode,
      });
      alert("Device denied");
      window.location.href = "/dashboard";
    } catch (error) {
      alert("Failed to deny device");
    }
    setIsProcessing(false);
  };

  if (!user) {
    // Redirect to login if not authenticated
    window.location.href = `/login?redirect=/device/approve?user_code=${userCode}`;
    return null;
  }
  
  return (
    <div>
      <h2>Device Authorization Request</h2>
      <p>A device is requesting access to your account.</p>
      <p><strong>Code:</strong> {userCode}</p>
      
      <button onClick={handleApprove} disabled={isProcessing}>
        Approve
      </button>
      <button onClick={handleDeny} disabled={isProcessing}>
        Deny
      </button>
    </div>
  );
}
```

### 2. **Dashboard UI for Connected Devices**

Show users which AI agents/devices have access to their account.

```typescript
// apps/web/src/pages/settings/connected-devices.tsx

export default function ConnectedDevicesPage() {
  const [devices, setDevices] = useState([]);
  
  useEffect(() => {
    // Fetch user's active OAuth sessions
    fetchDevices();
  }, []);
  
  const revokeDevice = async (sessionId: string) => {
    await authClient.revokeSession({ sessionId });
    fetchDevices();
  };
  
  return (
    <div>
      <h2>🤖 Connected AI Agents</h2>
      {devices.map(device => (
        <div key={device.id}>
          <strong>{device.clientName}</strong>
          <p>Authorized: {device.createdAt}</p>
          <p>Last used: {device.lastUsedAt}</p>
          <button onClick={() => revokeDevice(device.id)}>
            Revoke Access
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 3. **Client Registration**

We need to pre-register known OAuth clients (GitHub Copilot, Claude Desktop, etc.).

Better Auth supports dynamic client registration, but for AI agents, we can pre-register them:

```typescript
// Database seed or migration
const KNOWN_CLIENTS = [
  {
    client_id: "github-copilot",
    client_name: "GitHub Copilot",
    client_type: "public",
    allowed_scopes: ["openid", "profile", "email", "jobs:read", "jobs:write"],
  },
  {
    client_id: "claude-desktop",
    client_name: "Claude Desktop",
    client_type: "public",
    allowed_scopes: ["openid", "profile", "email", "jobs:read", "jobs:write"],
  },
  {
    client_id: "cursor",
    client_name: "Cursor",
    client_type: "public",
    allowed_scopes: ["openid", "profile", "email", "jobs:read", "jobs:write"],
  },
];
```

We can use Better Auth's `validateClient` hook to check these:

```typescript
deviceAuthorization({
  validateClient: async (clientId) => {
    return KNOWN_CLIENTS.some(c => c.client_id === clientId);
  },
});
```

---

## MCP Server Integration

Once device flow is enabled, our MCP server can use it:

```typescript
// apps/mcp-server/src/auth/device-flow.ts

import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import open from "open";

const authClient = createAuthClient({
  baseURL: "https://cronicorn.com",
  plugins: [deviceAuthorizationClient()],
});

export async function authenticateMCP() {
  console.log("🔐 Cronicorn Authentication");
  console.log("⏳ Requesting device authorization...");
  
  // Request device code
  const { data, error } = await authClient.device.code({
    client_id: "github-copilot",
    scope: "openid profile email jobs:read jobs:write",
  });
  
  if (error || !data) {
    console.error("❌ Error:", error?.error_description);
    process.exit(1);
  }
  
  const {
    device_code,
    user_code,
    verification_uri_complete,
    interval = 5,
  } = data;
  
  console.log("\n📱 Please authorize this device");
  console.log(`Code: ${user_code}\n`);
  
  // Open browser
  if (verification_uri_complete) {
    console.log("🌐 Opening browser...");
    await open(verification_uri_complete);
  }
  
  console.log(`⏳ Waiting for authorization... (polling every ${interval}s)`);
  
  // Poll for token
  return pollForToken(device_code, interval);
}

async function pollForToken(deviceCode: string, interval: number) {
  let pollingInterval = interval;
  
  while (true) {
    await new Promise(resolve => setTimeout(resolve, pollingInterval * 1000));
    
    const { data, error } = await authClient.device.token({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
      client_id: "github-copilot",
    });
    
    if (data?.access_token) {
      console.log("\n✅ Authorization successful!");
      return data.access_token;
    }
    
    if (error) {
      switch (error.error) {
        case "authorization_pending":
          // Continue polling
          break;
        case "slow_down":
          pollingInterval += 5;
          console.log(`⚠️ Slowing down polling to ${pollingInterval}s`);
          break;
        case "access_denied":
          throw new Error("Access was denied by the user");
        case "expired_token":
          throw new Error("Device code has expired. Please try again.");
        default:
          throw new Error(error.error_description);
      }
    }
  }
}
```

---

## Conclusion

### ✅ Recommendation: **Use Better Auth's Device Flow Plugin**

**Pros:**
- ✅ Complete RFC 8628 implementation
- ✅ Already integrated with our auth system
- ✅ Automatic database schema management
- ✅ Client-side helpers included
- ✅ Security best practices built-in
- ✅ Works alongside existing GitHub OAuth and API keys
- ✅ TypeScript support

**Cons:**
- ❌ Need to build device approval UI page
- ❌ Need to build connected devices dashboard
- ❌ Need to document client registration

**Effort:** ~3-4 days instead of 1+ week for custom implementation

---

## Next Steps

1. ✅ Add `deviceAuthorization` plugin to Better Auth config
2. ✅ Update auth middleware to support OAuth tokens
3. ✅ Create device approval UI page
4. ✅ Create connected devices dashboard
5. ✅ Pre-register known OAuth clients
6. ✅ Test full flow with MCP server
7. ✅ Update documentation (ai.txt)
