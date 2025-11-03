# UI Pre-Implementation Gaps

Analysis of TODOs, workarounds, and missing functionality that must be addressed before component implementation.

**Status:** Generated on 2025-10-17 during UI routing infrastructure completion

---

## 1. API Endpoints - MISSING (Backend Work Required)

### 1.1 Single Endpoint GET Route
**Priority:** HIGH  
**Status:** ❌ MISSING  
**Impact:** Currently using inefficient workaround (list all + filter)

**Current Workaround:**
```typescript
// apps/web/src/lib/api-client/queries/endpoints.queries.ts
export const getEndpoint = async (jobId: string, id: string): Promise<any> => {
    const data = await listEndpoints(jobId);
    const endpoint = data.endpoints.find(e => e.id === id);
    if (!endpoint) {
        throw new Error(`Endpoint ${id} not found`);
    }
    return endpoint;
};
```

**Required API Route:**
```
GET /api/jobs/:jobId/endpoints/:id
Response: EndpointResponse (single endpoint object)
```

**Affected Routes:**
- `/jobs/$jobId/endpoints/$id/edit` - Edit endpoint page
- Any component that needs single endpoint details

**Implementation Notes:**
- Add route to `apps/api/src/routes/jobs/jobs.routes.ts`
- Add handler to `apps/api/src/routes/jobs/jobs.handlers.ts`
- Use existing `EndpointResponseSchema` from api-contracts
- Once added, remove workaround and uncomment proper implementation

---

### 1.2 Better Auth API Keys Endpoint
**Priority:** MEDIUM  
**Status:** ❌ MISSING  
**Impact:** Cannot implement API keys management page

**Required API Routes:**
```
GET    /api/auth/api-keys           - List user's API keys
POST   /api/auth/api-keys           - Generate new API key
DELETE /api/auth/api-keys/:id       - Revoke API key
```

**Response Schema (suggested):**
```typescript
{
  id: string;
  name: string;
  keyPrefix: string;  // First 8 chars for display
  createdAt: string;  // ISO 8601
  lastUsedAt?: string;
}
```

**Affected Routes:**
- `/settings/api-keys` - Currently has TODO stubs

**Implementation Notes:**
- Check if Better Auth has built-in API key support
- If not, implement custom endpoints in `apps/api/src/routes/auth/`
- API key should only show full value ONCE on creation
- Store hashed version in database

---

### 1.3 Quota/Usage Metrics Endpoint
**Priority:** MEDIUM  
**Status:** ❌ MISSING  
**Impact:** Cannot display usage metrics on dashboard and settings

**Required API Route:**
```
GET /api/subscriptions/usage
Response: {
  endpointsUsed: number;
  endpointsLimit: number;
  aiTokensUsed: number;
  aiTokensLimit: number;
  periodStart: string;
  periodEnd: string;
}
```

**Affected Routes:**
- `/dashboard` - "TODO: Display current tier, endpoints used/limit, AI tokens usage"
- `/settings` - "TODO: Display endpoints used/limit, AI tokens used/limit"

**Implementation Notes:**
- Add to `apps/api/src/routes/subscriptions/`
- Query current subscription tier limits
- Count active endpoints for user
- Track AI token usage (if not already tracked)
- Cache for 60 seconds (similar to subscription status)

---

## 2. API Response Schema Enhancements - MISSING DATA

### 2.1 Run Details Missing Endpoint Info
**Priority:** MEDIUM  
**Status:** ⚠️ INCOMPLETE SCHEMA  
**Impact:** Cannot display request details (URL, method) on run details page

**Current Issue:**
```typescript
// Run response only has endpointId, not full endpoint object
{
  id: string;
  endpointId: string;  // Just the ID
  status: string;
  // ... missing: endpoint.url, endpoint.method
}
```

**Solutions (pick one):**

**Option A: Expand Run Response Schema**
```typescript
// Add to RunDetailsResponseSchema
{
  endpoint: {
    id: string;
    url: string;
    method: string;
    name: string;
  }
}
```

**Option B: Fetch Separately (current approach)**
```typescript
// In component, make two queries
const run = useSuspenseQuery(runQueryOptions(runId));
const endpoint = useSuspenseQuery(endpointQueryOptions(run.endpointId));
```

**Affected Routes:**
- `/runs/$id` - "TODO: Fetch endpoint details to show URL and method"

**Recommendation:** Option A (expand schema) - single query is more efficient

---

### 2.2 Run Details Missing Request/Response Data
**Priority:** LOW  
**Status:** ⚠️ INCOMPLETE SCHEMA  
**Impact:** Cannot display request headers, body, or response details

**Current Schema Gaps:**
```typescript
// RunDetailsResponseSchema missing:
requestHeaders?: Record<string, string>;
requestBody?: any;
responseStatusCode?: number;
responseBody?: any;
responseHeaders?: Record<string, string>;
```

**Affected Routes:**
- `/runs/$id` - "TODO: Show request headers/body, response body"

**Implementation Notes:**
- Consider size limits (large response bodies)
- May want to truncate/paginate large responses
- Store in separate column or blob storage?

---

## 3. Query Functions - IMPLEMENTATION NEEDED

### 3.1 Missing Query Mutations
**Priority:** HIGH  
**Status:** ❌ NOT IMPLEMENTED  
**Impact:** Forms cannot submit data

**Missing Mutations:**

#### Create Job
```typescript
// apps/web/src/lib/api-client/queries/jobs.queries.ts
export const createJobMutation = () => ({
  mutationFn: (data: CreateJobRequest) => createJob(data),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    // Navigate to /jobs/${data.id}
  }
});
```

**Affected Routes:**
- `/jobs/new` - "TODO: useMutation for POST /api/jobs"

#### Update Job
```typescript
export const updateJobMutation = (jobId: string) => ({
  mutationFn: (data: UpdateJobRequest) => updateJob(jobId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
  }
});
```

**Affected Routes:**
- `/jobs/$id` - Inline edit job name/description

#### Create Endpoint
```typescript
export const createEndpointMutation = (jobId: string) => ({
  mutationFn: (data: CreateEndpointRequest) => createEndpoint(jobId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "endpoints"] });
    // Navigate to /jobs/${jobId}
  }
});
```

**Affected Routes:**
- `/jobs/$jobId/endpoints/new` - "TODO: useMutation for POST /api/jobs/:jobId/endpoints"

#### Update Endpoint
```typescript
export const updateEndpointMutation = (jobId: string, endpointId: string) => ({
  mutationFn: (data: UpdateEndpointRequest) => updateEndpoint(jobId, endpointId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "endpoints"] });
  }
});
```

**Affected Routes:**
- `/jobs/$jobId/endpoints/$id/edit` - "TODO: useMutation for PUT /api/endpoints/:id"

#### Endpoint Actions (Pause/Resume, Reset Failures, Clear Hints)
```typescript
// Already have API functions, need mutation wrappers
export const pauseEndpointMutation = () => ({ ... });
export const resetFailuresMutation = () => ({ ... });
export const clearHintsMutation = () => ({ ... });
```

**Affected Routes:**
- `/jobs/$jobId/endpoints/$id/edit` - Action buttons

---

## 4. Component Stubs - READY FOR IMPLEMENTATION

These are UI-only, no backend changes needed. Listed for completeness:

### 4.1 Dashboard Components
- `JobCard` - Display job with name, description, endpoint count, recent status
- `AccountSummaryCard` - Display tier, quota usage (blocked by 1.3)
- Empty state for new users

### 4.2 Job Details Components
- `JobHeader` - Editable name/description
- `EndpointsList` - Table with status badges
- `RecentActivity` - Last 10 runs across all endpoints

### 4.3 Form Components
- `CreateJobForm` - Name + description fields
- `CreateEndpointForm` - URL, method, schedule, headers, body
- `EditEndpointForm` - Same as create, pre-populated

### 4.4 Runs Components
- `RunsTable` - Status badges, duration, timestamp
- `RunFilters` - Status dropdown, date range picker
- `Pagination` - Simple prev/next

### 4.5 Run Details Components
- `RunSummary` - Status, duration, timestamps
- `RequestDetails` - URL, method, headers, body (blocked by 2.2)
- `ResponseDetails` - Status code, body, error message (blocked by 2.2)
- `SchedulingInfo` - Next run, interval, AI hints

### 4.6 Health Components
- `HealthMetrics` - Cards with calculations (DONE)
- Charts/visualization (optional v2)
- Recent failures list (blocked by 2.2 or separate query)

---

## 5. Implementation Priority

### Phase 1: Critical Blockers (Do First)
1. **Add GET /jobs/:jobId/endpoints/:id endpoint** (1.1)
   - Removes workaround
   - Needed for edit page
   
2. **Add mutation functions** (3.1)
   - Required for all forms
   - Can implement immediately, API routes exist

3. **Create Job/Endpoint forms** (4.3)
   - Core workflow: create job → add endpoint
   - High user value

### Phase 2: Enhanced Features
4. **Add quota/usage endpoint** (1.3)
   - Nice-to-have for dashboard
   - Shows value to users

5. **Expand run details schema** (2.1, 2.2)
   - Better debugging experience
   - Can be phased (URL/method first, then full request/response)

### Phase 3: Nice-to-Have
6. **Better Auth API keys** (1.2)
   - Lower priority for MVP
   - Users can use cookies for now

7. **Advanced UI components** (4.4, 4.5, 4.6)
   - Charts, advanced filters
   - V2 features

---

## 6. Action Items Summary

**Backend (API) Work Required:**
- [ ] Add `GET /jobs/:jobId/endpoints/:id` route
- [ ] Add `GET /subscriptions/usage` route
- [ ] Consider expanding `RunDetailsResponseSchema` with endpoint data
- [ ] Consider adding request/response data to run storage
- [ ] Better Auth API keys endpoints (lower priority)

**Frontend (Query Functions) Work Required:**
- [ ] Implement mutation wrappers for create/update operations
- [ ] Add query invalidation logic
- [ ] Add navigation logic for successful mutations

**Frontend (Components) Work Ready:**
- [ ] All component stubs ready for implementation
- [ ] No backend blockers for basic UI
- [ ] Can build forms with existing mutation functions once added

---

## 7. Workarounds Currently in Use

### 7.1 getEndpoint Workaround
**File:** `apps/web/src/lib/api-client/queries/endpoints.queries.ts`  
**Issue:** Fetches all endpoints then filters by ID  
**Performance Impact:** Minimal for small lists, inefficient for 100+ endpoints  
**Remove When:** API route added

---

## Next Steps

1. Review this document with team
2. Decide on Phase 1 vs Phase 2 priorities
3. Create backend tickets for API work (section 1)
4. Implement mutation functions (section 3.1) - can do now
5. Begin component implementation (section 4) in parallel
