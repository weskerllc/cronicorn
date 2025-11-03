# Use Cases & Actions - Quick Reference

> **Full Documentation**: See `docs/use-cases-and-actions.md` for detailed scenarios, examples, and implementation guidance.

---

## 6 Diverse Use Cases Identified

| # | Use Case | Domain | Key Patterns |
|---|----------|--------|--------------|
| 1 | **E-commerce Flash Sale Monitoring** | Retail | Multi-tier coordination, adaptive intervals, conditional activation |
| 2 | **DevOps Health Monitoring & Auto-Remediation** | Infrastructure | Investigation → Remediation → Escalation, cooldowns |
| 3 | **Content Publishing & Social Media Automation** | Marketing | Time-sensitive publishing, engagement tracking, promotional optimization |
| 4 | **Data Pipeline & ETL Orchestration** | Data Engineering | Extraction → Transformation → Loading, batch + streaming mix |
| 5 | **SaaS Usage Monitoring & Billing** | Business Operations | Calendar-based cycles, quota enforcement, dunning sequences |
| 6 | **Web Scraping & Data Collection** | Market Research | Rate limiting adaptation, validation, proxy rotation |

**Coverage**: Spans technical (DevOps, data), business (billing, marketing), and competitive intelligence domains. Demonstrates scheduler versatility across industries.

---

## 17 Public-Facing Actions (MCP/REST API)

### Jobs Lifecycle (5 actions)

| Action | Purpose | Primary Actor |
|--------|---------|---------------|
| `createJob` | Create container for related endpoints | User (setup) |
| `getJob` | Fetch job details and metadata | User/AI (monitoring) |
| `listJobs` | Enumerate user's jobs | User/AI (discovery) |
| `updateJob` | Modify job metadata | User (maintenance) |
| `archiveJob` | Soft-delete job (preserves history) | User/AI (cleanup) |

### Endpoint Orchestration (4 actions)

| Action | Purpose | Primary Actor |
|--------|---------|---------------|
| `addEndpointToJob` | Attach executable endpoint to job | User (setup) |
| `updateEndpointConfig` | Modify endpoint execution details | User/AI (config) |
| `deleteEndpoint` | Remove endpoint from job | User/AI (cleanup) |
| `listJobEndpoints` | Enumerate endpoints in job | User/AI (monitoring) |

### Adaptive Scheduling Control (5 actions)

| Action | Purpose | Primary Actor |
|--------|---------|---------------|
| `applyIntervalHint` | Adjust cadence dynamically | AI (primary), User (override) |
| `scheduleOneShotRun` | Schedule single execution at specific time | AI (primary), User (trigger) |
| `pauseOrResumeEndpoint` | Temporarily disable or re-enable execution | AI/User (control) |
| `clearAdaptiveHints` | Revert to baseline scheduling | User/AI (reset) |
| `resetFailureCount` | Manual recovery after fixing issues | User (intervention) |

### Execution Visibility & Insights (3 actions)

| Action | Purpose | Primary Actor |
|--------|---------|---------------|
| `listRuns` | Fetch execution history | User/AI (analysis) |
| `getRunDetails` | Detailed execution information | User (debugging) |
| `summarizeEndpointHealth` | Quick health snapshot | User/AI (monitoring) |

---

## Background Scheduler Actions (6 internal, NOT user-facing)

| Action | Purpose | Why NOT Public |
|--------|---------|----------------|
| `claimDueEndpoints` | Lease endpoints for processing | Internal coordination (distributed workers) |
| `dispatcher.execute` | Execute HTTP request | Autonomous execution (no user control needed) |
| `runs.create/finish` | Record run lifecycle | Internal bookkeeping |
| `governor.planNextRun` | Calculate next execution time | Internal scheduling logic |
| `jobs.updateAfterRun` | Update state after execution | Internal state management |
| Tick loop | Poll and process scheduled endpoints | Worker orchestration |

**Why These Are Internal**: Users/agents control *when* things run via hints and pauses, but don't trigger execution directly. The scheduler autonomously handles the execution loop.

---

## Action Distribution by Actor

### User (Human)
- **Setup**: Create jobs, add endpoints, configure baselines
- **Monitoring**: List jobs/endpoints, view run history, check health
- **Maintenance**: Update configs, pause/resume, reset failures
- **Debugging**: Get run details, investigate failures

### AI Agent
- **Adaptive Control**: Apply hints (interval, one-shot), pause/resume
- **Monitoring**: List runs, summarize health, discover jobs
- **Optimization**: Adjust cadences based on signals, coordinate dependencies
- **Lifecycle**: Archive completed jobs, clean up test endpoints

### Background Scheduler
- **Execution**: Claim due endpoints, dispatch HTTP requests
- **State Management**: Record runs, update nextRunAt, track failures
- **Coordination**: Handle distributed worker leases, prevent double execution

---

## Implementation Roadmap Alignment

### Phase 1: Core CRUD (API Phase 2) - In Progress
- ✅ POST /jobs (createJob + addEndpointToJob) - COMPLETE
- ⏭️ GET /jobs/:id (getJob)
- ⏭️ GET /jobs (listJobs)
- ⏭️ PATCH /jobs/:id (updateJob)
- ⏭️ DELETE /jobs/:id (archiveJob)
- ⏭️ Endpoint CRUD (update, delete, list)

### Phase 2: Adaptive Control - Next
- ⏭️ POST /endpoints/:id/hints/interval (applyIntervalHint)
- ⏭️ POST /endpoints/:id/hints/one-shot (scheduleOneShotRun)
- ⏭️ POST /endpoints/:id/pause (pauseOrResumeEndpoint)
- ⏭️ DELETE /endpoints/:id/hints (clearAdaptiveHints)
- ⏭️ POST /endpoints/:id/reset-failures (resetFailureCount)

### Phase 3: Visibility - After Phase 2
- ⏭️ GET /runs (listRuns)
- ⏭️ GET /runs/:id (getRunDetails)
- ⏭️ GET /endpoints/:id/health (summarizeEndpointHealth)

### Phase 4: MCP Server - Final
- ⏭️ Wrap all 17 actions with MCP tool schemas
- ⏭️ Integrate with Claude Desktop
- ⏭️ Add QuotaGuard for AI usage limits

---

## Design Principles Validated

✅ **Sweet Spot Abstraction**: 17 actions cover all 6 use cases without being too granular or too broad

✅ **Clear Actor Boundaries**: User-facing (17) vs internal (6) distinction prevents API surface bloat

✅ **MCP/Tool Friendly**: Each action has clear params, returns, and purpose suitable for AI agent schemas

✅ **Authorization Built-In**: All actions require `userId` for tenant isolation

✅ **Audit Trail Ready**: Adaptive control actions accept `reason` parameter for observability

✅ **Idempotent Where Possible**: Pause already-paused endpoint is no-op, etc.

---

## Next Steps

1. ✅ Use cases identified and documented
2. ✅ Actions categorized (user-facing vs internal)
3. ✅ Public API surface defined (17 actions)
4. ⏭️ Implement remaining CRUD endpoints
5. ⏭️ Implement adaptive control surface
6. ⏭️ Implement visibility surface
7. ⏭️ Build MCP server wrapping all actions

---

**Questions?** See `docs/use-cases-and-actions.md` for:
- Detailed use case scenarios with examples
- User action mappings for setup and maintenance
- AI agent action patterns per use case
- Full parameter/return schemas for all actions
- Implementation guidance and best practices
