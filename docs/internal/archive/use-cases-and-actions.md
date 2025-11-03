# Use Cases & User Actions - Adaptive AI Scheduler

This document identifies diverse use cases for the adaptive scheduler, maps user actions for each scenario, and defines the public-facing action API that serves both human users and AI agents.

---

## Executive Summary

**5 Core Use Cases Identified:**
1. **E-commerce Flash Sale Monitoring** (already documented in flash-sale-scenario.md)
2. **DevOps Health Monitoring & Auto-Remediation**
3. **Content Publishing & Social Media Automation**
4. **Data Pipeline & ETL Orchestration**
5. **SaaS Usage Monitoring & Billing**
6. **Web Scraping & Data Collection** (bonus 6th use case)

**Key Insight:** Users need two modes of interaction:
- **Setup Phase**: Define jobs, configure endpoints, set baselines
- **Maintenance Phase**: Monitor, adjust, pause/resume, investigate failures

**Actor Distinction:**
- **User-Facing Actions**: Direct user control + AI agent steering (via MCP/REST)
- **Background Scheduler Actions**: Autonomous execution loop (tick, claim, dispatch, update)

---

## Use Case 1: E-commerce Flash Sale Monitoring

**Already Documented**: See `docs/flash-sale-scenario.md` for full details.

**Summary**: Multi-tier monitoring (Health → Investigation → Recovery → Alert) that adapts to traffic surges, self-heals when possible, and escalates intelligently.

**User Actions During Setup:**
- Create job container ("Black Friday Flash Sale")
- Add 10 endpoints across 4 tiers (health checks, analyzers, recovery, alerts)
- Configure baseline intervals and clamps (min/max)
- Define conditional activation logic (pause investigation endpoints until needed)

**User Actions During Event:**
- Monitor run history and health metrics
- Manually trigger one-shot investigations if needed
- Pause noisy alerts if recovering
- Adjust intervals if AI is too aggressive/passive
- Clear hints to revert to baseline after event

**AI Agent Actions:**
- Tighten monitoring intervals when traffic spikes
- Schedule one-shot recovery actions (cache warm-up, scale workers)
- Activate investigation endpoints when health degrades
- Send tiered alerts with cooldown awareness

**Background Scheduler Actions:**
- Claim due endpoints every 5 seconds
- Execute HTTP requests to monitoring endpoints
- Record run status, duration, errors
- Update nextRunAt based on governor + hints
- Track failure counts for backoff

---

## Use Case 2: DevOps Health Monitoring & Auto-Remediation

**Scenario**: A SaaS platform monitors production infrastructure health and attempts automated fixes before paging engineers.

**Example Endpoints:**
- **Health Tier** (always running):
  - `check_api_latency` - Monitor P95/P99 response times (baseline: every 2 min)
  - `check_error_rate` - Track 4xx/5xx errors (baseline: every 1 min)
  - `check_database_connections` - Pool saturation check (baseline: every 5 min)
  - `check_queue_backlog` - Message queue depth (baseline: every 3 min)

- **Investigation Tier** (conditional):
  - `fetch_slow_query_logs` - Identify DB bottlenecks (paused until DB issues detected)
  - `profile_memory_usage` - Heap dump analysis (paused until latency spike)
  - `trace_distributed_requests` - APM correlation (paused until error rate high)

- **Remediation Tier** (one-shot):
  - `restart_unhealthy_pods` - Kubernetes pod restart (cooldown: 10 min)
  - `flush_cache_layer` - Clear Redis/Memcached (cooldown: 15 min)
  - `scale_up_workers` - Add capacity (cooldown: 20 min)
  - `kill_long_running_queries` - DB cleanup (cooldown: 5 min)

- **Alert Tier**:
  - `slack_devops_team` - Initial heads-up (cooldown: 10 min)
  - `pagerduty_oncall` - Critical escalation (cooldown: 1 hour)

**User Actions During Setup:**
- Create job "Production Health Monitor"
- Add health check endpoints with tight intervals
- Configure investigation endpoints as paused
- Set remediation actions with appropriate cooldowns
- Define alert thresholds and escalation rules

**User Actions During Incidents:**
- View run history to diagnose failure patterns
- Manually trigger specific investigations
- Pause aggressive remediation if it's making things worse
- Clear hints after manual fixes to prevent conflicting automation
- Reset failure counts after deploying fixes

**AI Agent Actions:**
- Tighten health checks when error rate rises
- Activate investigation endpoints when latency degrades
- Schedule remediation one-shots when root cause identified
- Escalate alerts only after remediation attempts fail
- Back off monitoring after successful recovery

**Background Scheduler Actions:**
- Execute health checks at adaptive intervals
- Track consecutive failures for exponential backoff
- Execute remediation endpoints with cooldown enforcement
- Record investigation results for AI to consume
- Update scheduling based on execution outcomes

**Why This Use Case Matters:**
- Different domain (DevOps vs E-commerce)
- Demonstrates infrastructure control (pod restarts, scaling)
- Shows conditional endpoint activation patterns
- Highlights importance of cooldowns for expensive operations

---

## Use Case 3: Content Publishing & Social Media Automation

**Scenario**: A content creator schedules blog posts, social media updates, and promotional campaigns with intelligent timing based on engagement data.

**Example Endpoints:**
- **Publishing Tier** (scheduled):
  - `publish_blog_post` - WordPress/CMS publish API (cron: "0 9 * * MON" or dynamic)
  - `tweet_announcement` - Twitter API post (one-shot at specific time)
  - `linkedin_article` - LinkedIn publish (one-shot)
  - `instagram_story` - Instagram API (one-shot, expires in 24h)

- **Engagement Monitoring Tier** (adaptive):
  - `track_blog_analytics` - Page views, time on page (baseline: every 30 min, tightens to 5 min for new posts)
  - `monitor_social_metrics` - Likes, shares, comments (baseline: every hour, tightens during campaigns)
  - `check_email_open_rates` - Newsletter engagement (baseline: hourly for first 24h, then daily)

- **Optimization Tier** (conditional):
  - `boost_high_performing_post` - Increase promotion budget (one-shot when engagement threshold hit)
  - `crosspost_viral_content` - Republish to other platforms (one-shot when shares > N)
  - `send_followup_email` - Nurture sequence (scheduled days after initial)

- **Audience Analysis Tier**:
  - `analyze_best_posting_times` - ML inference on historical data (cron: "0 0 * * SUN")
  - `segment_audience_behavior` - Clustering analysis (weekly)

**User Actions During Setup:**
- Create jobs for each content campaign
- Schedule initial publish times (cron or one-shot)
- Configure monitoring intervals (tight initially, relax later)
- Set engagement thresholds for automatic promotion

**User Actions During Campaign:**
- Monitor engagement metrics in real-time
- Manually schedule one-shot boosts
- Pause publishing if content needs revision
- Adjust monitoring frequency based on results
- Clear old campaign jobs after completion

**AI Agent Actions:**
- Tighten analytics monitoring for fresh content
- Relax monitoring after initial engagement window passes
- Schedule promotional boosts when thresholds met
- Suggest optimal posting times based on historical data
- Pause low-performing campaign sequences

**Background Scheduler Actions:**
- Execute publishing endpoints at scheduled times
- Track analytics endpoints at adaptive intervals
- Process engagement data for AI optimization
- Enforce one-shot semantics for campaign actions
- Handle cron-based weekly analysis jobs

**Why This Use Case Matters:**
- Time-sensitive content (publish at exact moment)
- Long-running campaigns (weeks/months)
- Mix of cron (weekly analysis) and intervals (monitoring)
- Demonstrates business/marketing domain (not just technical monitoring)
- Shows value of "publish and monitor" pattern

---

## Use Case 4: Data Pipeline & ETL Orchestration

**Scenario**: A data engineering team orchestrates complex ETL workflows with dependencies, retries, and adaptive scheduling based on data volume.

**Example Endpoints:**
- **Extraction Tier**:
  - `fetch_salesforce_data` - Pull CRM records (cron: "0 2 * * *" daily at 2 AM)
  - `fetch_stripe_transactions` - Payment data (cron: "*/15 * * * *" every 15 min)
  - `fetch_analytics_events` - User behavior logs (cron: "*/5 * * * *" every 5 min)
  - `fetch_product_inventory` - Stock levels (interval: 10 min, tightens if high order volume)

- **Transformation Tier** (depends on extraction):
  - `clean_customer_records` - Deduplication, normalization (triggered after Salesforce fetch)
  - `enrich_transactions` - Join with customer data (triggered after Stripe fetch)
  - `aggregate_events` - Sessionize, rollup metrics (triggered after analytics fetch)

- **Loading Tier** (depends on transformation):
  - `load_to_warehouse` - Snowflake/BigQuery insert (triggered after transformations complete)
  - `update_reporting_cache` - Materialized view refresh (triggered after warehouse load)
  - `sync_to_elasticsearch` - Search index update (triggered after cache update)

- **Monitoring Tier**:
  - `check_pipeline_lag` - Monitor freshness (baseline: every 2 min, tightens if lag detected)
  - `validate_data_quality` - Row counts, null checks (after each load)
  - `alert_on_failures` - Slack/PagerDuty (one-shot when consecutive failures)

**User Actions During Setup:**
- Create jobs for each data source
- Configure extraction schedules (cron for batch, intervals for streaming)
- Define transformation dependencies (though AI orchestrates via natural language)
- Set quality validation thresholds
- Configure failure alerting rules

**User Actions During Operations:**
- Monitor pipeline lag and data freshness
- Manually trigger one-shot re-runs after fixing upstream issues
- Pause problematic transformations during debugging
- Adjust extraction frequencies based on data volume changes
- Clear hints after backfill operations to resume normal cadence

**AI Agent Actions:**
- Tighten extraction intervals during high-volume periods
- Schedule transformation one-shots after successful extractions
- Delay dependent loads if upstream data quality issues detected
- Escalate alerts after repeated transformation failures
- Back off extraction if source API rate limits hit

**Background Scheduler Actions:**
- Execute extractions at scheduled times
- Track extraction success/failure for dependency coordination
- Execute transformation/loading endpoints in logical order
- Monitor data quality checks
- Enforce failure count backoff for unreliable sources

**Why This Use Case Matters:**
- Complex dependencies (extraction → transformation → loading)
- Mix of batch (cron) and streaming (interval) patterns
- Data quality and validation concerns
- Demonstrates technical operations domain
- Shows value of adaptive scheduling for variable data volumes

---

## Use Case 5: SaaS Usage Monitoring & Billing

**Scenario**: A SaaS provider monitors customer usage, enforces quotas, generates invoices, and sends billing notifications.

**Example Endpoints:**
- **Usage Tracking Tier**:
  - `aggregate_api_calls` - Count requests per customer (cron: "0 * * * *" hourly)
  - `measure_storage_usage` - Calculate GB stored (cron: "0 0 * * *" daily)
  - `track_feature_usage` - Premium feature metrics (cron: "0 */6 * * *" every 6 hours)
  - `monitor_bandwidth` - Data transfer metrics (interval: 15 min)

- **Quota Enforcement Tier**:
  - `check_overage_limits` - Identify customers exceeding plan (cron: "*/10 * * * *" every 10 min)
  - `throttle_api_access` - Apply rate limits (one-shot when quota exceeded)
  - `send_quota_warning` - Email notification (one-shot at 80%, 90%, 100%)

- **Billing Tier**:
  - `generate_invoices` - Create monthly bills (cron: "0 0 1 * *" first of month)
  - `process_payments` - Charge credit cards (one-shot 3 days after invoice)
  - `send_payment_reminders` - Dunning emails (one-shot 7, 14, 21 days overdue)
  - `suspend_delinquent_accounts` - Disable access (one-shot 30 days overdue)

- **Reporting Tier**:
  - `export_usage_reports` - Customer-facing dashboards (cron: "0 2 * * *" daily)
  - `calculate_mrr_metrics` - Revenue analytics (cron: "0 3 1 * *" monthly)
  - `generate_executive_dashboard` - Leadership metrics (cron: "0 8 * * MON" Mondays)

**User Actions During Setup:**
- Create job "SaaS Billing & Usage"
- Configure usage aggregation schedules (hourly/daily/monthly)
- Set quota thresholds and warning levels
- Define billing cycle cron expressions
- Configure dunning email sequences

**User Actions During Operations:**
- Monitor usage aggregation for accuracy
- Manually trigger invoice generation for custom billing
- Pause quota enforcement during customer support issues
- Adjust warning thresholds based on customer feedback
- Clear hints after fixing usage calculation bugs

**AI Agent Actions:**
- Tighten usage monitoring when approaching billing cycle
- Schedule quota warning emails at appropriate thresholds
- Coordinate dunning sequence with payment status
- Adjust reporting frequency for high-value customers
- Pause enforcement during account disputes

**Background Scheduler Actions:**
- Execute usage aggregation at scheduled intervals
- Track quota violations for enforcement
- Generate invoices at monthly boundaries
- Send payment reminders on schedule
- Update metrics for reporting dashboards

**Why This Use Case Matters:**
- Business-critical (revenue and billing)
- Time-sensitive (monthly billing cycles)
- Complex sequencing (invoice → payment → reminders → suspension)
- Demonstrates SaaS operations domain
- Shows value of cron for calendar-based schedules

---

## Use Case 6: Web Scraping & Data Collection (Bonus)

**Scenario**: A market research firm scrapes competitor websites, job boards, and pricing pages to track market trends.

**Example Endpoints:**
- **Scraping Tier**:
  - `scrape_competitor_prices` - Product pricing pages (interval: 4 hours, tightens to 30 min during sales)
  - `scrape_job_postings` - LinkedIn/Indeed listings (cron: "0 */3 * * *" every 3 hours)
  - `scrape_news_articles` - Industry news sites (interval: 1 hour)
  - `scrape_social_mentions` - Twitter/Reddit brand mentions (interval: 15 min)

- **Validation Tier**:
  - `detect_scraper_blocks` - Check for rate limiting/CAPTCHAs (after each scrape)
  - `validate_data_extraction` - Ensure selectors still work (after each scrape)
  - `check_proxy_health` - Rotating proxy status (interval: 5 min)

- **Processing Tier**:
  - `parse_extracted_data` - Clean HTML, extract structured data (triggered after scrape)
  - `detect_price_changes` - Diff with previous versions (triggered after parse)
  - `update_search_index` - Elasticsearch refresh (triggered after processing)

- **Alerting Tier**:
  - `alert_price_drop` - Notify when competitor prices drop (one-shot when detected)
  - `alert_scraper_failure` - Send alert after consecutive failures (one-shot with cooldown)
  - `alert_new_competitor` - New brand detected (one-shot)

**User Actions During Setup:**
- Create jobs for each target website
- Configure scraping intervals and clamps
- Set up proxy rotation and user agents
- Define data validation rules
- Configure alert thresholds

**User Actions During Operations:**
- Monitor scraper health and success rates
- Pause scrapers when sites update (breaking selectors)
- Manually trigger one-shot scrapes for urgent research
- Adjust intervals when sites implement rate limiting
- Clear hints after fixing broken selectors

**AI Agent Actions:**
- Tighten scraping frequency during competitor sales
- Back off when rate limiting detected
- Schedule validation checks after site structure changes
- Alert on pattern anomalies (e.g., all products suddenly $0)
- Coordinate proxy rotation with failure patterns

**Background Scheduler Actions:**
- Execute scraping endpoints at scheduled intervals
- Track success/failure for adaptive backoff
- Validate data quality after extraction
- Process and index scraped data
- Send alerts for significant changes

**Why This Use Case Matters:**
- Different technical domain (web scraping, not APIs)
- Demonstrates adaptive backoff for rate limiting
- Shows importance of validation (sites change frequently)
- Real-world constraint handling (proxies, CAPTCHAs)
- Highlights competitive intelligence use case

---

## Action Categories: User-Facing vs Background Scheduler

### Background Scheduler Actions (Autonomous, Not User-Facing)

These actions are performed by the scheduler worker and should **NOT** be exposed to users or AI agents. They are internal implementation details.

1. **Claim Due Endpoints** (`claimDueEndpoints`)
   - Lease endpoints scheduled in next N seconds
   - Uses `FOR UPDATE SKIP LOCKED` for distributed coordination
   - Returns list of endpoint IDs to process

2. **Execute Endpoint** (`dispatcher.execute`)
   - Make HTTP request configured in endpoint
   - Measure duration with `performance.now()`
   - Categorize result (success/failure/timeout)
   - Return execution result

3. **Record Run** (`runs.create`, `runs.finish`)
   - Create run record with status "running"
   - Update run with final status, duration, error message
   - Track attempt number from failure count

4. **Calculate Next Run** (`governor.planNextRun`)
   - Consider baseline (cron/interval)
   - Apply AI hints if not expired
   - Respect min/max clamps
   - Check pause status
   - Return `{ nextRunAt, source }`

5. **Update After Run** (`jobs.updateAfterRun`)
   - Set lastRunAt, nextRunAt
   - Increment or reset failure count
   - Clear expired hints
   - Record last execution status

6. **Tick Loop Orchestration**
   - Poll every N seconds
   - Batch claim and process
   - Handle errors without crashing
   - Log structured execution metrics

**Why These Are NOT User-Facing:**
- They represent internal scheduling mechanics
- Users don't need to trigger execution (scheduler handles it)
- Exposing these would allow breaking scheduler invariants
- These operate on the hot path (performance critical)

### User-Facing Actions (Public API Surface)

These actions should be exposed via REST API and MCP server for both human users and AI agents.

#### Category 1: Job Lifecycle Management

1. **Create Job** (`createJob`)
   - **Purpose**: Create container for related endpoints
   - **Params**: `{ userId, name, description? }`
   - **Returns**: `{ jobId, createdAt }`
   - **Use Case**: Every scenario starts with this
   - **Actor**: User (initial setup) or AI agent (automated provisioning)

2. **Get Job** (`getJob`)
   - **Purpose**: Fetch job details and metadata
   - **Params**: `{ jobId, userId }`
   - **Returns**: `{ id, name, description, status, createdAt, updatedAt, endpointCount, failureCount }`
   - **Use Case**: Monitoring job health, debugging
   - **Actor**: User (dashboard) or AI agent (health check)

3. **List Jobs** (`listJobs`)
   - **Purpose**: Enumerate user's jobs
   - **Params**: `{ userId, status?: "active"|"archived" }`
   - **Returns**: `{ jobs: Array<{ jobId, name, status, endpointCount, lastRunAt }> }`
   - **Use Case**: Dashboard, job selection
   - **Actor**: User (UI) or AI agent (discovery)

4. **Update Job** (`updateJob`)
   - **Purpose**: Modify job metadata
   - **Params**: `{ jobId, userId, name?, description? }`
   - **Returns**: `{ updatedAt }`
   - **Use Case**: Rename after purpose changes, update documentation
   - **Actor**: User (manual edit) or AI agent (automated labeling)

5. **Archive Job** (`archiveJob`)
   - **Purpose**: Soft-delete job (preserves history)
   - **Params**: `{ jobId, userId }`
   - **Returns**: `{ archivedAt }`
   - **Use Case**: Campaign ended, seasonal job finished
   - **Actor**: User (cleanup) or AI agent (lifecycle automation)

#### Category 2: Endpoint Orchestration

6. **Add Endpoint to Job** (`addEndpointToJob`)
   - **Purpose**: Attach executable endpoint to job
   - **Params**: `{ jobId, userId, name, url, method?, headers?, body?, baseline?: { cron?, intervalMs? }, clamp?: { minIntervalMs?, maxIntervalMs? } }`
   - **Returns**: `{ endpointId, nextRunAt }`
   - **Use Case**: Every scenario needs this for each endpoint
   - **Actor**: User (initial config) or AI agent (dynamic endpoint generation)

7. **Update Endpoint Config** (`updateEndpointConfig`)
   - **Purpose**: Modify endpoint execution details
   - **Params**: `{ endpointId, userId, url?, method?, headers?, body?, clamp?, timeoutMs? }`
   - **Returns**: `{ updatedAt }`
   - **Use Case**: API endpoint changed, auth token rotated, timeout adjustment
   - **Actor**: User (manual fix) or AI agent (credential rotation)

8. **Delete Endpoint** (`deleteEndpoint`)
   - **Purpose**: Remove endpoint from job
   - **Params**: `{ endpointId, userId }`
   - **Returns**: `{ deletedAt }`
   - **Use Case**: Remove deprecated health check, clean up test endpoints
   - **Actor**: User (manual removal) or AI agent (automated cleanup)

9. **List Job Endpoints** (`listJobEndpoints`)
   - **Purpose**: Enumerate endpoints in job
   - **Params**: `{ jobId, userId }`
   - **Returns**: `{ endpoints: Array<{ endpointId, name, nextRunAt, lastRunAt, failureCount, pausedUntil? }> }`
   - **Use Case**: Monitoring job composition, debugging
   - **Actor**: User (dashboard) or AI agent (health assessment)

#### Category 3: Adaptive Scheduling Control

10. **Apply Interval Hint** (`applyIntervalHint`)
    - **Purpose**: Adjust cadence dynamically
    - **Params**: `{ endpointId, userId, intervalMs, ttlMinutes?, reason? }`
    - **Returns**: `{ hintExpiresAt, nextRunAt }`
    - **Use Case**: Tighten monitoring during traffic surge, relax after recovery
    - **Actor**: AI agent (primary) or user (manual override)
    - **Example**: "Run every 30s for next 20 minutes because traffic spiked"

11. **Schedule One-Shot Run** (`scheduleOneShotRun`)
    - **Purpose**: Schedule single execution at specific time
    - **Params**: `{ endpointId, userId, runAt: string (ISO), ttlMinutes?, reason? }`
    - **Returns**: `{ scheduledFor }`
    - **Use Case**: Trigger investigation, schedule recovery action, send alert
    - **Actor**: AI agent (primary) or user (manual trigger)
    - **Example**: "Run cache warm-up in 30 seconds because pages are slow"

12. **Pause or Resume Endpoint** (`pauseOrResumeEndpoint`)
    - **Purpose**: Temporarily disable or re-enable execution
    - **Params**: `{ endpointId, userId, pauseUntil?: string|null, reason? }`
    - **Returns**: `{ pausedUntil? }`
    - **Use Case**: Disable investigation until issues detected, pause noisy alerts
    - **Actor**: AI agent (conditional activation) or user (manual control)
    - **Example**: "Pause slow query analyzer until database issues detected"

13. **Clear Adaptive Hints** (`clearAdaptiveHints`)
    - **Purpose**: Revert to baseline scheduling
    - **Params**: `{ endpointId, userId, reason? }`
    - **Returns**: `{ clearedAt, nextRunAt }`
    - **Use Case**: After event ends, return to normal cadence
    - **Actor**: User (manual reset) or AI agent (automated recovery)
    - **Example**: "Clear all hints after flash sale ends"

14. **Reset Failure Count** (`resetFailureCount`)
    - **Purpose**: Manual recovery after fixing issues
    - **Params**: `{ endpointId, userId, reason? }`
    - **Returns**: `{ failureCount }`
    - **Use Case**: After deploying fix, reset backoff
    - **Actor**: User (manual intervention) or AI agent (post-deployment)
    - **Example**: "Reset failures after deploying selector fix"

#### Category 4: Execution Visibility & Insights

15. **List Runs** (`listRuns`)
    - **Purpose**: Fetch execution history
    - **Params**: `{ userId, jobId?, endpointId?, status?: "success"|"failure", limit?, offset? }`
    - **Returns**: `{ runs: Array<{ runId, endpointId, startedAt, status, durationMs, source }>, total }`
    - **Use Case**: Debugging failures, monitoring execution patterns
    - **Actor**: User (troubleshooting) or AI agent (pattern analysis)

16. **Get Run Details** (`getRunDetails`)
    - **Purpose**: Detailed execution information
    - **Params**: `{ runId, userId }`
    - **Returns**: `{ id, endpointId, status, startedAt, finishedAt, durationMs, errorMessage?, source, attempt }`
    - **Use Case**: Investigate specific failure, understand timing
    - **Actor**: User (deep debugging) or AI agent (root cause analysis)

17. **Summarize Endpoint Health** (`summarizeEndpointHealth`)
    - **Purpose**: Quick health snapshot
    - **Params**: `{ endpointId, userId, windowHours?: number }`
    - **Returns**: `{ successCount, failureCount, avgDurationMs, lastRun?: { status, at }, failureStreak }`
    - **Use Case**: Dashboard widgets, health checks
    - **Actor**: User (monitoring) or AI agent (health assessment)

---

## Public-Facing Actions API (Confident List)

### Design Principles

1. **Sweet Spot Abstraction**: Actions are high-level enough to cover all use cases but specific enough to be clear and actionable.

2. **MCP/Tool Friendly**: Each action has clear parameters, return values, and descriptions suitable for external AI agents.

3. **Authorization**: All actions require `userId` for tenant isolation and audit trails.

4. **Idempotency**: Where possible, actions are idempotent (e.g., pause already-paused endpoint is no-op).

5. **Audit Metadata**: Each action accepts optional `reason` parameter for observability.

### The 17 Public Actions (Grouped)

#### Jobs Lifecycle (5 actions)
```typescript
createJob(userId, name, description?)
getJob(jobId, userId)
listJobs(userId, status?)
updateJob(jobId, userId, name?, description?)
archiveJob(jobId, userId)
```

#### Endpoint Orchestration (4 actions)
```typescript
addEndpointToJob(jobId, userId, name, url, method?, headers?, body?, baseline?, clamp?)
updateEndpointConfig(endpointId, userId, url?, method?, headers?, body?, clamp?, timeoutMs?)
deleteEndpoint(endpointId, userId)
listJobEndpoints(jobId, userId)
```

#### Adaptive Scheduling Control (5 actions)
```typescript
applyIntervalHint(endpointId, userId, intervalMs, ttlMinutes?, reason?)
scheduleOneShotRun(endpointId, userId, runAt, ttlMinutes?, reason?)
pauseOrResumeEndpoint(endpointId, userId, pauseUntil?, reason?)
clearAdaptiveHints(endpointId, userId, reason?)
resetFailureCount(endpointId, userId, reason?)
```

#### Execution Visibility (3 actions)
```typescript
listRuns(userId, jobId?, endpointId?, status?, limit?, offset?)
getRunDetails(runId, userId)
summarizeEndpointHealth(endpointId, userId, windowHours?)
```

### Total: 17 Actions

This API surface supports:
- ✅ All 6 use cases identified
- ✅ Both setup and maintenance phases
- ✅ Human users (via REST API)
- ✅ AI agents (via MCP server)
- ✅ Manual control and autonomous adaptation
- ✅ Observability and debugging

### What's Intentionally Excluded

1. **No Direct Execution Trigger**: Users don't manually execute endpoints. The scheduler handles this based on timing. Users can schedule one-shots if needed.

2. **No Dependency Graph Management**: AI agents orchestrate execution via natural language understanding, not explicit dependency fields.

3. **No Quota Management**: Handled separately by QuotaGuard service (not user-facing).

4. **No Cron Expression Validation**: Handled at creation time (returns error if invalid).

5. **No Batch Operations**: Users operate on single endpoints/jobs (MCP agents can batch via multiple calls).

---

## Implementation Roadmap

### Phase 1: Core CRUD (API Phase 2)
- ✅ POST /jobs (create job + endpoint) - COMPLETE
- [ ] GET /jobs/:id (getJob)
- [ ] GET /jobs (listJobs)
- [ ] PATCH /jobs/:id (updateJob)
- [ ] DELETE /jobs/:id (archiveJob)
- [ ] GET /jobs/:id/endpoints (listJobEndpoints)
- [ ] PATCH /jobs/:jobId/endpoints/:id (updateEndpointConfig)
- [ ] DELETE /jobs/:jobId/endpoints/:id (deleteEndpoint)

### Phase 2: Adaptive Control (AI Steering Surface)
- [ ] POST /jobs/:jobId/endpoints/:id/hints/interval (applyIntervalHint)
- [ ] POST /jobs/:jobId/endpoints/:id/hints/one-shot (scheduleOneShotRun)
- [ ] POST /jobs/:jobId/endpoints/:id/pause (pauseOrResumeEndpoint)
- [ ] DELETE /jobs/:jobId/endpoints/:id/hints (clearAdaptiveHints)
- [ ] POST /jobs/:jobId/endpoints/:id/reset-failures (resetFailureCount)

### Phase 3: Visibility (Observability Surface)
- [ ] GET /runs (listRuns)
- [ ] GET /runs/:id (getRunDetails)
- [ ] GET /jobs/:jobId/endpoints/:id/health (summarizeEndpointHealth)

### Phase 4: MCP Server (AI Agent Access)
- [ ] Implement MCP server wrapping all 17 actions
- [ ] Define tool schemas with descriptions and examples
- [ ] Add MCP-specific error handling and streaming
- [ ] Integrate with QuotaGuard for AI usage limits
- [ ] Document Claude Desktop integration

---

## Conclusion

**Use Cases Identified**: 6 diverse scenarios spanning e-commerce, DevOps, content, data pipelines, billing, and web scraping.

**Actions Mapped**: Clear distinction between user-facing (17 public actions) and background scheduler (6 internal actions).

**API Surface Defined**: 17 public-facing actions organized into 4 categories, suitable for both REST and MCP.

**Coverage**: All use cases can be implemented using these 17 actions, confirming the abstraction level is correct.

**Next Steps**: Implement remaining CRUD endpoints (Phase 1), then adaptive control surface (Phase 2), then MCP server (Phase 4).
