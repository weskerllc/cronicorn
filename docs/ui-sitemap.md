# Cronicorn MVP UI Sitemap

Visual reference for all pages and their navigation structure.

```
┌─────────────────────────────────────────────────────┐
│                   Public Pages                       │
└─────────────────────────────────────────────────────┘

/                          Landing page
├─ /login                  OAuth login (✅ exists)
├─ /register               User registration (✅ exists)
└─ /pricing                Subscription plans (✅ exists)

┌─────────────────────────────────────────────────────┐
│              Authenticated Pages (New)               │
└─────────────────────────────────────────────────────┘

/dashboard                 Main hub (NEW)
│
├─ Jobs Section
│  ├─ /jobs/new            Create job form (NEW)
│  └─ /jobs/:id            Job details (NEW)
│     └─ /jobs/:jobId/endpoints/new       Add endpoint (NEW)
│        └─ /jobs/:jobId/endpoints/:id/edit  Edit endpoint (NEW)
│
├─ Monitoring Section  
│  ├─ /endpoints/:id/runs                 Run history (NEW)
│  ├─ /endpoints/:id/health               Health summary (NEW)
│  └─ /runs/:id                           Run details (NEW)
│
└─ Settings Section (extends existing)
   └─ /settings            Account settings (✅ exists)
      ├─ Profile section   (✅ exists)
      ├─ Subscription      (✅ exists)
      └─ /settings/api-keys  API key management (NEW)

┌─────────────────────────────────────────────────────┐
│                  Navigation Flow                     │
└─────────────────────────────────────────────────────┘

Header (all authenticated pages):
  ┌────────────────────────────────────────────────┐
  │ Cronicorn 🦄    [Dashboard] [Settings] [Logout]│
  └────────────────────────────────────────────────┘

Dashboard → Create Job → Job Details → Add Endpoint → Monitor Runs
    ↓           ↓            ↓              ↓             ↓
  [List]     [Form]     [Endpoints]     [Form]       [History]

┌─────────────────────────────────────────────────────┐
│              Page Relationships                      │
└─────────────────────────────────────────────────────┘

Dashboard
  └─► Job Details (for each job)
        ├─► Add Endpoint
        ├─► Edit Endpoint
        └─► Endpoint Row
              ├─► Run History
              └─► Health Summary
                    └─► Run Details

Settings
  └─► API Keys
        ├─► Generate Key (modal)
        └─► Revoke Key (confirmation)

┌─────────────────────────────────────────────────────┐
│             Implementation Priority                  │
└─────────────────────────────────────────────────────┘

Priority 1 (Week 1): Critical path to create first job
  - Dashboard
  - Create job
  - Job details
  - Add endpoint

Priority 2 (Week 2): Configuration management
  - Edit endpoint
  - Delete job/endpoint
  - Archive/restore

Priority 3 (Week 3): Monitoring & debugging
  - Run history list
  - Run details
  - Health summary

Priority 4 (Week 4): Developer tools
  - API key management
  - Quota display
  - Polish & testing

┌─────────────────────────────────────────────────────┐
│              Page Component Hierarchy                │
└─────────────────────────────────────────────────────┘

__root.tsx (layout)
  ├─ Header
  │  ├─ Logo
  │  ├─ Navigation
  │  └─ User Menu
  │
  └─ Outlet (page content)
     │
     ├─ Dashboard
     │  ├─ AccountSummaryCard
     │  ├─ JobsList
     │  │  └─ JobCard[]
     │  └─ CreateJobCTA
     │
     ├─ Job Details
     │  ├─ JobHeader
     │  ├─ EndpointsList
     │  │  └─ EndpointRow[]
     │  ├─ AddEndpointButton
     │  └─ RecentActivity
     │
     ├─ Create/Edit Forms
     │  ├─ JobForm
     │  └─ EndpointForm
     │
     ├─ Monitoring Pages
     │  ├─ RunsList
     │  │  ├─ FilterControls
     │  │  ├─ RunsTable
     │  │  └─ Pagination
     │  ├─ RunDetails
     │  │  ├─ RunSummary
     │  │  ├─ RequestDetails
     │  │  └─ ResponseDetails
     │  └─ HealthSummary
     │     ├─ MetricsCards
     │     └─ RecentFailures
     │
     └─ Settings
        ├─ ProfileSection (existing)
        ├─ SubscriptionSection (existing)
        └─ APIKeysSection
           ├─ KeysList
           ├─ GenerateKeyButton
           └─ RevokeConfirmDialog

┌─────────────────────────────────────────────────────┐
│                Shared Components                     │
└─────────────────────────────────────────────────────┘

Reusable across pages:
  - RunStatusBadge (success/failure/running)
  - LoadingSpinner
  - ErrorMessage
  - EmptyState (no data)
  - DeleteConfirmDialog
  - CopyButton (API keys, run IDs)
  - TierBadge (free/pro/enterprise)
  - DateTimeDisplay (relative + absolute)
  - CodeBlock (JSON display)
  - Tooltip (help text)

┌─────────────────────────────────────────────────────┐
│                 Mobile Navigation                    │
└─────────────────────────────────────────────────────┘

Desktop (≥768px):
  Header with horizontal navigation

Mobile (<768px):
  ┌──────────────────────────┐
  │ ☰  Cronicorn 🦄    [User]│ ← Hamburger menu
  └──────────────────────────┘
  
  Tap ☰ → Slide-out menu:
    - Dashboard
    - Settings
    - Logout

┌─────────────────────────────────────────────────────┐
│                    URL Structure                     │
└─────────────────────────────────────────────────────┘

Public:
  /                         Landing
  /login                    Login
  /register                 Register
  /pricing                  Pricing

Dashboard:
  /dashboard                Main view

Jobs:
  /jobs/new                 Create
  /jobs/:id                 Details
  /jobs/:id/edit            Edit (optional)

Endpoints:
  /jobs/:jobId/endpoints/new              Add
  /jobs/:jobId/endpoints/:id/edit         Edit
  /endpoints/:id/runs                     History
  /endpoints/:id/health                   Health

Runs:
  /runs/:id                 Details

Settings:
  /settings                 Main
  /settings/api-keys        API keys

┌─────────────────────────────────────────────────────┐
│                  State Management                    │
└─────────────────────────────────────────────────────┘

No global state library needed:

1. Route Loaders (TanStack Router)
   - Fetch data before page render
   - Cache automatically
   - Handle loading/error states

2. React useState (local component state)
   - Form inputs
   - UI toggles (modals, dropdowns)
   - Temporary state

3. Server as source of truth
   - Refetch after mutations
   - No client-side caching complexity

Example:
  const { job, endpoints } = Route.useLoaderData();
  // Data pre-fetched, no manual state management

┌─────────────────────────────────────────────────────┐
│                  Key Interactions                    │
└─────────────────────────────────────────────────────┘

1. Create Job Flow:
   Dashboard → Click "Create Job" → Fill form → Submit → Redirect to /jobs/:id

2. Add Endpoint Flow:
   Job Details → Click "Add Endpoint" → Fill form → Submit → Refresh job page

3. View Run Details:
   Job Details → Click endpoint → Runs list → Click run → Run details

4. Upgrade Plan:
   Dashboard → See limit warning → Click "Upgrade" → Pricing → Checkout → Settings

5. Generate API Key:
   Settings → API Keys → Generate → See key once → Copy → Close

6. Debug Failure:
   Dashboard → See failed badge → Click job → See failed endpoint → Health → Run details

┌─────────────────────────────────────────────────────┐
│                    Form Patterns                     │
└─────────────────────────────────────────────────────┘

Standard form structure:
  ┌────────────────────────────────────────┐
  │ Form Title                              │
  ├────────────────────────────────────────┤
  │ Field 1 (required)                     │
  │ [___________________________]          │
  │                                        │
  │ Field 2 (optional)                     │
  │ [___________________________]          │
  │                                        │
  │ Advanced Settings ▼ (collapsible)     │
  │                                        │
  │ [Cancel] [Save]                        │
  └────────────────────────────────────────┘

All forms:
  - Submit → POST/PATCH to API
  - Success → Redirect or refetch
  - Error → Show message above form
  - Loading → Disable submit button

┌─────────────────────────────────────────────────────┐
│                    Color Coding                      │
└─────────────────────────────────────────────────────┘

Status badges (consistent across app):
  Success  → Green (bg-green-100 text-green-800)
  Failure  → Red (bg-red-100 text-red-800)
  Running  → Blue (bg-blue-100 text-blue-800)
  Paused   → Gray (bg-gray-100 text-gray-800)
  Warning  → Yellow (bg-yellow-100 text-yellow-800)

Tier badges:
  Free       → Gray
  Pro        → Blue
  Enterprise → Purple

Buttons:
  Primary   → bg-blue-600 (create, save, upgrade)
  Secondary → bg-gray-600 (cancel, view)
  Danger    → bg-red-600 (delete, revoke)

┌─────────────────────────────────────────────────────┐
│              Accessibility Notes                     │
└─────────────────────────────────────────────────────┘

Requirements for MVP:
  ✅ Semantic HTML (<button>, <nav>, <main>)
  ✅ Keyboard navigation (all actions accessible via Tab/Enter)
  ✅ Focus indicators (visible outline on focused elements)
  ✅ Alt text on images/icons
  ✅ ARIA labels on icon-only buttons
  ✅ Form labels associated with inputs
  ✅ Error messages announced to screen readers

Not required for MVP:
  ❌ WCAG AAA compliance (AA is sufficient)
  ❌ Multi-language support
  ❌ High contrast mode
  ❌ Screen reader optimization

---

**Total new pages:** 9
**Total new components:** ~15-20 reusable components
**Estimated effort:** 3-4 weeks for single developer

**Note:** This sitemap represents the MINIMAL set of pages needed for MVP. Every page listed supports a critical user workflow. Additional features can be added post-launch based on user feedback.
