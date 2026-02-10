# Implementation Gaps & Open Questions

**Purpose:** Identify unknowns and decisions that must be resolved before starting OAuth + MCP implementation.

**Status:** ⚠️ BLOCKERS - Must resolve before Phase 1 starts

---

## Critical Decisions Needed

### 1. NPM Package Publishing Strategy

**Question:** How will `@cronicorn/mcp-server` be published and versioned?

**Options:**
- **A) Monorepo Package** - Keep in `/packages/mcp-server`, publish separately
- **B) Standalone App** - Move to `/apps/mcp-server`, publish from there
- **C) External Repo** - Separate repository entirely

**Recommendation:** **Option B (Standalone App)**

**Rationale:**
- MCP server is a standalone CLI tool, not a library
- Lives in `/apps/mcp-server` alongside other apps (api, scheduler, web)
- Can reference shared packages (`@cronicorn/api-contracts`, `@cronicorn/domain`)
- Published to npm as `@cronicorn/mcp-server`
- Uses same build pipeline as other apps

**Action Items:**
- [ ] Create `/apps/mcp-server` directory
- [ ] Set up `package.json` with `"bin": "./dist/index.js"`
- [ ] Configure tsconfig to reference shared packages
- [ ] Add npm publish script to CI/CD
- [ ] Register `@cronicorn` org on npm if not already done

**Blocker Severity:** 🔴 HIGH - Can't test end-to-end flow without published package

---

### 2. OAuth Token Storage in MCP Server

**Question:** How does the MCP server persist OAuth tokens after device flow completes?

**Context:**
- MCP server runs as a long-lived process managed by AI agent
- After OAuth device flow, server receives access token + refresh token
- Tokens must be stored securely for subsequent API calls
- Must survive MCP server restarts

**Options:**

#### A) File-Based Storage (Recommended)
```typescript
// ~/.cronicorn/credentials.json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1234567890,
  "user_id": "usr_xxx"
}
```

**Pros:**
- Simple, standard approach (used by AWS CLI, gcloud CLI, etc.)
- Survives process restarts
- Easy to revoke (just delete file)

**Cons:**
- File permissions must be restricted (chmod 600)
- Not encrypted at rest (OS-level protection only)

#### B) OS Keychain
```typescript
import keytar from 'keytar';

await keytar.setPassword('cronicorn', 'oauth_token', token);
```

**Pros:**
- Encrypted by OS
- More secure than plaintext file

**Cons:**
- Additional dependency
- Keychain prompts may confuse users
- Not available on all platforms

#### C) Environment Variable (Not Recommended)
```bash
CRONICORN_ACCESS_TOKEN=xxx npx @cronicorn/mcp-server
```

**Pros:**
- No file I/O

**Cons:**
- Doesn't survive restarts
- Tokens in shell history
- Difficult for users to manage

**Recommendation:** **Option A (File-Based)**

**Implementation:**
```typescript
// packages/mcp-server/src/auth/token-store.ts

const TOKEN_PATH = path.join(os.homedir(), '.cronicorn', 'credentials.json');

export async function saveTokens(tokens: {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
}) {
  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), {
    mode: 0o600 // Read/write for owner only
  });
}

export async function loadTokens(): Promise<TokenData | null> {
  try {
    const data = await fs.readFile(TOKEN_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function clearTokens() {
  await fs.rm(TOKEN_PATH, { force: true });
}
```

**Action Items:**
- [ ] Implement token storage module
- [ ] Add token refresh logic when `expires_at` is near
- [ ] Document revocation process in UX modal
- [ ] Add `cronicorn logout` command to clear tokens

**Blocker Severity:** 🟡 MEDIUM - Can mock in development, but needed for production

---

### 3. API Client Reuse vs. New Creation

**Question:** Should MCP server reuse existing `@cronicorn/api-client` package or create a minimal client?

**Context:**
- We may have an existing API client in `/packages/api-client`
- MCP server needs to call API endpoints (POST /jobs, GET /jobs, etc.)
- Client must handle authentication (inject OAuth token)

**Options:**

#### A) Reuse Existing Client (If exists)
```typescript
import { createClient } from '@cronicorn/api-client';

const client = createClient({
  baseUrl: process.env.CRONICORN_API_URL,
  auth: { token: accessToken }
});

await client.jobs.create({ name: "...", ... });
```

**Pros:**
- No duplication
- Type-safe if client is generated from OpenAPI
- Consistent with other consumers

**Cons:**
- May have browser-specific dependencies
- Could be overkill for MCP server's simple needs

#### B) Create Minimal Client in MCP Package
```typescript
// apps/mcp-server/src/api/client.ts

export class CronicornClient {
  constructor(private baseUrl: string, private token: string) {}

  async createJob(data: CreateJobInput) {
    const res = await fetch(`${this.baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
    return res.json();
  }

  // ... other methods
}
```

**Pros:**
- Lightweight, no extra dependencies
- Full control over error handling
- Easy to debug

**Cons:**
- Manual typing
- Code duplication if client exists elsewhere

**Recommendation:** **Option B (Minimal Client) for MVP**

**Rationale:**
- MCP server only needs 5-6 endpoints initially
- Can always refactor to shared client later
- Reduces coupling during development
- Easier to handle MCP-specific error formatting

**Action Items:**
- [ ] Create `/apps/mcp-server/src/api/client.ts`
- [ ] Implement methods for: `createJob`, `listJobs`, `getJob`, `addEndpoint`, `pauseJob`
- [ ] Share types from `@cronicorn/api-contracts` if available
- [ ] Add retry logic for network errors

**Blocker Severity:** 🟢 LOW - Can implement quickly during Phase 1

---

### 4. Modal Component Design & Placement

**Question:** Where does the "Connect AI Agent" modal live, and how is it triggered?

**Current State:**
- Dashboard exists at `/apps/web`
- Likely using shadcn/ui components
- Need to integrate modal into existing UI

**Decisions Needed:**

#### Modal Location
```
apps/web/src/
  components/
    modals/
      ConnectAIAgentModal.tsx  ← New file
      index.ts
```

#### Trigger Button Locations (Priority Order)
1. **Dashboard Hero Section** - Primary CTA
2. **Jobs Empty State** - Contextual suggestion
3. **Settings → Integrations** - Expected location
4. **API Keys Page** - Alternative method callout

#### State Management
```typescript
// apps/web/src/stores/ui-store.ts (or wherever global UI state lives)

interface UIStore {
  aiAgentModalOpen: boolean;
  openAIAgentModal: () => void;
  closeAIAgentModal: () => void;
}
```

**Recommendation:** Use existing UI patterns in `/apps/web`

**Action Items:**
- [ ] Check if modal component library exists (shadcn Dialog?)
- [ ] Identify global state management pattern (Zustand? Context? Jotai?)
- [ ] Create modal component following existing patterns
- [ ] Add trigger buttons in 4 locations
- [ ] Wire up analytics events

**Blocker Severity:** 🟡 MEDIUM - UX depends on existing patterns

---

### 5. ai.txt vs. ai-integration.md Location

**Question:** Should we create `ai.txt` at root, or a more detailed Markdown file?

**Context:**
- `ai.txt` is emerging standard for AI agent discovery
- Lives at `https://cronicorn.com/ai.txt` (or `/.well-known/ai.txt`)
- AI agents may parse it automatically

**Options:**

#### A) Simple ai.txt (Recommended for MVP)
```txt
# Cronicorn - Adaptive Job Scheduler

AI-friendly integration available via MCP server.

## Quick Setup
Install: npx -y @cronicorn/mcp-server
Auth: OAuth 2.0 Device Flow (auto-triggered)
Docs: https://cronicorn.com/docs/ai-integration

## Capabilities
- Create HTTP jobs with natural language
- Configure cron schedules or intervals
- Monitor job health and execution history
- Pause/resume jobs dynamically
- Get integration suggestions

## Example Prompts
"Create a job that hits https://example.com/backup every day at 2am"
"Show me my failing jobs from the last week"
"Pause the data-sync job until next Monday"

Learn more: https://cronicorn.com/docs/ai-integration
```

**Location:** `apps/web/public/ai.txt`

#### B) Detailed Markdown Guide
```markdown
# AI Integration Guide

[Full tutorial with screenshots, code samples, etc.]
```

**Location:** `apps/web/src/content/docs/ai-integration.md`

**Recommendation:** **Both**

**Rationale:**
- `ai.txt` for machine-readable discovery
- Markdown doc for human onboarding
- `ai.txt` links to full docs

**Action Items:**
- [ ] Create `apps/web/public/ai.txt` with concise setup
- [ ] Create `apps/web/src/content/docs/ai-integration.md` with full guide
- [ ] Add `<link rel="ai" href="/ai.txt">` to HTML head
- [ ] Ensure `/ai.txt` is accessible without auth

**Blocker Severity:** 🟢 LOW - Can create quickly, not blocking development

---

### 6. MCP Server MVP Scope

**Question:** Which tools should be in the initial release?

**Full Tool Set (from ai-integration-strategy.md):**
- `create_job` - Create new job with endpoints
- `add_endpoint` - Add endpoint to existing job
- `list_jobs` - Query jobs with filters
- `get_job_health` - Get execution stats
- `pause_job` - Pause until specific time
- `suggest_integration` - AI recommendations

**Recommendation:** **3-Tool MVP**

**Phase 1 (MVP):**
1. **create_job** - Core value prop
2. **list_jobs** - Visibility
3. **pause_job** - Control

**Phase 2:**
4. **get_job_health** - Observability
5. **add_endpoint** - Advanced

**Phase 3:**
6. **suggest_integration** - AI-powered (requires additional AI planner integration)

**Rationale:**
- MVP proves value: create → see → control
- `suggest_integration` requires AI planner to be operational
- `get_job_health` can use dashboard initially
- `add_endpoint` is less common use case

**Action Items:**
- [ ] Implement 3 MVP tools first
- [ ] Ship v1.0.0 with MVP
- [ ] Add remaining tools in v1.1.0+

**Blocker Severity:** 🟢 LOW - Scope is clear

---

### 7. OAuth Device Flow Error Handling

**Question:** What happens when device flow fails? How does user recover?

**Failure Scenarios:**

#### Scenario A: User Never Approves Device Code
- **Timeout:** 30 minutes (per OAuth spec)
- **UX:** MCP server shows polling status
```
⏳ Waiting for approval... (expires in 28:43)
🌐 Browser didn't open? Visit: https://cronicorn.com/device/approve?code=ABCD-EFGH
❌ Authorization timed out. Run command again to retry.
```

#### Scenario B: User Denies Authorization
- **Response:** `/device/token` returns error
```
❌ Authorization denied
ℹ️  You can try again by running: npx -y @cronicorn/mcp-server
```

#### Scenario C: Network Failure During Polling
- **Retry:** Exponential backoff
- **Max Retries:** 3
```
⚠️  Network error, retrying... (attempt 2/3)
❌ Could not connect to Cronicorn API. Check your internet connection.
```

#### Scenario D: Token Refresh Fails (Future)
- **Action:** Delete stored tokens, re-run device flow
```
⚠️  Your session expired. Re-authorizing...
🌐 Opening browser for approval...
```

**Recommendation:** Clear CLI output with actionable error messages

**Action Items:**
- [ ] Implement timeout handling in MCP server
- [ ] Add retry logic with exponential backoff
- [ ] Create user-friendly error messages
- [ ] Document recovery steps in docs

**Blocker Severity:** 🟡 MEDIUM - Error handling is critical for UX

---

### 8. Local Development & Testing Strategy

**Question:** How do developers test the full OAuth + MCP flow locally?

**Challenges:**
- Better Auth device endpoints run on `http://localhost:3333`
- MCP server needs to poll that URL
- Browser redirect must work locally
- Tokens must be stored locally

**Recommended Local Setup:**

#### 1. Run API Locally
```bash
cd apps/api
pnpm dev
# Runs on http://localhost:3333
```

#### 2. Run MCP Server in Dev Mode
```bash
cd apps/mcp-server
pnpm dev
# Or: node dist/index.js
```

#### 3. Configure MCP Server for Local API
```json
{
  "mcpServers": {
    "cronicorn-local": {
      "command": "node",
      "args": ["/Users/you/cronicorn/apps/mcp-server/dist/index.js"],
      "env": {
        "CRONICORN_API_URL": "http://localhost:3333"
      }
    }
  }
}
```

#### 4. Test Device Flow
```bash
# MCP server calls:
# POST http://localhost:3333/api/auth/device/code
# (opens browser to http://localhost:3333/device/approve?code=XXX)
# Polls: POST http://localhost:3333/api/auth/device/token
```

**Docker Compose Alternative:**
```yaml
# docker-compose.dev.yml
services:
  api:
    build: .
    ports:
      - "3333:3333"
    environment:
      - DATABASE_URL=postgresql://...
      - BETTER_AUTH_SECRET=test-secret-change-in-production
```

**Action Items:**
- [ ] Document local testing setup in `/apps/mcp-server/README.md`
- [ ] Add `CRONICORN_API_URL` env var support in MCP server
- [ ] Create example `.env.local` file
- [ ] Add local testing to PR checklist

**Blocker Severity:** 🟡 MEDIUM - Needed for development workflow

---

## Summary: What Blocks Implementation Start?

### 🔴 Critical (Must Resolve Before Phase 1)
1. **NPM Package Strategy** - Can't publish without deciding structure
2. **OAuth Token Storage** - Must know where tokens live before writing MCP server

### 🟡 Important (Resolve During Phase 1)
3. **API Client Approach** - Can start with minimal, refactor later
4. **Modal Placement** - Need to understand existing UI patterns
7. **Error Handling** - Important for UX, can iterate
8. **Local Testing** - Developers need this to work effectively

### 🟢 Low Priority (Can Defer)
5. **ai.txt Location** - Quick decision, not blocking
6. **MVP Scope** - Already have clear recommendation (3 tools)

---

## Recommended Action Plan

### Before Starting Phase 1:
1. ✅ Create `/apps/mcp-server` directory structure
2. ✅ Decide on file-based token storage (implement `token-store.ts`)
3. ✅ Set up npm package publishing in CI/CD
4. ✅ Review existing UI patterns in `/apps/web`

### During Phase 1 (Backend + Basic Auth):
5. ⏳ Implement minimal API client in MCP server
6. ⏳ Add `deviceAuthorization` plugin to Better Auth
7. ⏳ Create token storage module
8. ⏳ Set up local testing environment

### During Phase 2 (MCP Server + Modal):
9. ⏳ Build modal component following existing patterns
10. ⏳ Implement error handling in MCP server
11. ⏳ Create `ai.txt` and documentation

### Phase 3 (Polish):
12. ⏳ Add analytics tracking
13. ⏳ Create video tutorial
14. ⏳ Expand MCP tools beyond MVP

---

## Open Questions for Team Discussion

1. **Do we already have an API client package?** 
   - If yes, can it work in Node.js environment?
   - If no, should we create one or keep MCP client minimal?

2. **What's our npm publishing strategy?**
   - Manual publish or automated via CI?
   - Versioning scheme (semver)?
   - Pre-release tags for beta testing?

3. **What UI component library is `/apps/web` using?**
   - shadcn/ui? Radix? Custom?
   - State management pattern?

4. **Do we want to support self-hosted instances in MVP?**
   - If yes, `CRONICORN_API_URL` env var is critical
   - If no, can hardcode `https://cronicorn.com`

5. **Should device approvals show in Settings → Connected Devices?**
   - Need to build device management UI?
   - Or defer to Phase 2?

---

## Next Steps

1. **Review this document with team** - Resolve critical decisions
2. **Create implementation tasks** - Break down into TASK-X.Y.Z IDs
3. **Set up `/apps/mcp-server` skeleton** - Initialize package
4. **Add deviceAuthorization plugin** - Prove Better Auth integration works
5. **Build token storage** - Test file-based approach locally

**Target:** Resolve all 🔴 critical items within 1 week, then start Phase 1 implementation.
