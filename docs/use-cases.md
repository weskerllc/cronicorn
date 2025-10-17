# Use Cases & Examples

Cronicorn adapts scheduling based on real-time conditions. Here are real-world scenarios demonstrating adaptive intervals, conditional activation, and intelligent coordination.

## E-Commerce Flash Sale Monitoring

**Scenario**: Black Friday sale launches, traffic surges 5×, pages slow down, database struggles. The scheduler adapts monitoring and attempts recovery before paging engineers.

### The Setup (10 Endpoints Across 4 Tiers)

#### Tier 1: Health Checks (Always Running)
- **traffic_monitor** - Tracks visitors/min and page load times
  - Baseline: Every 5 minutes
  - Surge: Tightens to 30s when traffic spikes
- **order_processor_health** - Monitors checkout performance
  - Baseline: Every 3 minutes
  - Strain: Tightens to 45s when orders slow
- **inventory_sync_check** - Ensures stock accuracy
  - Baseline: Every 10 minutes
  - Lag: Tightens to 2min if sync falls behind

#### Tier 2: Investigation (Conditional)
- **slow_page_analyzer** - Identifies lagging pages
  - Default: Paused
  - Activates: Every 2min when traffic high AND pages slow
- **database_query_trace** - Finds slow DB operations
  - Default: Paused
  - Fires: One-shot investigation when orders struggle AND pages slow

#### Tier 3: Recovery (Automatic Fixes)
- **cache_warm_up** - Pre-loads popular products
  - Trigger: One-shot when page analyzer finds slow products
  - Effect: 60-80% page speed improvement
  - Cooldown: 15 minutes
- **scale_checkout_workers** - Adds processing capacity
  - Trigger: One-shot when order backlog forms OR DB overloaded
  - Effect: Increases throughput
  - Cooldown: 20 minutes

#### Tier 4: Alerts (Smart Escalation)
- **slack_operations** - Quick heads-up to tech team
  - Trigger: One-shot on first surge detection
  - Cooldown: 10 minutes
- **slack_customer_support** - Alerts about user-facing issues
  - Trigger: One-shot if problems persist 15+ minutes
  - Cooldown: 20 minutes
- **emergency_oncall_page** - Escalates if auto-recovery fails
  - Trigger: One-shot if critical for 30+ minutes
  - Cooldown: 1 hour

### How It Works

**Adaptive Intervals**: AI tightens monitoring from 5min→30s when conditions deteriorate, then relaxes back to baseline during recovery.

**Conditional Activation**: Investigation tier stays paused until health checks detect issues, avoiding expensive analysis during normal operation.

**Coordinated Recovery**: Cache warm-up only fires if page analyzer identifies the problem. Scaling only happens if investigation confirms capacity issues.

**Smart Alerts**: Escalation ladder (ops → support → oncall) with appropriate cooldowns prevents notification spam.

### Expected Behavior (40 Minutes)

- **Minutes 0-5** (Baseline): All health checks running normally, investigation/recovery/alerts paused
- **Minutes 5-10** (Surge): Traffic monitor tightens to 30s, operations team alerted
- **Minutes 10-15** (Strain): Order/inventory checks tighten, investigation activates, page analyzer identifies slow products
- **Minutes 15-25** (Critical): Cache warm-up fires, scaling triggered, customer support alerted, DB traces run
- **Minutes 25-40** (Recovery): Adaptive intervals relax back to baseline, investigation tier pauses again

**Total runs**: ~467 across all endpoints over 40 simulated minutes.

## DevOps Health Monitoring

**Scenario**: Production infrastructure monitoring with auto-remediation.

### Setup
- **Health checks**: API latency (2min), error rate (1min), DB connections (5min), queue backlog (3min)
- **Investigation**: Slow query logs, memory profiling, distributed tracing (all paused until triggered)
- **Remediation**: Restart pods (10min cooldown), flush cache (15min), scale workers (20min), kill slow queries (5min)
- **Alerts**: Slack DevOps (10min cooldown) → PagerDuty oncall (1hr cooldown)

### Adaptive Behavior
- Health checks tighten when P95 latency crosses threshold
- Investigation activates when error rate spikes
- Remediation attempts before paging humans
- Escalates only if auto-recovery fails

## Content Publishing & Social Media

**Scenario**: Automated content scheduling with engagement optimization.

### Use Cases
- **Time-sensitive publishing**: Blog posts, social media updates at optimal times
- **Engagement tracking**: Monitor likes/shares, adjust posting frequency
- **Promotional optimization**: A/B test post timing, amplify high performers

### Adaptive Behavior
- Schedule posts for peak engagement windows (AI learns from historical data)
- Increase monitoring frequency for viral content
- Pause promotional campaigns if engagement drops

## Data Pipeline & ETL Orchestration

**Scenario**: Extract → Transform → Load with dependency coordination.

### Setup
- **Extraction**: Fetch from APIs, scrape websites, poll databases
- **Transformation**: Parse, clean, aggregate, enrich
- **Loading**: Write to warehouse, update caches, trigger downstream

### Coordination Patterns
- Transform endpoint paused until extraction completes
- Loading activated when both extract and transform succeed
- Adaptive intervals based on data volume (more frequent when backlog detected)

## SaaS Usage Monitoring & Billing

**Scenario**: Track customer usage, enforce quotas, run billing cycles.

### Use Cases
- **Quota enforcement**: Monitor API usage, pause endpoints when limits exceeded
- **Billing cycles**: Monthly invoices, payment processing, dunning sequences
- **Usage alerts**: Warn customers approaching limits

### Adaptive Behavior
- Increase monitoring frequency as usage approaches quota
- Pause monitoring after quota exceeded (save resources)
- Accelerate dunning reminders based on payment failure patterns

## Web Scraping & Data Collection

**Scenario**: Collect market data while respecting rate limits.

### Challenges
- Rate limits vary by site and time of day
- Validation errors require adaptive retry logic
- Proxy rotation to avoid IP bans

### Adaptive Behavior
- Slow down scraping when rate limit warnings detected
- Pause endpoints if validation consistently fails
- Adjust intervals based on proxy pool health

## Common Patterns Across Use Cases

### 1. Adaptive Intervals
```javascript
propose_interval({ 
  intervalMs: 30000,  // Tighten to 30s
  ttlMinutes: 15,     // Expires after 15min
  reason: "High traffic detected"
})
```

### 2. Conditional Activation
```javascript
// Default: paused
pause_until({ 
  untilIso: null,  // Resume now
  reason: "Threshold crossed, activating investigation"
})
```

### 3. One-Shot Actions
```javascript
propose_next_time({
  nextRunInMs: 0,     // Fire immediately
  ttlMinutes: 1,      // Hint expires quickly
  reason: "Cache warm-up triggered"
})
```

### 4. Coordinated Dependencies
- Health endpoint detects issue
- AI activates investigation endpoint
- Investigation identifies root cause
- Recovery action fires one-shot
- Alert only if recovery fails

## Implementation Guide

### Creating Jobs

```bash
curl -X POST https://api.example.com/api/v1/jobs \
  -H "x-api-key: cron_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-Commerce Health Monitor",
    "endpoints": [
      {
        "name": "Traffic Monitor",
        "url": "https://analytics.example.com/traffic",
        "method": "GET",
        "baselineIntervalMs": 300000,
        "minIntervalMs": 30000,
        "maxIntervalMs": 900000
      }
    ]
  }'
```

### AI Hints (Adaptive Control)

The AI planner writes hints based on patterns:

```typescript
// Tighten monitoring during surge
await jobs.writeAIHint(endpointId, {
  intervalMs: 30000,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  reason: "Traffic surge detected"
});

// Conditional activation
await jobs.setPausedUntil(investigationEndpointId, null);

// One-shot recovery action
await jobs.writeAIHint(recoveryEndpointId, {
  nextRunAt: new Date(),
  expiresAt: new Date(Date.now() + 60 * 1000),
  reason: "Cache warm-up triggered"
});
```

## Related Documentation

- [Architecture Guide](./architecture.md) - System design
- [Quickstart](./quickstart.md) - Get running locally
- [Authentication](./authentication.md) - API key setup
- [ADR-0018](../.adr/0018-decoupled-ai-worker-architecture.md) - AI worker design

---

**Want to see these patterns in action?** Check the flash sale simulation in `packages/worker-scheduler/src/sim/`.
