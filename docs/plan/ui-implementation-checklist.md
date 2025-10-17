# MVP UI Implementation Checklist

**Project:** Cronicorn Minimal User Interface  
**Timeline:** 3-4 weeks  
**Status:** Planning → Implementation

---

## Pre-Implementation Setup

- [ ] Review and approve `minimal-ui-requirements.md`
- [ ] Review and approve `ui-sitemap.md`
- [ ] Set up project tracking (GitHub Projects or similar)
- [ ] Confirm API endpoints are all functional
- [ ] Set up local development environment
- [ ] Create design mockups/wireframes (optional, can build directly)

---

## Phase 1: Foundation & Dashboard (Week 1)

**Goal:** Users can log in and see their jobs

### Infrastructure
- [ ] Set up shared components directory structure
- [ ] Create API client utility (`lib/api-client.ts`)
- [ ] Set up error handling patterns
- [ ] Configure environment variables for web app

### Shared Components (Build First)
- [ ] `LoadingSpinner` - Simple spinner for loading states
- [ ] `ErrorMessage` - Consistent error display
- [ ] `EmptyState` - No data placeholder with icon + CTA
- [ ] `RunStatusBadge` - Color-coded status (success/failure/running)
- [ ] `TierBadge` - Display user tier (free/pro/enterprise)
- [ ] `DeleteConfirmDialog` - Generic confirmation modal

### Dashboard Page (`/dashboard`)
- [ ] Create route file `src/routes/dashboard/index.tsx`
- [ ] Implement data loader (fetch user's jobs)
- [ ] Build `AccountSummaryCard` component
  - [ ] Display current tier
  - [ ] Show endpoint usage (X/Y endpoints)
  - [ ] Show "Upgrade" CTA if on free tier
- [ ] Build `JobCard` component
  - [ ] Job name and description
  - [ ] Number of endpoints
  - [ ] Last run status (never run / success / failure)
  - [ ] Active/archived badge
  - [ ] Click → navigate to job details
- [ ] Build `JobsList` component
  - [ ] Map over jobs to render `JobCard`
  - [ ] Handle empty state (no jobs)
  - [ ] Add "Create New Job" button
- [ ] Test dashboard with multiple job states (active, archived, empty)

### Header Navigation (Update `__root.tsx`)
- [ ] Add "Dashboard" link to header
- [ ] Update active link styling
- [ ] Test navigation between existing pages

### Testing
- [ ] Dashboard loads for authenticated users
- [ ] Empty state shows for new users
- [ ] Jobs list displays correctly
- [ ] Account summary shows correct tier
- [ ] Navigation works

**Deliverable:** Users can log in and see dashboard with their jobs

---

## Phase 2: Job Management (Week 1-2)

**Goal:** Users can create, view, edit, and delete jobs

### Create Job (`/jobs/new`)
- [ ] Create route file `src/routes/jobs/new.tsx`
- [ ] Build job creation form
  - [ ] Name field (required)
  - [ ] Description field (optional, textarea)
  - [ ] Submit button
  - [ ] Cancel button (go back)
- [ ] Implement form submission
  - [ ] POST to `/api/jobs`
  - [ ] Handle success → redirect to `/jobs/:id`
  - [ ] Handle errors → show error message
- [ ] Add form validation (required fields)
- [ ] Test job creation flow

### Job Details (`/jobs/:id`)
- [ ] Create route file `src/routes/jobs/$id/index.tsx`
- [ ] Implement data loader (fetch job + endpoints)
- [ ] Build `JobHeader` component
  - [ ] Job name (editable inline or link to edit page)
  - [ ] Description
  - [ ] Status badge (active/archived)
  - [ ] Actions dropdown (edit, archive, delete)
- [ ] Build `EndpointRow` component
  - [ ] Endpoint name
  - [ ] URL and HTTP method
  - [ ] Baseline interval (formatted, e.g., "Every 5 minutes")
  - [ ] Status (active/paused/failed)
  - [ ] Last run time (relative, e.g., "2 minutes ago")
  - [ ] Last run status badge
  - [ ] Actions: Edit, Pause/Resume, Delete
- [ ] Build `EndpointsList` component
  - [ ] Table/list of endpoints
  - [ ] Empty state if no endpoints
  - [ ] "Add Endpoint" button
- [ ] Build `RecentActivity` section
  - [ ] Last 10 runs across all endpoints
  - [ ] Run ID, endpoint name, status, duration, timestamp
  - [ ] "View All Runs" link (per endpoint)
- [ ] Test job details page

### Edit Job (Optional - can do inline)
- [ ] Inline edit for name/description OR
- [ ] Separate edit page at `/jobs/:id/edit`
- [ ] PATCH to `/api/jobs/:id`
- [ ] Success → update display
- [ ] Test edit flow

### Archive/Delete Job
- [ ] Implement archive action
  - [ ] Confirmation dialog
  - [ ] DELETE to `/api/jobs/:id`
  - [ ] Success → redirect to dashboard
- [ ] Add "Restore" action for archived jobs (if showing archived)
- [ ] Test archive/delete flow

### Testing
- [ ] Job creation works end-to-end
- [ ] Job details displays all information
- [ ] Edit/archive/delete actions work
- [ ] Navigation between pages works
- [ ] Error states handled properly

**Deliverable:** Users can manage job lifecycle (CRUD)

---

## Phase 3: Endpoint Configuration (Week 2)

**Goal:** Users can add and configure HTTP endpoints

### Add Endpoint (`/jobs/:jobId/endpoints/new`)
- [ ] Create route file `src/routes/jobs/$jobId/endpoints/new.tsx`
- [ ] Build endpoint creation form
  - [ ] Basic info section:
    - [ ] Name (required)
    - [ ] URL (required, type="url")
    - [ ] HTTP Method dropdown (GET/POST/PUT/PATCH/DELETE)
  - [ ] Schedule section:
    - [ ] Baseline interval (minutes) OR
    - [ ] Cron expression (text input)
    - [ ] Min interval (optional, for guardrails)
    - [ ] Max interval (optional, for guardrails)
  - [ ] Advanced section (collapsible):
    - [ ] Request headers (key-value pairs, max 5)
    - [ ] Request body (JSON textarea, only for POST/PUT/PATCH)
    - [ ] Timeout (ms, default: 30000)
    - [ ] Max response size (KB, default: 100)
  - [ ] Submit and cancel buttons
- [ ] Implement form submission
  - [ ] POST to `/api/jobs/:jobId/endpoints`
  - [ ] Handle success → redirect to job details
  - [ ] Handle errors (quota limits, validation)
- [ ] Add client-side validation
  - [ ] Required fields
  - [ ] Valid URL format
  - [ ] Valid JSON in body field
  - [ ] Interval within min/max range
- [ ] Test endpoint creation

### Edit Endpoint (`/jobs/:jobId/endpoints/:id/edit`)
- [ ] Create route file `src/routes/jobs/$jobId/endpoints/$id/edit.tsx`
- [ ] Implement data loader (fetch endpoint details)
- [ ] Reuse form component with pre-populated values
- [ ] Add additional actions:
  - [ ] "Pause Endpoint" button
  - [ ] "Resume Endpoint" button
  - [ ] "Reset Failure Count" button
  - [ ] "Clear AI Hints" button
- [ ] Implement PATCH to `/api/jobs/:jobId/endpoints/:id`
- [ ] Test edit flow

### Delete Endpoint
- [ ] Add delete action to endpoint row
- [ ] Confirmation dialog
- [ ] DELETE to `/api/jobs/:jobId/endpoints/:id`
- [ ] Success → refresh job details
- [ ] Test deletion

### Pause/Resume Actions
- [ ] Implement pause endpoint
  - [ ] POST to `/api/endpoints/:id/pause` with `pausedUntil`
  - [ ] Update UI to show "Paused" status
- [ ] Implement resume endpoint
  - [ ] POST to `/api/endpoints/:id/pause` with `pausedUntil: null`
  - [ ] Update UI to show "Active" status
- [ ] Test pause/resume

### Testing
- [ ] Endpoint creation works with all field combinations
- [ ] Validation catches errors before submission
- [ ] Edit endpoint updates correctly
- [ ] Pause/resume toggles work
- [ ] Delete removes endpoint
- [ ] Quota limits enforced (error message shown)

**Deliverable:** Users can configure HTTP endpoints fully

---

## Phase 4: Run History & Monitoring (Week 3)

**Goal:** Users can view execution history and debug failures

### Shared Components
- [ ] `DateTimeDisplay` - Relative time + absolute tooltip
- [ ] `CodeBlock` - Formatted JSON display with syntax highlighting
- [ ] `Pagination` - Simple prev/next navigation

### Runs List (`/endpoints/:id/runs`)
- [ ] Create route file `src/routes/endpoints/$id/runs.tsx`
- [ ] Implement data loader with filters
  - [ ] Status filter (all/success/failure)
  - [ ] Date range (last 24h/7d/30d/all time)
  - [ ] Pagination (50 runs per page)
- [ ] Build `FilterControls` component
  - [ ] Status dropdown
  - [ ] Date range selector
  - [ ] Apply filters → update URL params → refetch
- [ ] Build `RunsTable` component
  - [ ] Columns: Run ID, Status, Duration, Timestamp, Error (if failed)
  - [ ] Click row → navigate to run details
  - [ ] Mobile: Convert table to card list
- [ ] Add pagination component
- [ ] Handle empty state (no runs yet)
- [ ] Test run list with different filters

### Run Details (`/runs/:id`)
- [ ] Create route file `src/routes/runs/$id.tsx`
- [ ] Implement data loader (fetch run details)
- [ ] Build `RunSummary` component
  - [ ] Status badge
  - [ ] Duration
  - [ ] Timestamp
  - [ ] Endpoint name + link to endpoint
  - [ ] Source (baseline/AI hint/manual)
- [ ] Build `RequestDetails` component
  - [ ] URL and method
  - [ ] Headers (formatted)
  - [ ] Body (formatted JSON if applicable)
- [ ] Build `ResponseDetails` component
  - [ ] Status code
  - [ ] Response body (formatted, truncated if large)
  - [ ] Error message and stack trace (if failed)
- [ ] Build `SchedulingInfo` component
  - [ ] Next scheduled run
  - [ ] Current interval
  - [ ] Active AI hints (if any)
- [ ] Add breadcrumb navigation (Job → Endpoint → Runs → Run)
- [ ] Test run details page

### Health Summary (`/endpoints/:id/health`)
- [ ] Create route file `src/routes/endpoints/$id/health.tsx`
- [ ] Implement data loader (fetch health metrics)
- [ ] Build `MetricsCards` component
  - [ ] Success rate (%)
  - [ ] Total runs (last 24h)
  - [ ] Average duration
  - [ ] Failure count
  - [ ] Overall health status (healthy/degraded/failing)
- [ ] Build `RecentFailures` component
  - [ ] Last 5 failed runs
  - [ ] Error messages
  - [ ] Links to run details
- [ ] Add "View All Runs" link
- [ ] Test health summary

### Testing
- [ ] Runs list displays correctly
- [ ] Filters work (status, date range)
- [ ] Pagination works
- [ ] Run details shows all information
- [ ] Health metrics calculated correctly
- [ ] Navigation works throughout monitoring section

**Deliverable:** Users can monitor and debug job execution

---

## Phase 5: API Key Management (Week 4)

**Goal:** Users can generate and manage API keys

### Shared Components
- [ ] `CopyButton` - Copy to clipboard with visual feedback

### API Keys Page (`/settings/api-keys`)
- [ ] Create route file `src/routes/settings/api-keys.tsx`
- [ ] Implement data loader (fetch user's API keys)
- [ ] Build `KeysList` component
  - [ ] Table: Key name, Prefix (cron_abc...), Created date, Actions
  - [ ] Empty state (no keys yet)
- [ ] Build `GenerateKeyButton` component
  - [ ] Click → open modal/form
- [ ] Build `GenerateKeyModal` component
  - [ ] Input: Key name/label
  - [ ] Submit → POST to Better Auth API key endpoint
  - [ ] Success → Show key ONCE with copy button
  - [ ] Warning: "Save this now! You won't see it again"
  - [ ] After modal closes → key hidden forever
- [ ] Build revoke functionality
  - [ ] "Revoke" button on each key
  - [ ] Confirmation dialog
  - [ ] DELETE to Better Auth API
  - [ ] Success → remove from list
- [ ] Test API key lifecycle

### Update Settings Page
- [ ] Add "API Keys" section to `/settings`
- [ ] Link to `/settings/api-keys`
- [ ] Test navigation

### Testing
- [ ] Key generation works
- [ ] Key is shown once and copyable
- [ ] Key list updates after generation
- [ ] Revoke removes key
- [ ] Error handling for failed operations

**Deliverable:** Users can manage API keys for programmatic access

---

## Phase 6: Quota & Usage Display (Week 4)

**Goal:** Users can see their usage against limits

### Account Summary (Update Dashboard)
- [ ] Fetch quota usage from API
- [ ] Display:
  - [ ] Endpoints: X / Y (used / limit)
  - [ ] AI Tokens: X / Y (monthly, if applicable)
  - [ ] Progress bars or simple text
- [ ] Show warning if approaching limit (>80%)
- [ ] Add "Upgrade" CTA if on free tier

### Settings Quota Section (Update `/settings`)
- [ ] Add quota usage section
- [ ] Display detailed usage:
  - [ ] Current tier
  - [ ] Endpoint limit
  - [ ] Endpoints used
  - [ ] AI token limit (monthly)
  - [ ] AI tokens used this month
  - [ ] Reset date (1st of next month)
- [ ] Add "Upgrade Plan" link
- [ ] Test quota display

### Testing
- [ ] Quota displays correctly for all tiers
- [ ] Warnings show when approaching limits
- [ ] Upgrade CTAs work

**Deliverable:** Users can monitor their usage

---

## Phase 7: Polish & Refinement (Week 4)

**Goal:** Production-ready UI with great UX

### Loading States
- [ ] Add loading spinners to all data fetching
- [ ] Add skeleton screens for slow loads (optional)
- [ ] Disable buttons during form submission
- [ ] Show progress indicators for long operations

### Error Handling
- [ ] Consistent error message formatting
- [ ] User-friendly error messages (not raw API errors)
- [ ] Retry buttons where appropriate
- [ ] Network error handling (offline detection)

### Empty States
- [ ] Dashboard: "Create your first job"
- [ ] Job details: "Add your first endpoint"
- [ ] Runs list: "No runs yet, check back soon"
- [ ] API keys: "Generate your first API key"
- [ ] Review all empty states for clarity

### Responsive Design
- [ ] Test all pages on mobile (320px - 768px)
- [ ] Convert tables to card lists on mobile
- [ ] Ensure forms are mobile-friendly
- [ ] Test touch interactions
- [ ] Test on actual devices (iOS Safari, Android Chrome)

### Accessibility
- [ ] Keyboard navigation works throughout
- [ ] Focus indicators visible
- [ ] Screen reader testing (basic)
- [ ] ARIA labels on icon-only buttons
- [ ] Form labels properly associated
- [ ] Color contrast meets WCAG AA

### Performance
- [ ] Optimize bundle size (code splitting if needed)
- [ ] Lazy load heavy components
- [ ] Optimize images/icons
- [ ] Test page load times (<2s)
- [ ] Test on slow 3G network

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

### Documentation
- [ ] Update README with UI setup instructions
- [ ] Document environment variables
- [ ] Add screenshots to docs
- [ ] Create user guide (optional)

**Deliverable:** Polished, production-ready UI

---

## Phase 8: Testing & Launch Prep (Week 4)

**Goal:** Confidence to ship to production

### End-to-End Testing
- [ ] Test complete user flow: Sign up → Create job → Add endpoint → Monitor runs
- [ ] Test upgrade flow: Free → Pro (with test card)
- [ ] Test API key flow: Generate → Use in API call → Revoke
- [ ] Test error scenarios: Invalid inputs, API errors, network failures
- [ ] Test with real jobs (wait for scheduler to execute)

### Security Review
- [ ] XSS protection (sanitize user inputs)
- [ ] CSRF protection (Better Auth handles this)
- [ ] Ensure API keys not exposed in client code
- [ ] Check for sensitive data in console logs
- [ ] Review CORS configuration

### Production Checklist
- [ ] Set up production environment variables
- [ ] Configure production API URL
- [ ] Test OAuth with production GitHub app
- [ ] Test Stripe with live mode keys
- [ ] Set up error tracking (Sentry, optional)
- [ ] Set up analytics (Plausible/Fathom, optional)
- [ ] Configure deployment (Vercel/Netlify)
- [ ] Test production build locally
- [ ] Set up monitoring/uptime checks

### Launch Preparation
- [ ] Create launch announcement
- [ ] Prepare support documentation
- [ ] Set up feedback collection method
- [ ] Define success metrics
- [ ] Plan post-launch iteration based on feedback

**Deliverable:** Production-ready application

---

## Post-MVP Enhancements (Future)

These can wait until after initial launch:

### Analytics & Insights
- [ ] Job performance trends
- [ ] Cost dashboard (AI token spending)
- [ ] Usage graphs over time

### Advanced Features
- [ ] Job templates/cloning
- [ ] Bulk operations (pause multiple endpoints)
- [ ] Job dependencies/workflows
- [ ] Custom AI prompts

### Collaboration
- [ ] Team management
- [ ] Shared jobs
- [ ] User roles and permissions
- [ ] Activity feed

### Developer Tools
- [ ] API playground
- [ ] Webhook testing
- [ ] Request/response inspector
- [ ] Debugging console

---

## Success Criteria

✅ MVP is complete when:
- [ ] All Phase 1-8 tasks completed
- [ ] Users can complete all 4 core flows without errors:
  1. Sign up and create first job
  2. Monitor job execution and debug failures
  3. Upgrade subscription plan
  4. Generate and use API key
- [ ] UI works on mobile and desktop
- [ ] No critical bugs or security issues
- [ ] Production deployment successful
- [ ] At least 3 beta users have successfully used the app

---

**Estimated Timeline:** 3-4 weeks (single developer)  
**Current Phase:** Planning  
**Next Steps:** Review requirements, begin Phase 1 implementation

---

**Note:** This is a living document. Update task status as work progresses. Adjust timeline as needed based on actual velocity.
