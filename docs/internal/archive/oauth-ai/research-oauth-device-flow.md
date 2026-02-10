# OAuth Device Flow for AI Agents - Research & Strategy

## Executive Summary

OAuth 2.0 Device Authorization Flow is the industry standard for authenticating AI agents, CLI tools, and input-constrained devices. This allows users to authorize AI agents (GitHub Copilot, Claude Desktop, Cursor) to access Cronicorn without manually creating and managing API keys.

**Time to implement:** ~1 week  
**User experience improvement:** 5 minutes → 30 seconds onboarding

---

## 🎯 The Problem

Currently, users wanting to use Cronicorn with AI agents must:
1. Sign in to Cronicorn dashboard via GitHub OAuth
2. Navigate to Settings → API Keys
3. Create an API key
4. Copy the key
5. Find their AI agent's config file
6. Paste the key into the config
7. Restart the AI agent
8. Tell the agent to try again

**Total time:** ~5 minutes, error-prone, manual configuration

---

## ✅ The Solution: OAuth Device Flow

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     DEVICE FLOW                             │
└─────────────────────────────────────────────────────────────┘

1. USER: "Set up Cronicorn monitoring for my app"
   └─ AI Agent: Makes request to Cronicorn's device flow endpoint

2. CRONICORN API: Returns
   {
     "device_code": "NgAyZDk...",
     "user_code": "WDJB-MJHT",
     "verification_uri": "https://cronicorn.com/activate",
     "verification_uri_complete": "https://cronicorn.com/activate?user_code=WDJB-MJHT",
     "expires_in": 1800,
     "interval": 5
   }

3. AI AGENT: Shows user
   "Visit https://cronicorn.com/activate and enter code: WDJB-MJHT"
   (or) "Visit this link: https://cronicorn.com/activate?user_code=WDJB-MJHT"

4. USER: Opens browser, visits link
   - Already has GitHub OAuth session? → Auto-authenticated
   - Not logged in? → GitHub OAuth flow → authenticated
   - Sees: "Authorize GitHub Copilot to access Cronicorn?"
   - Clicks "Authorize"

5. AI AGENT: (Polling every 5 seconds)
   POST /oauth/token {
     grant_type: "urn:ietf:params:oauth:grant-type:device_code",
     device_code: "NgAyZDk...",
     client_id: "github-copilot"
   }

   First few polls: {"error": "authorization_pending"}
   After user authorizes: {
     "access_token": "cronicorn_abc123...",
     "refresh_token": "cronicorn_refresh_xyz...",
     "token_type": "Bearer",
     "expires_in": 3600
   }

6. AI AGENT: Stores token securely, uses for all future requests
   Authorization: Bearer cronicorn_abc123...
```

**Total time:** ~30 seconds, zero configuration files!

---

## 🏢 Industry Examples

### 1. **GitHub CLI**
```bash
$ gh auth login
! First copy your one-time code: WDJB-MJHT
- Press Enter to open github.com in your browser...
✓ Authentication complete. Press Enter to continue...
```

### 2. **AWS CLI**
```bash
$ aws sso login
Attempting to automatically open the SSO authorization page in your browser...
Enter code: QWERTY-123456
```

### 3. **Stripe CLI**
```bash
$ stripe login
Your pairing code is: enjoy-divine-enough-win
Press Enter to open the browser (^C to quit)
```

### 4. **Notion MCP** (October 2025)
Notion just launched an MCP server using OAuth for authentication - same pattern!

### 5. **Azure MCP Servers**
Microsoft's reference implementation uses device flow for MCP authentication with Entra ID.

---

## 🔑 Two Authentication Methods (Both Valid)

### Method 1: API Keys (Current - Still Important!)

**Use case:** Direct API access, programmatic integration, non-AI tools

```typescript
const response = await fetch('https://cronicorn.com/api/v1/jobs', {
  headers: {
    'x-api-key': 'cronicorn_key_abc123...'
  }
});
```

**Good for:**
- ✅ Server-to-server integrations
- ✅ CI/CD pipelines
- ✅ Custom scripts
- ✅ Webhook handlers
- ✅ Users who want full control

**Created by:** User manually in dashboard  
**Expires:** Never (unless revoked)  
**Stored by:** User (in env vars, configs)

---

### Method 2: OAuth Device Flow (New - For AI Agents)

**Use case:** AI agents, CLI tools, interactive environments

```typescript
const response = await fetch('https://cronicorn.com/api/v1/jobs', {
  headers: {
    'Authorization': 'Bearer oauth_token_xyz789...'
  }
});
```

**Good for:**
- ✅ GitHub Copilot, Claude Desktop, Cursor
- ✅ MCP servers
- ✅ Interactive CLI tools
- ✅ Users who want zero friction

**Created by:** Automatically via OAuth flow  
**Expires:** Yes (1 hour, auto-refreshed)  
**Stored by:** AI agent/MCP server (secure storage)

---

## 📊 Comparison Matrix

| | API Keys | OAuth Tokens |
|---|---|---|
| **Created by** | User manually in dashboard | Automatically via OAuth flow |
| **User action** | Copy/paste into config | Authorize once in browser |
| **Stored by** | User (in env vars, configs) | AI agent/MCP server (secure storage) |
| **Expires** | Never (unless revoked) | Yes (1 hour, auto-refreshed) |
| **Scopes** | Full access | Can be limited (read-only, etc.) |
| **Revocation** | Manual in dashboard | User can revoke per-application |
| **Best for** | Code integration | AI agent integration |

---

## 🎯 User Experience Scenarios

### Scenario 1: AI Agent User (GitHub Copilot)

**OLD WAY (API Keys):**
1. Visit Cronicorn dashboard
2. Create account via GitHub OAuth
3. Navigate to Settings → API Keys
4. Click "Create API Key"
5. Copy key: cronicorn_key_abc123...
6. Find Copilot config file
7. Paste key into config
8. Restart Copilot
9. Tell Copilot to try again

**Result:** ~5 minutes, lots of manual steps

**NEW WAY (OAuth):**
1. Tell Copilot to connect
2. Copilot shows: "Visit cronicorn.com/activate, enter code WDJB-MJHT"
3. User opens link, clicks "Authorize" (already logged in via GitHub OAuth)
4. Done!

**Result:** ~30 seconds, zero config files

---

### Scenario 2: Production App Integration

```typescript
// Next.js API route that creates Cronicorn jobs

// ❌ OAuth would be overkill here
// ✅ API Key is perfect:

// .env
CRONICORN_API_KEY=cronicorn_key_abc123...

// api/cron/setup.ts
const response = await fetch('https://cronicorn.com/api/v1/jobs', {
  headers: { 'x-api-key': process.env.CRONICORN_API_KEY }
});
```

---

## 🏗️ Technical Architecture

### Required Components

#### 1. Backend (API)

```
apps/api/src/routes/oauth/
├── device.ts           # POST /oauth/device/authorize
├── activate.ts         # GET /activate (web UI)
├── token.ts            # POST /oauth/token (polling endpoint)
└── clients.ts          # Register known clients (GitHub Copilot, Claude, etc.)
```

#### 2. Database Tables

```sql
-- Device codes table (for OAuth flow)
CREATE TABLE device_codes (
  device_code TEXT PRIMARY KEY,
  user_code TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id), -- NULL until authorized
  scopes TEXT[], -- ["jobs:read", "jobs:write", ...]
  status TEXT DEFAULT 'pending', -- pending | authorized | expired | denied
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth tokens table
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  client_id TEXT NOT NULL, -- "github-copilot", "claude-desktop", etc.
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT,
  scopes TEXT[], -- ["jobs:read", "jobs:write", ...]
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- OAuth clients (pre-registered known clients)
CREATE TABLE oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_type TEXT DEFAULT 'public', -- public | confidential
  redirect_uris TEXT[],
  allowed_scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. Frontend (Web)

```
apps/web/src/pages/
└── activate.tsx        # User-facing activation page
    - Shows "Enter code" input (if no ?user_code param)
    - Shows authorization prompt
    - Handles OAuth if not logged in
    - Confirms authorization
```

#### 4. MCP Server

```
apps/mcp-server/
└── auth/
    ├── device-flow.ts     # Implements device flow client-side
    ├── token-storage.ts   # Secure token persistence
    └── token-refresh.ts   # Auto-refresh expired tokens
```

---

### Authentication Middleware

```typescript
// apps/api/src/auth/middleware.ts

export async function requireAuth(c: Context, next: Next) {
  // Try API key first (x-api-key header)
  const apiKey = c.req.header('x-api-key');
  if (apiKey) {
    const user = await validateApiKey(apiKey);
    if (user) {
      c.set('userId', user.id);
      return next();
    }
  }

  // Try OAuth bearer token (Authorization: Bearer ...)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await validateOAuthToken(token);
    if (user) {
      c.set('userId', user.id);
      return next();
    }
  }

  // Neither worked
  return c.json({ error: 'Unauthorized' }, 401);
}
```

---

## 📋 OAuth Endpoints Specification

### 1. Device Authorization Request

```http
POST /api/oauth/device/authorize
Content-Type: application/json

{
  "client_id": "github-copilot",
  "scope": "jobs:read jobs:write endpoints:write"
}

Response 200:
{
  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://cronicorn.com/activate",
  "verification_uri_complete": "https://cronicorn.com/activate?user_code=WDJB-MJHT",
  "expires_in": 1800,
  "interval": 5
}
```

### 2. User Activation Page

```http
GET /activate?user_code=WDJB-MJHT

Response: HTML page showing
- Device code confirmation
- Client name (e.g., "GitHub Copilot")
- Requested scopes
- [Authorize] and [Deny] buttons
```

### 3. Token Request (Polling)

```http
POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "client_id": "github-copilot"
}

Response 400 (pending):
{
  "error": "authorization_pending",
  "error_description": "User has not yet authorized the device"
}

Response 200 (authorized):
{
  "access_token": "cronicorn_oauth_abc123...",
  "refresh_token": "cronicorn_refresh_xyz789...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "jobs:read jobs:write endpoints:write"
}

Response 400 (denied):
{
  "error": "access_denied",
  "error_description": "User denied the authorization request"
}

Response 400 (expired):
{
  "error": "expired_token",
  "error_description": "Device code has expired"
}
```

### 4. Token Refresh

```http
POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "cronicorn_refresh_xyz789...",
  "client_id": "github-copilot"
}

Response 200:
{
  "access_token": "cronicorn_oauth_new_abc456...",
  "refresh_token": "cronicorn_refresh_new_uvw123...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "jobs:read jobs:write endpoints:write"
}
```

---

## 🎨 Dashboard UI Changes

Users will see both authentication methods in their dashboard:

```
┌─────────────────────────────────────────────────┐
│ Settings → Authentication                       │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🔑 API Keys                                     │
│ ─────────────────────────────────────────────── │
│ For server integrations, scripts, and apps      │
│                                                 │
│ [Create New API Key]                            │
│                                                 │
│ • Production API (cronicorn_key_abc1...)        │
│   Last used: 2 hours ago                        │
│   [Revoke]                                      │
│                                                 │
│ • CI/CD Pipeline (cronicorn_key_def4...)        │
│   Last used: 1 day ago                          │
│   [Revoke]                                      │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🤖 Connected AI Agents                          │
│ ─────────────────────────────────────────────── │
│ Apps authorized via OAuth                       │
│                                                 │
│ • GitHub Copilot                                │
│   Authorized: Oct 31, 2025                      │
│   Last used: 5 minutes ago                      │
│   Scopes: jobs:read, jobs:write                 │
│   [Revoke Access]                               │
│                                                 │
│ • Claude Desktop                                │
│   Authorized: Oct 29, 2025                      │
│   Last used: 2 days ago                         │
│   Scopes: jobs:read                             │
│   [Revoke Access]                               │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📦 Pre-Registered OAuth Clients

```typescript
// Well-known AI clients (no client_secret required - public clients)
const KNOWN_CLIENTS = {
  'github-copilot': {
    name: 'GitHub Copilot',
    type: 'public',
    allowed_scopes: ['jobs:read', 'jobs:write', 'endpoints:write', 'runs:read']
  },
  'claude-desktop': {
    name: 'Claude Desktop',
    type: 'public',
    allowed_scopes: ['jobs:read', 'jobs:write', 'endpoints:write', 'runs:read']
  },
  'cursor': {
    name: 'Cursor',
    type: 'public',
    allowed_scopes: ['jobs:read', 'jobs:write', 'endpoints:write', 'runs:read']
  },
  'cronicorn-cli': {
    name: 'Cronicorn CLI',
    type: 'public',
    allowed_scopes: ['jobs:read', 'jobs:write', 'endpoints:write', 'runs:read']
  }
};
```

---

## 🔒 Security Considerations

### Device Code Generation
- Use cryptographically secure random bytes (32+ bytes)
- Hash device codes before storing in database
- Short expiration time (30 minutes)

### User Code Generation
- Use character set without ambiguous characters (no 0/O, 1/I/l)
- Format: XXXX-XXXX (8 characters, dash-separated)
- Case-insensitive comparison

### Token Security
- Hash access tokens and refresh tokens before storing
- Use short-lived access tokens (1 hour)
- Long-lived refresh tokens (30 days, sliding window)
- Implement token rotation on refresh

### Rate Limiting
- Limit device authorization requests: 5 per minute per IP
- Limit token polling: Respect `interval` from device authorization response
- Implement slow-down: If client polls too fast, increase `interval`

### Scopes
- Implement granular scopes (read-only vs write)
- Display scopes clearly to user during authorization
- Allow users to revoke specific scopes

---

## 📊 Effort Estimate

| Component | Effort | Priority |
|-----------|--------|----------|
| Device flow endpoints (API) | 2-3 days | **High** |
| Activation page (Web UI) | 1 day | **High** |
| Token management (DB + logic) | 1 day | **High** |
| OAuth middleware (support both auth types) | 0.5 days | **High** |
| Dashboard UI (show connected apps) | 1 day | Medium |
| MCP client auth integration | 2 days | Medium |
| Documentation (ai.txt update) | 0.5 days | **High** |
| **Total** | **~1 week** | |

---

## 🎯 Success Metrics

### User Experience
- Time to onboard with AI agent: **< 1 minute**
- User satisfaction: "Easy to connect AI agents"
- Support tickets: Fewer "How do I get API key?" questions

### Technical
- OAuth adoption rate among AI agent users
- Token refresh success rate > 99%
- Zero security incidents related to OAuth flow

---

## 📚 References

### OAuth 2.0 Device Flow Specification
- RFC 8628: https://www.rfc-editor.org/rfc/rfc8628.html
- OAuth.com Device Flow: https://www.oauth.com/oauth2-servers/device-flow/

### Real-World Implementations
- GitHub CLI: https://cli.github.com/
- AWS SSO: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Azure MCP Servers: https://github.com/azure-samples/mcp-auth-servers
- AWS MCP Guidance: https://github.com/aws-solutions-library-samples/guidance-for-deploying-model-context-protocol-servers-on-aws

### Model Context Protocol
- MCP Specification: https://modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Notion MCP: https://developers.notion.com/docs/mcp

---

## ✅ Conclusion

OAuth Device Flow is the industry-standard solution for AI agent authentication. It provides:

1. **Better UX:** 30 seconds vs 5 minutes onboarding
2. **Better Security:** Scoped tokens, automatic expiration, per-app revocation
3. **Better Integration:** AI agents handle token management transparently
4. **Future-Proof:** Standard protocol supported across the ecosystem

**Recommendation:** Implement OAuth Device Flow while maintaining API key support for direct integrations.
