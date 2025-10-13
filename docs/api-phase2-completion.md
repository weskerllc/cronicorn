# API Phase 2 - Completion Checklist

**Status**: Authentication complete, ready for remaining CRUD operations
**Date**: 2025-10-13

## ✅ Completed (Phase 2.1 - Authentication)

- [x] Better Auth integration with Drizzle adapter
- [x] OAuth authentication (GitHub)
- [x] API key authentication with rate limiting
- [x] Unified `requireAuth` middleware
- [x] Route protection pattern (`/jobs/*` protected)
- [x] Context management (auth + jobsManager)
- [x] Performance optimization (no DB queries for API key auth)
- [x] Public routes (health, docs)
- [x] Type-safe auth context
- [x] ADR documented (ADR-0011)

## 🔄 In Progress (Phase 2.2 - Job Management)

### POST /jobs - Create Job ✅ READY
**Status**: Implementation complete, needs integration test

Current state:
- ✅ Route defined with OpenAPI schema
- ✅ Handler delegates to JobsManager
- ✅ Authentication required
- ✅ Request validation (Zod schemas)
- ✅ Response mapping (domain → API DTOs)

**Next steps**:
1. Integration test with real database
2. E2E test with authentication
3. Verify cron vs interval calculation

---

## 📋 Suggested Immediate Next Steps (Priority Order)

### 1. POST /jobs Integration Test (1-2 hours)
**Why**: Validate the full stack works end-to-end

```typescript
// apps/api/src/jobs/__tests__/integration/create-job.test.ts
describe("POST /api/jobs", () => {
  let app: AppOpenAPI;
  let db: Database;
  let apiKey: string;

  beforeAll(async () => {
    db = await setupTestDatabase();
    app = await createApp(db, testConfig);
    apiKey = await createTestApiKey(db, testUserId);
  });

  it("creates cron-based job", async () => {
    const res = await app.request("/api/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        name: "Daily report",
        baselineCron: "0 9 * * *",
        url: "https://example.com/webhook",
      }),
    });

    expect(res.status).toBe(201);
    const job = await res.json();
    expect(job.id).toBeDefined();
    expect(job.nextRunAt).toBeDefined();
  });

  it("creates interval-based job", async () => { /* ... */ });
  it("validates required fields", async () => { /* ... */ });
  it("returns 401 without auth", async () => { /* ... */ });
});
```

**Files to create**:
- `apps/api/src/jobs/__tests__/integration/create-job.test.ts`
- `apps/api/src/__tests__/helpers/test-database.ts` (shared DB setup)
- `apps/api/src/__tests__/helpers/test-auth.ts` (API key creation)

---

### 2. GET /jobs - List Jobs (2-3 hours)
**Why**: Users need to see their jobs

**Implementation**:
```typescript
// apps/api/src/jobs/jobs.routes.ts
export const list = createRoute({
  path: "/jobs",
  method: "get",
  tags: ["Jobs"],
  summary: "List user's jobs",
  request: {
    query: z.object({
      limit: z.coerce.number().int().positive().max(100).default(20),
      offset: z.coerce.number().int().nonnegative().default(0),
    }),
  },
  responses: {
    [200]: jsonContent(
      z.object({
        jobs: z.array(JobResponseSchema),
        total: z.number(),
      }),
      "List of jobs",
    ),
  },
});

// apps/api/src/jobs/jobs.handlers.ts
export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const { limit, offset } = c.req.valid("query");
  
  const manager = c.get("jobsManager");
  const result = await manager.listJobs(userId, { limit, offset });
  
  return c.json({
    jobs: result.jobs.map(mapJobToResponse),
    total: result.total,
  });
};

// packages/services/src/jobs/manager.ts
async listJobs(
  userId: string,
  options: { limit: number; offset: number }
): Promise<{ jobs: JobEndpoint[]; total: number }> {
  return this.txProvider.transaction(async (tx) => {
    const repo = new DrizzleJobsRepo(tx as any, this.clock);
    return repo.listByUser(userId, options);
  });
}

// packages/adapter-drizzle/src/jobs-repo.ts
async listByUser(
  userId: string,
  options: { limit: number; offset: number }
): Promise<{ jobs: JobEndpoint[]; total: number }> {
  const [jobs, [{ count }]] = await Promise.all([
    this.tx
      .select()
      .from(schema.jobEndpoints)
      .where(eq(schema.jobEndpoints.tenantId, userId))
      .orderBy(desc(schema.jobEndpoints.nextRunAt))
      .limit(options.limit)
      .offset(options.offset),
    this.tx
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobEndpoints)
      .where(eq(schema.jobEndpoints.tenantId, userId)),
  ]);

  return {
    jobs: jobs.map(this.mapRowToEndpoint),
    total: Number(count),
  };
}
```

**Tasks**:
- [ ] Add `listByUser` method to DrizzleJobsRepo
- [ ] Add `listJobs` method to JobsManager
- [ ] Create GET /jobs route and handler
- [ ] Add pagination query params
- [ ] Write integration tests
- [ ] Update OpenAPI docs

---

### 3. GET /jobs/:id - Get Single Job (1 hour)
**Why**: View job details

**Implementation**:
```typescript
export const get = createRoute({
  path: "/jobs/:id",
  method: "get",
  tags: ["Jobs"],
  summary: "Get job by ID",
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    [200]: jsonContent(JobResponseSchema, "Job details"),
    [404]: jsonContent(z.object({ message: z.string() }), "Job not found"),
  },
});

export const get: AppRouteHandler<GetRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const { id } = c.req.valid("param");
  
  const manager = c.get("jobsManager");
  const job = await manager.getJob(userId, id);
  
  if (!job) {
    throw new HTTPException(404, { message: "Job not found" });
  }
  
  return c.json(mapJobToResponse(job));
};
```

**Tasks**:
- [ ] Add `getById` method to DrizzleJobsRepo (with userId check)
- [ ] Add `getJob` method to JobsManager
- [ ] Create GET /jobs/:id route and handler
- [ ] Handle 404 case
- [ ] Write integration tests

---

### 4. PATCH /jobs/:id - Update Job (2-3 hours)
**Why**: Modify job configuration

**Considerations**:
- Allow updating: name, baselineCron, baselineIntervalMs, url, method, headers, body, timeout
- Disallow updating: id, tenantId, nextRunAt, lastRunAt, failureCount
- Recalculate nextRunAt if baseline changed?
- Partial updates (only provided fields)

**Implementation**:
```typescript
export const UpdateJobRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  baselineCron: z.string().optional(),
  baselineIntervalMs: z.number().int().positive().optional(),
  minIntervalMs: z.number().int().positive().optional(),
  maxIntervalMs: z.number().int().positive().optional(),
  url: z.string().url().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  headersJson: z.record(z.string()).optional(),
  bodyJson: z.any().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");
  
  const manager = c.get("jobsManager");
  const job = await manager.updateJob(userId, id, updates);
  
  if (!job) {
    throw new HTTPException(404, { message: "Job not found" });
  }
  
  return c.json(mapJobToResponse(job));
};
```

**Open questions**:
- Should updating baseline recalculate nextRunAt immediately?
- Should we allow pausing via PATCH or dedicated endpoint?

---

### 5. DELETE /jobs/:id - Delete Job (1 hour)
**Why**: Remove unwanted jobs

**Implementation**:
```typescript
export const remove = createRoute({
  path: "/jobs/:id",
  method: "delete",
  tags: ["Jobs"],
  summary: "Delete job",
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    [204]: { description: "Job deleted successfully" },
    [404]: jsonContent(z.object({ message: z.string() }), "Job not found"),
  },
});

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const { id } = c.req.valid("param");
  
  const manager = c.get("jobsManager");
  const deleted = await manager.deleteJob(userId, id);
  
  if (!deleted) {
    throw new HTTPException(404, { message: "Job not found" });
  }
  
  return c.body(null, 204);
};
```

**Tasks**:
- [ ] Add `delete` method to DrizzleJobsRepo (with userId check)
- [ ] Add `deleteJob` method to JobsManager
- [ ] Create DELETE /jobs/:id route and handler
- [ ] Consider soft delete vs hard delete
- [ ] Handle cascading deletes (runs table has FK to job_endpoints)

---

### 6. POST /jobs/:id/pause - Pause Job (1 hour)
**Why**: Temporarily disable job execution

**Implementation**:
```typescript
export const pause = createRoute({
  path: "/jobs/:id/pause",
  method: "post",
  tags: ["Jobs"],
  summary: "Pause job until specified time",
  request: {
    params: z.object({ id: z.string() }),
    body: jsonContent(z.object({
      until: z.string().datetime().optional(), // Omit = indefinite pause
    })),
  },
  responses: {
    [200]: jsonContent(JobResponseSchema, "Job paused"),
    [404]: jsonContent(z.object({ message: z.string() }), "Job not found"),
  },
});

export const pause: AppRouteHandler<PauseRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const { id } = c.req.valid("param");
  const { until } = c.req.valid("json");
  
  const manager = c.get("jobsManager");
  const job = await manager.pauseJob(userId, id, until ? new Date(until) : null);
  
  if (!job) {
    throw new HTTPException(404, { message: "Job not found" });
  }
  
  return c.json(mapJobToResponse(job));
};
```

**Resume implementation**:
```typescript
// POST /jobs/:id/resume
export const resume: AppRouteHandler<ResumeRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const { id } = c.req.valid("param");
  
  const manager = c.get("jobsManager");
  const job = await manager.resumeJob(userId, id);
  
  if (!job) {
    throw new HTTPException(404, { message: "Job not found" });
  }
  
  return c.json(mapJobToResponse(job));
};
```

---

### 7. GET /jobs/:id/runs - List Job Runs (1-2 hours)
**Why**: View execution history

**Implementation**:
```typescript
export const listRuns = createRoute({
  path: "/jobs/:id/runs",
  method: "get",
  tags: ["Jobs"],
  summary: "List job execution history",
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({
      limit: z.coerce.number().int().positive().max(100).default(20),
      offset: z.coerce.number().int().nonnegative().default(0),
    }),
  },
  responses: {
    [200]: jsonContent(z.object({
      runs: z.array(RunResponseSchema),
      total: z.number(),
    })),
  },
});

export const RunResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["success", "failed", "timeout", "cancelled"]),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  durationMs: z.number().optional(),
  errorMessage: z.string().optional(),
});
```

**Tasks**:
- [ ] Add `listByEndpoint` method to DrizzleRunsRepo
- [ ] Add `listJobRuns` method to JobsManager
- [ ] Verify user owns the job (security check)
- [ ] Add pagination
- [ ] Write integration tests

---

## 🎯 Recommended Completion Order

### Week 1 Focus: Core CRUD (High Priority)
1. **POST /jobs integration test** (validate current implementation)
2. **GET /jobs** (list user's jobs)
3. **GET /jobs/:id** (view single job)
4. **DELETE /jobs/:id** (remove jobs)

**Deliverable**: Users can create, list, view, and delete jobs via API

---

### Week 2 Focus: Control & History (Medium Priority)
5. **PATCH /jobs/:id** (update job configuration)
6. **POST /jobs/:id/pause** + **POST /jobs/:id/resume** (control execution)
7. **GET /jobs/:id/runs** (view execution history)

**Deliverable**: Full job management with pause/resume and execution history

---

### Week 3 Focus: Polish & Production (Low Priority)
8. **API key management endpoints** (create/list/revoke API keys)
9. **User profile endpoints** (GET /users/me, PATCH /users/me)
10. **Error handling improvements** (consistent error responses)
11. **Rate limiting** (beyond Better Auth's built-in API key limits)
12. **OpenAPI improvements** (examples, better descriptions)

**Deliverable**: Production-ready API with full auth and user management

---

## 🧪 Testing Strategy

### Integration Tests (Priority)
- [ ] POST /jobs with auth (API key + OAuth)
- [ ] GET /jobs with pagination
- [ ] GET /jobs/:id with 404 handling
- [ ] PATCH /jobs/:id with partial updates
- [ ] DELETE /jobs/:id with cascading
- [ ] Pause/resume workflow
- [ ] Auth middleware (401 responses)

### E2E Tests (Optional)
- [ ] OAuth flow (GitHub login → create job)
- [ ] API key flow (create key → use key → create job)
- [ ] Full CRUD workflow with real database

### Performance Tests (Later)
- [ ] API key auth latency (should be fast, no DB queries)
- [ ] List jobs with large datasets (pagination performance)
- [ ] Concurrent job creation (transaction isolation)

---

## 📊 Current Metrics

**Test Coverage**:
- Domain: ~95% (comprehensive unit tests)
- Adapters: ~90% (contract tests + unit tests)
- Services: ~95% (JobsManager unit tests)
- API: ~60% (route handlers exist, integration tests needed)

**Target Coverage**: 80% overall (focus on integration tests)

---

## 🚧 Known Limitations

1. **No multi-tenancy enforcement**: `tenantId` field exists but not utilized (all users share same namespace)
2. **No job ownership transfer**: Jobs bound to creator forever
3. **No job templates**: Each job created from scratch
4. **No bulk operations**: Create/update/delete one at a time
5. **No job scheduling UI**: API-only (MCP server/CLI needed for better UX)

**Decision**: Accept these limitations for MVP, address in Phase 3 if needed.

---

## 📝 Documentation Needed

- [ ] API usage guide (examples with curl/fetch)
- [ ] Authentication guide (OAuth flow + API key creation)
- [ ] Deployment guide (environment variables, migrations)
- [ ] Troubleshooting guide (common errors, debugging)
- [ ] OpenAPI spec completeness (all endpoints documented)

---

## 🎉 Success Criteria

**Phase 2.2 is complete when**:
- [ ] All CRUD endpoints implemented (POST, GET, PATCH, DELETE)
- [ ] Integration tests passing (80%+ coverage)
- [ ] OpenAPI documentation complete
- [ ] Manual testing guide documented
- [ ] Production deployment tested (Docker Compose)
- [ ] Performance baseline established (latency, throughput)

**Estimated Time**: 2-3 weeks at current pace
