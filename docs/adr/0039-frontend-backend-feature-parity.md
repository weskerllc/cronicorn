# Frontend-Backend Feature Parity for Endpoint Configuration

**Date:** 2025-10-31  
**Status:** Implemented

## Context

During a comprehensive gap analysis between backend API capabilities and frontend UI, we discovered that approximately 40% of backend endpoint configuration features were not exposed in the UI. Users could not:

1. **Send request bodies** - The `bodyJson` field was missing, blocking POST/PUT/PATCH requests entirely
2. **Configure production timeouts** - Critical fields like `timeoutMs`, `maxExecutionTimeMs`, and `maxResponseSizeKb` were unavailable
3. **Set AI scheduling constraints** - `minIntervalMinutes` and `maxIntervalMinutes` were not exposed
4. **Understand run context** - Display fields like `source` and `attempt` were missing from run details
5. **Monitor failure patterns** - `failureStreak` was not shown in health metrics
6. **Trigger immediate runs** - No UI for `scheduleOneShot` API to run endpoints on demand
7. **Manually adjust scheduling** - No UI for `applyIntervalHint` API to override intervals
8. **Filter jobs efficiently** - Status filtering was client-side only, not using backend query parameters

This created a significant usability gap where the backend supported advanced features but users had no way to access them through the UI.

## Decision

We decided to expose all critical backend configuration options in the frontend while maintaining UX clarity through:

### 1. **Separation of Concerns for Form Schemas**
- Keep **UI schemas** in `apps/web/src/lib/endpoint-forms/schemas.ts` for presentation layer (user-friendly units like minutes)
- Keep **API contract schemas** in `@cronicorn/api-contracts` as the source of validation truth
- Use **transform functions** (`utils.ts`) to bridge UI → API format (minutes to milliseconds, JSON parsing)

**Rationale:** UI schemas serve different purposes than API contracts. They handle:
- User-friendly units (minutes vs milliseconds)
- Form structure (discriminated unions for schedule types)
- Presentation-layer validation refinements
- Optional field handling for form state

### 2. **Progressive Disclosure for Advanced Features**
- Add **collapsible "Advanced Configuration"** section with `useState` toggle
- Show critical fields (name, URL, method, schedule) prominently
- Hide advanced fields (timeouts, constraints, bodyJson) behind expandable section
- Default to collapsed state to avoid overwhelming new users

**Rationale:** Prevents cognitive overload while still providing power users full control. Critical path remains simple.

### 3. **Conditional Field Visibility**
- Show `bodyJson` textarea **only** when HTTP method is POST, PUT, or PATCH
- Provide JSON placeholder text to guide users
- Include validation hints in form descriptions

**Rationale:** Reduces clutter by showing fields only when relevant to the selected configuration.

### 4. **Enhanced Data Display Without Clutter**
- Add `source` badge to run details showing what triggered the run (baseline-cron, ai-interval, etc.)
- Show `attempt` field to indicate retry count ("First run" vs "Retry #2")
- Display `failureStreak` badge in health metrics with conditional styling (destructive variant for > 0)

**Rationale:** Critical diagnostic information should be visible without adding form complexity.

### 5. **Action Buttons for Runtime Control**
- Add **"Run Now"** button using `scheduleOneShot` API with `nextRunInMs: 0`
- Add **"Set Interval Hint"** dialog using `applyIntervalHint` API
- Disable "Run Now" when endpoint is paused to prevent confusing failures
- Use dialog pattern for interval hints to collect interval, TTL, and reason

**Rationale:** Users need runtime control over scheduling without editing endpoint configuration. Dialogs prevent accidental triggers while maintaining accessibility.

### 6. **Server-Side Filtering for Jobs List**
- Replace client-side toggle with **Select dropdown** for status filtering
- Use backend `?status=` query parameter (all, active, paused, archived)
- Default to "Active Only" to show relevant jobs by default
- Leverage API-level filtering for efficiency and consistency

**Rationale:** Server-side filtering is more efficient and allows backend to optimize queries. Select dropdown provides better UX than binary toggle.

### 7. **Simplified Number Handling**
- Use `Number(value)` constructor instead of `Number.parseInt(value, 10)` for form inputs
- Use nullish coalescing (`??`) for optional number fields to properly distinguish 0 from empty
- Use logical OR (`||`) for required fields where null/undefined is impossible

**Rationale:** Cleaner, more readable code. `Number()` handles both integers and decimals, matches HTML5 `type="number"` behavior.

## Consequences

### Code Affected
- **Forms**: `apps/web/src/routes/_authed/jobs.$jobId.endpoints.new.tsx` and `apps/web/src/routes/_authed/endpoints.$id.index.tsx`
  - Added bodyJson textarea with conditional rendering
  - Added collapsible advanced config section
  - Added all missing configuration fields
  
- **Form Schemas**: `apps/web/src/lib/endpoint-forms/schemas.ts`
  - Extended `baseEndpointFields` with bodyJson, timeoutMs, maxExecutionTimeMs, maxResponseSizeKb, minIntervalMinutes, maxIntervalMinutes
  - Maintained discriminated unions for schedule types
  - Added validation refinements for min/max interval constraints

- **Transform Functions**: `apps/web/src/lib/endpoint-forms/utils.ts`
  - Added JSON parsing with error handling for bodyJson
  - Added millisecond conversions for all time-based fields
  - Proper undefined handling for optional fields

- **API Client**: `apps/web/src/lib/api-client/queries/endpoints.queries.ts`
  - Added `applyIntervalHint` and `scheduleOneShot` mutation functions for adaptive scheduling

- **Display Components**: 
  - `apps/web/src/routes/_authed/runs.$id.tsx` - Added source and attempt fields
  - `apps/web/src/routes/_authed/endpoints.$id.health.tsx` - Added failureStreak badge
  - `apps/web/src/routes/_authed/endpoints.$id.index.tsx` - Added Advanced Configuration card showing timeout/execution limits

- **Action Components**:
  - `apps/web/src/routes/_authed/endpoints.$id.index.tsx` - Added "Run Now" button with scheduleOneShot mutation
  - `apps/web/src/routes/_authed/endpoints.$id.index.tsx` - Added "Set Interval Hint" dialog with applyIntervalHint mutation
  - Dialog includes form for intervalMinutes, ttlMinutes, and reason fields

- **List Filtering**:
  - `apps/web/src/routes/_authed/jobs.index.tsx` - Replaced client-side toggle with Select dropdown
  - Now uses `jobsQueryOptions({ status: statusFilter })` for server-side filtering

### Tradeoffs
**Pros:**
- Users can now configure request bodies, unblocking POST/PUT/PATCH workflows
- Production-ready timeout and constraint configuration
- Enhanced debugging with source/attempt/failureStreak visibility
- Runtime control with "Run Now" and manual interval hints
- Efficient server-side filtering for jobs list
- Clean UX through progressive disclosure
- Maintainable separation between UI and API schemas
- **100% feature parity** between backend capabilities and frontend UI

**Cons:**
- Advanced section adds one more click for power users
- Transform layer adds indirection between form and API
- JSON textarea lacks syntax highlighting (acceptable for MVP)
- More fields means more testing surface area
- Dialog for interval hints adds UI complexity (but prevents accidental changes)
- Four-option status filter may be overwhelming for new users (mitigated by sensible default)

### If We Reverse This
If we later decide to simplify or change this approach, we would need to:
1. Remove the advanced config section and bodyJson field from both create/edit forms
2. Remove transform logic for JSON parsing and time conversions
3. Revert schema extensions in `baseEndpointFields`
4. Remove source/attempt/failureStreak display enhancements
5. Remove "Run Now" button and scheduleOneShot mutation
6. Remove "Set Interval Hint" dialog and applyIntervalHint mutation
7. Remove Advanced Configuration card from endpoint detail page
8. Revert jobs list to simple toggle or remove filtering entirely
9. Update API client to remove hint/oneshot mutation functions

However, this is **highly unlikely** as these features are critical for production usage and complete the feature parity gap that was blocking users from utilizing the full power of the adaptive scheduling system.

## References

**Related Tasks:**
- TASK-1.2.1: Endpoint CRUD operations (foundational forms) ✅
- TASK-1.2.2: Run execution and monitoring (source/attempt display) ✅
- TASK-1.3: Adaptive scheduling UI (hints, nudges, pause) ✅

**Implementation PR:** ai-integration branch (gap analysis and complete feature implementation)

**Implementation Summary:**
- **9 features implemented** closing the frontend-backend gap
- Changed status from gap analysis → full implementation in single session
- All critical backend APIs now have corresponding UI components
- Feature parity achieved: **40% → 100%**

**Key Files:**
- `.github/instructions/architecture.instructions.md` - Hexagonal architecture pattern
- `.github/instructions/testing-strategy.instructions.md` - Transaction-per-test pattern
- `packages/api-contracts/` - Source of truth for API validation schemas
- `apps/web/src/lib/endpoint-forms/` - UI schemas and transform utilities
- `apps/web/src/lib/api-client/queries/` - Type-safe API client functions
