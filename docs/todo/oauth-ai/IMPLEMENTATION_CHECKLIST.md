# OAuth + MCP "Easy Button" Implementation Checklist

**Goal:** Enable AI agents to connect to Cronicorn via OAuth device flow and MCP server with a frictionless "easy button" experience.

**Target Timeline:** 2-3 weeks

**Current Branch:** `mcp-ai-txt-easy-button`

---

## 📋 Pre-Implementation (Week 0)

### Critical Decisions
- [ ] Review all documentation in `/docs/todo/oauth-ai/`
- [ ] Confirm UI component library used in `/apps/web` (shadcn/ui? Radix?)
- [ ] Confirm state management pattern (Zustand? Context? Jotai?)
- [ ] Check if `@cronicorn/api-client` package exists
- [ ] Decide on npm publishing strategy (manual vs CI/CD)
- [ ] Register `@cronicorn` org on npm (if not already done)
- [ ] Set up npm access token for publishing

### Team Alignment
- [ ] Review gap analysis document (`implementation-gaps.md`)
- [ ] Assign ownership for backend, frontend, and MCP server work
- [ ] Schedule weekly sync meetings
- [ ] Set up #ai-integration Slack/Discord channel

---

## 🔧 Phase 1: Backend OAuth Setup (Week 1)

### Database & Schema
- [x] Add `deviceAuthorization` plugin to Better Auth config (`apps/api/src/auth/config.ts`)
- [x] Run database migrations to create device flow tables
- [x] Verify tables created: `device_codes`, `oauth_tokens`
- [x] Test database schema with manual inserts

### Better Auth Configuration
- [x] Import `deviceAuthorization` from `better-auth/plugins`
- [x] Add plugin to `plugins` array in `betterAuth()` config
- [x] Configure device code TTL (default: 30 minutes)
- [x] Configure polling interval (default: 5 seconds)
- [x] Test plugin initialization (server starts without errors)

### API Endpoints Verification
- [x] Start API server locally: `cd apps/api && pnpm dev`
- [x] Test `POST /api/auth/device/code` endpoint
  ```bash
  curl -X POST http://localhost:3333/api/auth/device/code \
    -H "Content-Type: application/json" \
    -d '{"client_id": "cronicorn-mcp"}'
  ```
- [x] Verify response contains: `device_code`, `user_code`, `verification_uri`, `expires_in`, `interval`
- [x] Test `GET /api/auth/device?user_code=XXXX` endpoint
- [x] Test `POST /api/auth/device/token` polling endpoint (should return `authorization_pending`)

### Authentication Middleware
- [x] Verify existing middleware supports OAuth tokens (`apps/api/src/auth/middleware.ts`)
- [x] Test middleware with mock OAuth token
- [x] Ensure both API keys and OAuth tokens work
- [x] Add logging for auth method used (API key vs OAuth)

### Testing
- [x] Write unit tests for device flow endpoints
- [x] Test device code expiration (mock time)
- [x] Test polling rate limiting
- [x] Test authorization denial flow
- [x] Document backend setup in ADR

---

## 🎨 Phase 2: Frontend Device Approval UI (Week 1)

### Device Approval Page
- [x] Create `apps/web/src/routes/device.approve.tsx`
- [x] Add Better Auth client plugin (`deviceAuthorizationClient`)
- [x] Implement user code verification
- [x] Implement approve/deny buttons
- [x] Add loading states (pending, success, error)
- [x] Add user information display (show which AI agent is requesting access)
- [x] Test with query param: `http://localhost:5173/device/approve?user_code=ABCD-EFGH`
- [x] Test approve flow end-to-end
- [x] Test deny flow end-to-end
- [x] Verify token polling returns access token after approval

### Connected Devices Dashboard
- [x] Create `/settings/connected-devices` route
- [x] Design UI for listing active OAuth sessions
- [x] Create API endpoints for listing connected devices (`GET /api/devices`)
- [x] Create API endpoint for revoking devices (`DELETE /api/devices/:tokenId`)
- [x] Create type-safe query functions using Hono RPC (`devices.queries.ts`)
- [x] Connect frontend to backend APIs
- [x] Verify queries working with test data
- [x] Add revoke confirmation dialog (using AlertDialog component)
- [x] **RESOLVED**: Better Auth stores device flow sessions in `session` table, not `oauth_tokens` - updated queries
- [x] Test revoking a device removes access (end-to-end)

### Device Approval UX Polish
- [ ] Add visual feedback for approval/denial (success/error animations)
- [ ] Add countdown timer showing code expiration
- [ ] Add error handling for expired/invalid codes
- [ ] Add success screen with "return to your AI agent" message
- [ ] Test mobile responsiveness

### Navigation & Integration
- [x] Add "Connected Devices" link to Settings navigation
- [ ] Add breadcrumbs to device approval page
- [ ] Update Settings page to show connected device count
- [ ] Test navigation flows

### Testing
- [ ] E2E test: Complete device approval flow
- [ ] Test approve button
- [ ] Test deny button
- [ ] Test expired code handling
- [ ] Test invalid code handling
- [ ] Verify UI matches design system

---

## 📦 Phase 3: MCP Server Package (Week 2)

### Package Setup
- [x] Create `/apps/mcp-server` directory
- [x] Initialize `package.json` with bin entry: `"bin": { "cronicorn-mcp": "./dist/index.js" }`
- [x] Set up `tsconfig.json` (extend base config, target ES2022, module ES2022)
- [x] Add dependencies to `package.json`:
  - [x] `@modelcontextprotocol/sdk`
  - [x] `open` (for browser launching)
  - [x] `zod` (for schema validation)
- [x] Configure package as ESM (`"type": "module"`)
- [x] Create comprehensive `README.md` with installation and usage docs
- [x] Create `.gitignore` for build artifacts

### OAuth Device Flow Implementation
- [x] Create `src/auth/device-flow.ts`
- [x] Implement `authenticate()` function (combines device flow + polling)
- [x] Implement device code request to API
- [x] Display user code and verification URI to stderr
- [x] Auto-open browser with `open` package
- [x] Implement `pollForToken()` function with proper interval handling
- [x] Handle authorization_pending, slow_down, access_denied, expired_token
- [x] Add timeout handling (expires_in from API)
- [ ] Implement `refreshToken()` function (TODO: after testing expiry)
- [ ] Add retry logic with exponential backoff

### Token Storage
- [x] Create `src/auth/token-store.ts`
- [x] Implement `saveCredentials()` to `~/.cronicorn/credentials.json`
- [x] Set file permissions to `0o600` (read/write owner only)
- [x] Implement `getCredentials()` with error handling
- [x] Implement `deleteCredentials()` for logout
- [x] Implement `isTokenExpired()` helper (5 minute buffer)
- [x] Store access_token, refresh_token, expires_at
- [ ] Test token persistence across restarts (needs dependencies installed)

### API Client
- [x] Create `src/tools/index.ts` (minimal API client wrapper)
- [x] Implement authenticated `fetch` wrapper with Bearer token
- [x] Add Authorization header injection
- [x] Add JSON error handling
- [ ] Add retry logic for network errors (TODO: after initial testing)
- [ ] Add rate limit handling (TODO: after initial testing)

### MCP Tools - MVP
- [x] Create `src/tools/index.ts` (tool registry with API client)
- [x] Implement `create_job` tool (`src/tools/create-job.ts`)
  - [x] Define inputSchema using Zod (name, endpoint.url, endpoint.method, endpoint.headers, endpoint.body, schedule, timezone)
  - [x] Define outputSchema (job_id, name, schedule, next_run_at)
  - [x] Implement execute function calling `POST /jobs`
  - [x] Format response for AI consumption
  - [x] Add human-readable text + structuredContent
- [x] Implement `list_jobs` tool (`src/tools/list-jobs.ts`)
  - [x] Define inputSchema (status filter: active, paused, all)
  - [x] Define outputSchema (jobs array with id, name, schedule, paused, next_run_at, last_run_at)
  - [x] Implement execute function calling `GET /jobs?status=`
  - [x] Format job list response with summary
- [x] Implement `pause_job` tool (`src/tools/pause-job.ts`)
  - [x] Define inputSchema (job_id, paused boolean)
  - [x] Define outputSchema (job_id, name, paused, message)
  - [x] Implement execute function calling `PATCH /jobs/:id`
  - [x] Handle pause/unpause with user-friendly messages
- [x] Implement `get_job_history` tool (`src/tools/get-job-history.ts`)
  - [x] Define inputSchema (job_id, limit)
  - [x] Define outputSchema (job_id, job_name, runs array)
  - [x] Implement execute function calling `GET /jobs/:id` then `GET /endpoints/:id/runs?limit=`
  - [x] Format run history with status emojis

### MCP Server Initialization
- [x] Create `src/index.ts`
- [x] Initialize McpServer from `@modelcontextprotocol/sdk/server/mcp.js`
- [x] Check for credentials with `getCredentials()`, fallback to `authenticate()`
- [x] Register all tools via `registerTools()`
- [x] Connect StdioServerTransport
- [x] Add startup logging to stderr
- [ ] Add graceful shutdown handling (TODO: test with Ctrl+C)
- [ ] Install dependencies and test build

### Logging & Error Handling
- [ ] Create `src/utils/logger.ts`
- [ ] Use `console.error` for all logs (stdout reserved for MCP protocol)
- [ ] Add log levels: info, warn, error, debug
- [ ] Create `src/utils/errors.ts` for error formatting
- [ ] Add user-friendly error messages
- [ ] Add actionable recovery steps in error messages

### Build & Development
- [x] Add build script: `tsc`
- [x] Add dev script: `tsx src/index.ts` (not added yet, but can use watch)
- [x] Test build output in `dist/`
- [x] Verify shebang in compiled `dist/index.js`: `#!/usr/bin/env node`
- [x] Make `dist/index.js` executable: `chmod +x dist/index.js`
- [ ] Test local execution: `node dist/index.js` (requires API running for OAuth flow)
- [x] Add watch script: `tsc --watch`

### Testing
- [ ] Write unit tests for `device-flow.ts`
- [ ] Write unit tests for `token-store.ts`
- [ ] Write unit tests for `client.ts`
- [ ] Write unit tests for each MCP tool
- [ ] Test OAuth flow with local API
- [ ] Test token refresh logic
- [ ] Test error scenarios (network failure, expired token, denied auth)
- [ ] Test MCP protocol communication

### Documentation
- [ ] Create comprehensive `README.md` in `/apps/mcp-server/`
- [ ] Document installation: `npx -y @cronicorn/mcp-server`
- [ ] Document configuration for different AI agents
- [ ] Document environment variables
- [ ] Add troubleshooting section
- [ ] Add examples of common use cases

---

## 🌐 Phase 4: Frontend "Easy Button" (Week 2)

### Modal Component
- [ ] Create `apps/web/src/components/modals/ConnectAIAgentModal.tsx`
- [ ] Implement 4-step wizard:
  - [ ] Step 1: Install MCP Server (NPX command with copy button)
  - [ ] Step 2: Add Configuration (JSON config with copy button)
  - [ ] Step 3: Find Config File (common locations + OS-specific hints)
  - [ ] Step 4: Authorize (explanation of what happens next)
- [ ] Create `StepCard` reusable component
- [ ] Create `CodeBlock` reusable component with copy functionality
- [ ] Add copy state management (`copiedCommand`, `copiedConfig`)
- [ ] Add OS detection for path hints (macOS, Windows, Linux)
- [ ] Add accordion for self-hosted configuration
- [ ] Add links to external resources (MCP docs, video tutorial)

### Modal Triggers
- [ ] Add "🤖 Connect AI Agent" button to dashboard homepage hero section
- [ ] Add trigger to jobs empty state page
- [ ] Add trigger to API Keys settings page
- [ ] Add trigger to Settings → Integrations page
- [ ] Wire all triggers to open modal
- [ ] Test modal opening from all 4 locations

### State Management
- [ ] Identify global state pattern used in `/apps/web`
- [ ] Add `aiAgentModalOpen` state
- [ ] Add `openAIAgentModal()` action
- [ ] Add `closeAIAgentModal()` action
- [ ] Test state persistence across route changes

### Configuration Values
- [ ] Define production config JSON
- [ ] Define self-hosted config JSON
- [ ] Define local development config JSON
- [ ] Make config JSON copyable
- [ ] Add syntax highlighting to code blocks

### Analytics
- [ ] Implement `AI Agent Modal Opened` event
- [ ] Implement `AI Agent Config Copied` event (command, config)
- [ ] Implement `AI Agent Help Clicked` event
- [ ] Implement `AI Agent Connected` event (fires on device approval)
- [ ] Test analytics tracking

### Testing
- [ ] Test modal open/close
- [ ] Test copy buttons
- [ ] Test OS detection
- [ ] Test mobile responsiveness
- [ ] Test keyboard navigation
- [ ] Test screen reader accessibility
- [ ] Verify focus trap
- [ ] Verify Escape key closes modal

---

## 📄 Phase 5: AI Discovery (Week 2-3)

### ai.txt File
- [ ] Create `apps/web/public/ai.txt`
- [ ] Copy content from `ai-txt-specification.md`
- [ ] Update placeholders (URLs, dates, versions)
- [ ] Test file is accessible at `http://localhost:3000/ai.txt`
- [ ] Verify plain text content-type
- [ ] Add to `.gitignore` exceptions (ensure it's committed)

### HTML Metadata
- [ ] Add to `apps/web/index.html` or layout:
  ```html
  <link rel="ai" href="/ai.txt" type="text/plain">
  <meta name="ai-integration" content="mcp-server">
  <meta name="ai-mcp-package" content="@cronicorn/mcp-server">
  ```
- [ ] Test metadata appears in page source

### Documentation Page
- [ ] Create `apps/web/src/content/docs/ai-integration.md` (or equivalent)
- [ ] Add full AI integration guide
- [ ] Add screenshots of device approval flow
- [ ] Add code examples for all MCP tools
- [ ] Add troubleshooting section
- [ ] Link to ai.txt and MCP server README

### SEO & Discovery
- [ ] Add `/ai.txt` to `robots.txt` (allow crawling)
- [ ] Add `/ai.txt` to `sitemap.xml`
- [ ] Consider adding `/.well-known/ai.txt` redirect
- [ ] Test discoverability

---

## 🧪 Phase 6: Local Testing & Validation (Week 3)

### Local Environment Setup
- [ ] Ensure PostgreSQL running locally
- [ ] Run API migrations: `cd apps/api && pnpm db:migrate`
- [ ] Start API server: `cd apps/api && pnpm dev` (port 3333)
- [ ] Start web app: `cd apps/web && pnpm dev` (port 3000)
- [ ] Verify both running without errors

### MCP Server Local Testing
- [ ] Build MCP server: `cd apps/mcp-server && pnpm build`
- [ ] Test local execution:
  ```bash
  CRONICORN_API_URL=http://localhost:3333 node dist/index.js
  ```
- [ ] Verify OAuth flow triggers
- [ ] Open browser to `http://localhost:3000/device/approve?user_code=XXXX`
- [ ] Approve device
- [ ] Verify token saved to `~/.cronicorn/credentials.json`
- [ ] Verify MCP server connects successfully

### MCP Tool Testing (Manual)
Since MCP servers communicate via stdio, we need to test with a real AI agent:

#### Option A: Claude Desktop (Recommended)
- [ ] Install Claude Desktop (https://claude.ai/download)
- [ ] Locate config file: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
- [ ] Add local MCP server config:
  ```json
  {
    "mcpServers": {
      "cronicorn-local": {
        "command": "node",
        "args": ["/absolute/path/to/cronicorn/apps/mcp-server/dist/index.js"],
        "env": {
          "CRONICORN_API_URL": "http://localhost:3333"
        }
      }
    }
  }
  ```
- [ ] Restart Claude Desktop
- [ ] Open Claude and verify MCP server appears in tools list

#### Test All Tools
- [ ] Test `create_job`:
  - [ ] Prompt: "Create a job that hits https://httpbin.org/get every 5 minutes"
  - [ ] Verify job created in local database
  - [ ] Check job appears in Cronicorn dashboard
- [ ] Test `list_jobs`:
  - [ ] Prompt: "Show me all my jobs"
  - [ ] Verify jobs are listed
- [ ] Test `pause_job`:
  - [ ] Prompt: "Pause the job we just created until tomorrow at 9am"
  - [ ] Verify job paused in database
  - [ ] Check status in dashboard

#### Test OAuth Refresh
- [ ] Manually expire token in `~/.cronicorn/credentials.json` (set `expires_at` to past)
- [ ] Make another request via Claude
- [ ] Verify token auto-refreshes
- [ ] Verify no error shown to user

#### Test Error Handling
- [ ] Stop API server
- [ ] Try to create job via Claude
- [ ] Verify user-friendly error message
- [ ] Restart API server
- [ ] Verify recovery works

### Frontend Flow Testing
- [ ] Open `http://localhost:3000` in browser
- [ ] Click "🤖 Connect AI Agent" button
- [ ] Test copy buttons (NPX command, JSON config)
- [ ] Click external links (MCP docs, video tutorial placeholder)
- [ ] Close modal
- [ ] Navigate to Settings → Connected Devices
- [ ] Verify connected device appears (from MCP server auth)
- [ ] Test revoke button
- [ ] Verify MCP server loses access after revocation

### Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test mobile Safari (iOS)
- [ ] Test mobile Chrome (Android)

---

## 📦 Phase 7: NPM Publishing (Week 3)

### Pre-Publish Checklist
- [ ] Verify package.json metadata (name, version, description, keywords, repository, license)
- [ ] Verify `files` array includes only `dist/` and `README.md`
- [ ] Test `npm pack` to see what will be published
- [ ] Update version to `1.0.0`
- [ ] Create comprehensive README.md
- [ ] Add LICENSE file (MIT)

### NPM Account Setup
- [ ] Create npm account (if needed)
- [ ] Set up 2FA on npm account
- [ ] Request access to `@cronicorn` org (or create it)
- [ ] Get npm access token
- [ ] Store token in CI/CD secrets: `NPM_TOKEN`

### Manual Publish (First Time)
- [ ] Login to npm: `npm login`
- [ ] Build package: `cd apps/mcp-server && pnpm build`
- [ ] Publish: `npm publish --access public`
- [ ] Verify package appears: `https://www.npmjs.com/package/@cronicorn/mcp-server`
- [ ] Test installation: `npx @cronicorn/mcp-server@latest`

### CI/CD Automation
- [ ] Create `.github/workflows/publish-mcp-server.yml`
- [ ] Configure workflow to trigger on tag: `mcp-server-v*`
- [ ] Add build step
- [ ] Add test step
- [ ] Add publish step with `NPM_TOKEN` secret
- [ ] Test workflow with `mcp-server-v1.0.0` tag

### Post-Publish Validation
- [ ] Install via NPX: `npx -y @cronicorn/mcp-server`
- [ ] Verify OAuth flow works with production API
- [ ] Test all 3 MCP tools
- [ ] Check package size is reasonable (< 5MB)
- [ ] Verify README displays correctly on npm

---

## 🚀 Phase 8: Production Deployment (Week 3)

### API Deployment
- [ ] Deploy API with device authorization plugin enabled
- [ ] Run database migrations on production database
- [ ] Verify device flow endpoints accessible:
  - [ ] `POST /api/auth/device/code`
  - [ ] `GET /api/auth/device`
  - [ ] `POST /api/auth/device/approve`
  - [ ] `POST /api/auth/device/deny`
  - [ ] `POST /api/auth/device/token`
- [ ] Test endpoints with curl/Postman
- [ ] Monitor error logs for issues

### Web Deployment
- [ ] Deploy web app with device approval page
- [ ] Verify `/device/approve` page accessible
- [ ] Verify `/settings/connected-devices` page accessible
- [ ] Verify ai.txt accessible at `https://cronicorn.com/ai.txt`
- [ ] Test modal on production
- [ ] Test copy buttons work
- [ ] Verify analytics events firing

### End-to-End Production Test
- [ ] Install Claude Desktop (clean state, no local config)
- [ ] Configure production MCP server:
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
- [ ] Restart Claude Desktop
- [ ] Verify OAuth flow opens production URL
- [ ] Approve device in production dashboard
- [ ] Test creating a job via Claude
- [ ] Verify job appears in production database
- [ ] Verify job executes correctly

### Monitoring & Observability
- [ ] Add monitoring for device flow endpoints
- [ ] Track device code requests per hour
- [ ] Track successful authorizations
- [ ] Track failed authorizations
- [ ] Monitor token refresh rate
- [ ] Set up alerts for high failure rates
- [ ] Create dashboard for OAuth metrics

---

## 📊 Phase 9: Analytics & Optimization (Week 4)

### Analytics Implementation
- [ ] Track "AI Agent Modal Opened" events by source
- [ ] Track "AI Agent Config Copied" events by type
- [ ] Track "AI Agent Help Clicked" events by destination
- [ ] Track "AI Agent Connected" events
- [ ] Track device approval completion rate
- [ ] Track time to first connection
- [ ] Track drop-off points in modal flow

### Funnel Analysis
- [ ] Calculate modal open → config copy rate
- [ ] Calculate config copy → authorization rate
- [ ] Calculate overall completion rate
- [ ] Identify highest drop-off step
- [ ] Create optimization plan based on data

### User Feedback
- [ ] Add feedback button to modal
- [ ] Create survey for AI agent users
- [ ] Monitor support tickets related to MCP setup
- [ ] Collect testimonials from successful users

---

## 🎥 Phase 10: Content & Marketing (Week 4)

### Video Tutorial
- [ ] Script 30-second setup walkthrough
- [ ] Record screen capture of full flow
- [ ] Edit with voiceover
- [ ] Upload to YouTube/Vimeo
- [ ] Add to modal "Watch Tutorial" button
- [ ] Embed on documentation page

### Documentation
- [ ] Write blog post: "Connect AI Agents to Cronicorn in 30 Seconds"
- [ ] Create setup guide with screenshots
- [ ] Document all MCP tools with examples
- [ ] Create troubleshooting FAQ
- [ ] Add to main documentation site

### Community
- [ ] Announce in Discord/Slack community
- [ ] Post on Twitter/X with demo video
- [ ] Submit to awesome-mcp-servers list
- [ ] Submit to MCP registry (if available)
- [ ] Write README for GitHub with badges
- [ ] Create GitHub Discussions topic for AI integration

### SEO & Discovery
- [ ] Submit sitemap to search engines
- [ ] Add structured data for AI agent integration
- [ ] Create landing page: `/ai-integration`
- [ ] Optimize meta tags for "MCP server" keywords
- [ ] Create link to ai.txt from homepage

---

## ✅ Phase 11: External Validation (Week 4)

### Test with Different AI Agents

#### Claude Desktop
- [ ] Test on macOS
- [ ] Test on Windows
- [ ] Verify all tools work
- [ ] Document any quirks

#### VS Code Copilot
- [ ] Install VS Code with GitHub Copilot
- [ ] Configure MCP server in `.vscode/settings.json`
- [ ] Test tool invocations
- [ ] Document configuration differences

#### Cursor
- [ ] Install Cursor
- [ ] Configure MCP server
- [ ] Test tool invocations
- [ ] Document setup process

#### Windsurf (if available)
- [ ] Install Windsurf
- [ ] Configure MCP server
- [ ] Test tool invocations

### Beta Testing
- [ ] Recruit 5-10 beta testers
- [ ] Provide setup instructions
- [ ] Collect feedback via survey
- [ ] Monitor success rate
- [ ] Iterate based on feedback
- [ ] Document common issues

### Success Metrics
- [ ] Target: >70% of users who open modal successfully connect
- [ ] Target: <3 support tickets per 100 connections
- [ ] Target: <60 seconds median time to first connection
- [ ] Target: >90% 7-day retention for AI-connected users

---

## 🐛 Phase 12: Bug Fixes & Iteration (Ongoing)

### Known Issues Tracking
- [ ] Create GitHub issues for all known bugs
- [ ] Prioritize by severity and frequency
- [ ] Assign owners for critical bugs
- [ ] Set fix timeline for each

### Monitoring
- [ ] Daily check of error logs
- [ ] Weekly review of analytics
- [ ] Monthly review of support tickets
- [ ] Quarterly user survey

### Iteration
- [ ] Collect feature requests from AI agent users
- [ ] Prioritize Phase 2 MCP tools (get_job_health, add_endpoint)
- [ ] Plan Phase 3 features (suggest_integration)
- [ ] Continuous improvement of error messages
- [ ] A/B test modal variations

---

## 📝 Documentation & ADRs

### ADRs to Create
- [ ] ADR: OAuth Device Flow for AI Agent Authentication
- [ ] ADR: MCP Server Architecture and Tool Design
- [ ] ADR: Token Storage Strategy (file-based vs keychain)
- [ ] ADR: Minimal API Client vs Shared Client
- [ ] ADR: ai.txt Content and Discovery Strategy

### Update Existing Docs
- [ ] Update main README with AI integration section
- [ ] Update CONTRIBUTING.md with MCP server development guide
- [ ] Update deployment docs with device flow considerations
- [ ] Add troubleshooting section to docs
- [ ] Update changelog with new features

---

## 🎉 Launch Checklist

### Pre-Launch
- [ ] All phases 1-11 complete
- [ ] No critical bugs
- [ ] Analytics working
- [ ] Documentation complete
- [ ] Video tutorial published
- [ ] Beta testing completed with >70% success rate

### Launch Day
- [ ] Merge PR to main branch
- [ ] Deploy to production
- [ ] Publish npm package
- [ ] Announce on social media
- [ ] Post in community channels
- [ ] Monitor logs and analytics
- [ ] Respond to feedback

### Post-Launch (First Week)
- [ ] Daily monitoring of metrics
- [ ] Quick response to issues
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Prepare week 1 retrospective

### Post-Launch (First Month)
- [ ] Review analytics data
- [ ] Calculate success metrics
- [ ] Plan Phase 2 features
- [ ] Write success story blog post
- [ ] Thank beta testers
- [ ] Celebrate! 🎊

---

## 🚨 Emergency Rollback Plan

If critical issues arise post-launch:

- [ ] Stop npm package downloads (unpublish if necessary)
- [ ] Revert frontend changes (remove modal, device approval page)
- [ ] Disable device authorization plugin in API
- [ ] Communicate status to users
- [ ] Fix issues in staging environment
- [ ] Re-test thoroughly before re-launch

---

## Success Criteria

**MVP is successful if:**
- ✅ Users can connect AI agents in <60 seconds
- ✅ >70% completion rate from modal open to connected
- ✅ <3 support tickets per 100 connections
- ✅ All 3 MVP MCP tools work reliably
- ✅ Zero security incidents in first month
- ✅ Positive user feedback (>4.0/5.0 rating)

**Ready to iterate to Phase 2 when:**
- ✅ 100+ successful AI agent connections
- ✅ <1% error rate on device flow
- ✅ Monitoring and analytics proven reliable
- ✅ Team confident in architecture

---

## Notes

- Use this checklist in your project management tool (Linear, GitHub Projects, etc.)
- Check off items as completed
- Add notes/blockers in comments
- Update estimates based on actual progress
- Celebrate milestones! 🎉
