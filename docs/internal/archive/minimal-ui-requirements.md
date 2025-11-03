# Minimal User Interface Requirements for MVP

**Date:** 2025-10-17  
**Status:** Planning  
**Purpose:** Define the absolute minimum UI features needed to launch Cronicorn MVP

---

## Executive Summary

This document defines the **minimal viable user interface** for Cronicorn - an AI-powered HTTP job scheduler. The goal is to equip initial users with a basic but functional interface to:

1. **Authenticate** (OAuth login)
2. **Manage subscriptions** (view plan, upgrade, manage billing)
3. **Create and manage jobs** (CRUD operations)
4. **Monitor execution** (view run history, health status)
5. **Access API keys** (for programmatic access)

**Core Principle:** Ship the simplest thing that works. Every feature must directly support a critical user workflow.

---

## Current State Assessment

### ✅ Already Implemented (Backend)

**Authentication:**
- OAuth login with GitHub (Better Auth)
- API key authentication for programmatic access
- Session management with cookies

**Subscriptions & Billing:**
- Stripe Checkout integration
- Customer Portal for self-service management
- Tier-based quotas (free/pro/enterprise)
- Webhook handling for subscription events

**API Endpoints (17 public-facing actions):**
- Job Lifecycle: create, get, list, update, archive
- Endpoint Orchestration: add, update, delete, list endpoints
- Adaptive Scheduling: interval hints, one-shot runs, pause/resume, clear hints, reset failures
- Execution Visibility: list runs, run details, health summary

**Database Schema:**
- Jobs and endpoints with full relationship modeling
- Run history tracking
- User accounts with tier and subscription data
- AI analysis sessions (for future use)

### ✅ Already Implemented (Frontend)

**Pages:**
- `/` - Landing page with login/register CTAs
- `/login` - OAuth login page
- `/register` - User registration
- `/pricing` - Subscription plans with Stripe checkout
- `/settings` - Account settings with subscription management

**Infrastructure:**
- TanStack Router for routing
- Better Auth client for authentication
- Tailwind CSS for styling
- Vite for build tooling

### ❌ Missing (Critical for MVP)

**Core Workflows:**
- Dashboard (no central view of jobs)
- Job management UI (no way to create/edit/delete jobs without API)
- Endpoint configuration (no UI for adding endpoints to jobs)
- Run history viewer (no way to see execution results)
- API key management (users can't generate/revoke keys)

**User Visibility:**
- No way to see active jobs
- No way to monitor job health
- No execution logs or error details
- No quota usage visibility

---

## Minimal UI Features Required

### 1. Dashboard (Priority: CRITICAL)

**Purpose:** Central hub showing user's jobs at a glance

**Components:**
- **Jobs list** with key metrics:
  - Job name
  - Number of endpoints
  - Last run status (success/failure/never run)
  - Active vs archived status
- **Quick actions:**
  - "Create New Job" button
  - "View All Jobs" link
- **Account summary card:**
  - Current tier (Free/Pro/Enterprise)
  - Usage stats (endpoints used / limit)
  - "Upgrade" CTA if on free tier

**What NOT to build:**
- Real-time updates (polling is fine)
- Advanced filtering/search (simple status filter is enough)
- Charts or graphs (text metrics are sufficient)
- Bulk actions (one-at-a-time is acceptable)

**Route:** `/dashboard`

---

### 2. Job Management (Priority: CRITICAL)

#### 2.1 Create Job Page

**Purpose:** Create a new job container for related endpoints

**Form Fields:**
- Job name (required, text input)
- Description (optional, textarea)

**Flow:**
1. User fills form
2. Submit creates job via `POST /api/jobs`
3. Redirect to job details page

**What NOT to build:**
- Job templates or presets
- Import/export functionality
- Bulk creation

**Route:** `/jobs/new`

#### 2.2 Job Details Page

**Purpose:** View and manage a specific job

**Sections:**

**A. Job Header:**
- Job name and description (editable inline)
- Status badge (active/archived)
- Actions dropdown:
  - Edit job
  - Archive job
  - Delete job (with confirmation)

**B. Endpoints List:**
- Table showing all endpoints for this job:
  - Endpoint name
  - URL and method
  - Baseline interval (e.g., "Every 5 minutes")
  - Status (active/paused/failed)
  - Last run time and result
  - Actions: Edit, Pause/Resume, Delete
- "Add Endpoint" button

**C. Recent Activity:**
- Last 10 runs across all endpoints
- Run ID, endpoint name, status, duration, timestamp
- "View All Runs" link

**What NOT to build:**
- Drag-and-drop endpoint reordering
- Visual workflow builder
- Inline run logs (link to details page is fine)
- Real-time status updates

**Route:** `/jobs/:id`

---

### 3. Endpoint Configuration (Priority: CRITICAL)

#### 3.1 Add Endpoint Form

**Purpose:** Add a new HTTP endpoint to a job

**Form Fields (grouped logically):**

**Basic Info:**
- Name (required)
- URL (required, validated URL)
- HTTP Method (dropdown: GET/POST/PUT/PATCH/DELETE)

**Schedule:**
- Baseline interval in minutes (number input)
- OR Baseline cron expression (text input)
- Min interval (optional, for guardrails)
- Max interval (optional, for guardrails)

**Advanced (collapsible section):**
- Request headers (key-value pairs, max 5)
- Request body (JSON editor, only for POST/PUT/PATCH)
- Timeout (milliseconds, default: 30000)
- Max response size (KB, default: 100)

**What NOT to build:**
- Visual cron builder (text input is enough)
- Request template library
- Environment variable substitution
- Retry configuration (use defaults)

**Route:** `/jobs/:jobId/endpoints/new`

#### 3.2 Edit Endpoint Form

**Purpose:** Modify endpoint configuration

**Same fields as Add Endpoint**, but pre-populated with current values.

**Additional Actions:**
- Pause/Resume endpoint
- Reset failure count
- Clear AI hints (revert to baseline)

**What NOT to build:**
- Configuration history/versioning
- A/B testing between configs
- Conditional scheduling UI

**Route:** `/jobs/:jobId/endpoints/:id/edit`

---

### 4. Run History & Monitoring (Priority: HIGH)

#### 4.1 Runs List Page

**Purpose:** View execution history for an endpoint

**Filters:**
- Status (all/success/failure)
- Date range (last 24h / 7d / 30d / all time)

**Table Columns:**
- Run ID
- Status badge (success/failure/running)
- Duration (ms)
- Timestamp
- Error message (if failed)
- Actions: "View Details"

**Pagination:** Simple prev/next (50 runs per page)

**What NOT to build:**
- Advanced search/filtering
- Export to CSV
- Run comparison tools
- Live tail of running jobs

**Route:** `/endpoints/:id/runs`

#### 4.2 Run Details Page

**Purpose:** Deep dive into a specific execution

**Sections:**

**A. Run Summary:**
- Status, duration, timestamp
- Endpoint name and job
- Source (baseline/AI hint/manual)

**B. Request Details:**
- URL, method, headers
- Request body (formatted JSON if applicable)

**C. Response Details:**
- Status code
- Response body (formatted JSON, truncated if large)
- Error message and stack trace (if failed)

**D. Scheduling Info:**
- Next scheduled run time
- Current interval
- Active AI hints (if any)

**What NOT to build:**
- Response body download
- Diff viewer for consecutive runs
- Replay functionality

**Route:** `/runs/:id`

#### 4.3 Endpoint Health Page

**Purpose:** Quick health snapshot for an endpoint

**Metrics (last 24 hours):**
- Success rate (%)
- Total runs
- Average duration
- Failure count
- Current status (healthy/degraded/failing)

**Recent Failures:**
- Last 5 failed runs with error messages

**What NOT to build:**
- Custom time ranges
- Historical trends/graphs
- Alerting configuration

**Route:** `/endpoints/:id/health`

---

### 5. API Key Management (Priority: HIGH)

**Purpose:** Generate and manage API keys for programmatic access

**Page Components:**

**A. Active Keys List:**
- Table showing:
  - Key name/label
  - Prefix (first 8 chars: `cron_abc...`)
  - Created date
  - Last used (if tracked)
  - Actions: Revoke
- "Generate New Key" button

**B. Generate Key Flow:**
1. User clicks "Generate New Key"
2. Modal/form prompts for key name/label
3. API creates key via Better Auth plugin
4. Show key ONCE with copy button (alert: "Save this now!")
5. After modal closed, key hidden forever

**C. Revoke Key Flow:**
1. User clicks "Revoke" with confirmation dialog
2. API deletes key
3. Remove from list

**What NOT to build:**
- Key scopes/permissions (use full access for MVP)
- Key rotation automation
- Usage analytics per key
- Key expiration dates

**Route:** `/settings/api-keys`

---

### 6. Account Settings (Priority: MEDIUM)

**Purpose:** Manage user profile and subscription

**Already implemented:**
- Profile section (name, email - read-only from OAuth)
- Subscription section (tier, status, manage button)

**Additional needed:**
- API keys section (link to `/settings/api-keys`)
- Quota usage section:
  - Endpoints used / limit
  - AI tokens used / limit (monthly)
  - Link to upgrade if approaching limits

**What NOT to build:**
- Profile editing (OAuth is source of truth)
- Email preferences
- Account deletion
- Team management

**Route:** `/settings` (extend existing page)

---

## User Flows (Minimal)

### Flow 1: First-Time User Setup

1. User lands on `/` → clicks "Login"
2. OAuth flow → GitHub → redirect back
3. Redirect to `/dashboard` (empty state with "Create First Job" CTA)
4. Click "Create Job" → `/jobs/new`
5. Fill form → submit → redirect to `/jobs/:id`
6. Click "Add Endpoint" → `/jobs/:jobId/endpoints/new`
7. Fill endpoint form → submit → back to job details
8. See endpoint in list with "Pending first run" status
9. Wait for scheduler to execute (1-5 min depending on interval)
10. Refresh page → see "Success" or "Failed" status
11. Click endpoint → go to runs page → view execution details

**Time to first value: <5 minutes**

### Flow 2: Monitor Job Health

1. User at `/dashboard` → sees job with failure badge
2. Click job → `/jobs/:id` → sees failed endpoints highlighted
3. Click failed endpoint → `/endpoints/:id/health`
4. See error rate and recent failures
5. Click a failed run → `/runs/:id`
6. See error message: "Connection timeout"
7. Return to job → click "Edit Endpoint" → increase timeout
8. Submit → wait for next run → verify success

**Debugging time: <2 minutes**

### Flow 3: Upgrade Plan

1. User at `/dashboard` → sees "5/10 endpoints used" approaching limit
2. Click "Upgrade" → `/pricing`
3. Click "Subscribe to Pro" → Stripe Checkout
4. Enter payment → success → redirect to `/settings`
5. See "Pro" tier badge and "50/100 endpoints" new limit
6. Return to dashboard → create more jobs

**Upgrade friction: <3 clicks**

### Flow 4: Programmatic Access

1. User wants to integrate Cronicorn into CI/CD
2. Go to `/settings` → click "API Keys"
3. Click "Generate New Key" → enter name "GitHub Actions"
4. Copy key to clipboard → paste into GitHub secrets
5. Use key with `curl -H "x-api-key: cron_..."` to create jobs
6. See jobs appear in dashboard

**Setup time: <2 minutes**

---

## Technical Implementation Notes

### Component Architecture

**Use existing patterns:**
- TanStack Router for file-based routing
- Fetch API with Better Auth credentials for API calls
- Tailwind CSS for styling (no component library needed)
- Simple form state management (React useState is sufficient)

**Reusable Components to Build:**
- `JobCard` - Display job summary
- `EndpointRow` - Show endpoint in table
- `RunStatusBadge` - Color-coded status indicator
- `DeleteConfirmDialog` - Generic confirmation modal
- `CopyButton` - Copy-to-clipboard with feedback
- `LoadingSpinner` - Simple loading state
- `ErrorMessage` - Consistent error display
- `EmptyState` - No data placeholder with CTA

**API Client Pattern:**
```typescript
// lib/api-client.ts
async function apiRequest(endpoint, options) {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    credentials: 'include', // Send auth cookies
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
```

### Data Fetching Strategy

**Use TanStack Router loaders:**
- Pre-fetch data before rendering page
- Handle loading/error states at route level
- Avoid complex state management libraries

**Example:**
```typescript
export const Route = createFileRoute('/jobs/$id')({
  loader: async ({ params }) => {
    const job = await apiRequest(`/jobs/${params.id}`);
    const endpoints = await apiRequest(`/jobs/${params.id}/endpoints`);
    return { job, endpoints };
  },
  component: JobDetailsPage,
});
```

### Form Validation

**Client-side only for MVP:**
- Use native HTML5 validation (required, type="url", etc.)
- Simple JavaScript validation for complex fields (cron, JSON)
- Server errors displayed as alert messages

**No schema libraries needed** - backend already validates with Zod

### Error Handling

**Simple toast/alert pattern:**
```typescript
function handleError(error) {
  alert(error.message); // Good enough for MVP
}
```

Future: Replace with toast notification library

### Styling Guidelines

**Minimal, clean, functional:**
- Use Tailwind utility classes
- Consistent spacing (p-4, p-6, p-8)
- Simple color palette:
  - Primary: blue-600 (CTAs)
  - Success: green-600
  - Failure: red-600
  - Warning: yellow-600
  - Gray: gray-600 (text), gray-200 (borders)
- No animations or transitions (except hover states)

**Responsive:**
- Mobile-first
- Simple stack layout on mobile
- Table → card list on small screens

---

## What NOT to Build (Scope Control)

### ❌ Advanced Features (Post-MVP)

**AI Control UI:**
- Visual workflow for conditional activation
- AI hint editor/manager
- Scheduling strategies selector
- Custom AI prompts

**Rationale:** AI features work automatically. Manual control adds complexity without user value for MVP.

**Analytics & Reporting:**
- Dashboards with charts
- Custom reports
- Data export
- Trend analysis

**Rationale:** Basic metrics in health page are sufficient for initial users.

**Collaboration:**
- Team management
- User roles/permissions
- Shared jobs
- Activity feed

**Rationale:** MVP targets individual developers. Multi-user can wait.

**Advanced Job Management:**
- Job templates/cloning
- Bulk operations
- Job dependencies
- Workflow builder

**Rationale:** Users can create jobs one at a time. Power features come later.

**Developer Tools:**
- API playground
- Webhook testing
- Request/response inspection tools
- Debugging console

**Rationale:** cURL + API docs + run details page = sufficient for MVP.

---

## Implementation Checklist

### Phase 1: Core Dashboard (Week 1)
- [ ] Create `/dashboard` route
- [ ] Build `JobCard` component
- [ ] Fetch jobs via API loader
- [ ] Display empty state for new users
- [ ] Add "Create Job" CTA
- [ ] Show basic account summary (tier, limits)
- [ ] Test end-to-end flow

### Phase 2: Job Management (Week 1-2)
- [ ] Create `/jobs/new` route with form
- [ ] Implement job creation handler
- [ ] Create `/jobs/:id` details page
- [ ] Build endpoints list table
- [ ] Add edit/archive/delete actions
- [ ] Test CRUD operations

### Phase 3: Endpoint Configuration (Week 2)
- [ ] Create `/jobs/:jobId/endpoints/new` form
- [ ] Implement endpoint creation
- [ ] Build `/jobs/:jobId/endpoints/:id/edit` form
- [ ] Add pause/resume controls
- [ ] Add delete with confirmation
- [ ] Validate form inputs
- [ ] Test endpoint lifecycle

### Phase 4: Run History (Week 3)
- [ ] Create `/endpoints/:id/runs` list page
- [ ] Implement filters (status, date range)
- [ ] Add pagination
- [ ] Create `/runs/:id` details page
- [ ] Display request/response data
- [ ] Show error messages for failures
- [ ] Test run viewing flow

### Phase 5: Monitoring (Week 3)
- [ ] Create `/endpoints/:id/health` page
- [ ] Calculate and display metrics
- [ ] Show recent failures
- [ ] Add status badges throughout UI
- [ ] Test health monitoring

### Phase 6: API Keys (Week 4)
- [ ] Create `/settings/api-keys` page
- [ ] Implement key generation flow
- [ ] Build key list with revoke action
- [ ] Add "copy key" functionality with warning
- [ ] Test key lifecycle
- [ ] Update `/settings` with link to API keys

### Phase 7: Polish & Testing (Week 4)
- [ ] Add loading states to all pages
- [ ] Improve error messages
- [ ] Add empty states throughout
- [ ] Responsive design testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] End-to-end user flow testing
- [ ] Documentation updates

### Phase 8: Production Readiness
- [ ] Environment configuration review
- [ ] Production build optimization
- [ ] Security review (XSS, CSRF)
- [ ] Performance testing (page load times)
- [ ] Accessibility audit (keyboard nav, screen readers)
- [ ] Launch checklist completion

---

## Success Metrics

**MVP is successful if users can:**
1. ✅ Sign up and subscribe in <3 minutes
2. ✅ Create their first job in <5 minutes
3. ✅ See execution results in <10 minutes
4. ✅ Debug a failed job in <5 minutes
5. ✅ Generate API key in <2 minutes
6. ✅ Upgrade plan in <3 clicks

**Technical metrics:**
- Page load time: <2 seconds
- Time to interactive: <3 seconds
- Zero JavaScript errors in console
- Works on mobile (responsive)
- API calls return in <500ms

---

## Deployment Plan

1. **Development:** Local with `.env` using test Stripe keys
2. **Staging:** Deploy to Vercel/Netlify with test database
3. **Production:** Same stack with production database + Stripe live mode

**Environment variables needed:**
```bash
# API endpoint
VITE_API_URL=http://localhost:3333  # or https://api.cronicorn.com

# Better Auth (OAuth)
BETTER_AUTH_URL=http://localhost:5173  # or https://app.cronicorn.com
```

---

## Conclusion

This minimal UI provides:
- ✅ All critical user workflows
- ✅ Essential job management capabilities
- ✅ Sufficient monitoring and debugging
- ✅ Self-service subscription management
- ✅ Programmatic API access

**Total effort estimate:** 3-4 weeks for single developer

**Scope discipline:** Every feature listed directly enables a core user need. Anything not listed can wait until post-MVP based on user feedback.

**Next steps:**
1. Review with stakeholders
2. Adjust scope if needed
3. Begin Phase 1 implementation
4. Ship incrementally with weekly demos

---

**Questions or feedback?** Open an issue or discussion on GitHub.
