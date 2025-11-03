# Use Cases & Examples

Cronicorn adapts scheduling based on real-time conditions. Here are real-world scenarios demonstrating adaptive intervals, conditional activation, and intelligent coordination.

## E-Commerce Flash Sale Monitoring

**Scenario**: Black Friday sale launches with 5× traffic surge. The scheduler adapts monitoring and attempts recovery before paging engineers.

### Architecture (10 Endpoints, 4 Tiers)

**Tier 1: Health Checks** (Always Running)
- **traffic_monitor**: Tracks visitors/min and page load times (5min baseline → 30s when surging)
- **order_processor_health**: Monitors checkout performance (3min → 45s when strained)
- **inventory_sync_check**: Ensures stock accuracy (10min → 2min when lagging)

**Tier 2: Investigation** (Conditional)
- **slow_page_analyzer**: Identifies lagging pages (paused → 2min when traffic high AND pages slow)
- **database_query_trace**: Finds slow DB operations (paused → one-shot when struggling)

**Tier 3: Recovery** (Automatic Fixes)
- **cache_warm_up**: Pre-loads popular products (one-shot → 15min cooldown)
- **scale_checkout_workers**: Adds capacity (one-shot → 20min cooldown)

**Tier 4: Alerts** (Smart Escalation)
- **slack_operations**: Quick heads-up (one-shot → 10min cooldown)
- **slack_customer_support**: User-facing issues (one-shot → 20min cooldown)
- **emergency_oncall_page**: Escalates if auto-recovery fails (one-shot → 1hr cooldown)

### Behavior Timeline (40 Minutes)

- **0-5min** (Baseline): Health checks running normally, other tiers paused
- **5-10min** (Surge): Traffic monitor tightens to 30s, ops alerted
- **10-15min** (Strain): Order/inventory checks tighten, investigation activates
- **15-25min** (Critical): Cache warm-up fires, scaling triggered, DB traces run
- **25-40min** (Recovery): Intervals relax to baseline, investigation pauses

**Total**: ~467 runs showing coordinated adaptive behavior.

See the [flash sale simulation](../packages/worker-scheduler/src/sim/) for a working example.

## Additional Use Cases

### DevOps Health Monitoring

**Pattern**: Production infrastructure monitoring with auto-remediation.

- **Health checks**: API latency, error rate, DB connections, queue backlog
- **Investigation**: Slow queries, memory profiling, distributed tracing (conditional)
- **Remediation**: Restart pods, flush cache, scale workers, kill slow queries
- **Alerts**: Slack DevOps → PagerDuty oncall (escalating with cooldowns)

### Content Publishing & Social Media

**Pattern**: Automated content scheduling with engagement optimization.

- Schedule posts for peak engagement windows (AI learns from historical data)
- Increase monitoring frequency for viral content
- Pause promotional campaigns if engagement drops
- A/B test post timing and amplify high performers

### Data Pipeline & ETL Orchestration

**Pattern**: Extract → Transform → Load with dependency coordination.

- Transform endpoint paused until extraction completes
- Loading activated when both extract and transform succeed
- Adaptive intervals based on data volume (more frequent when backlog detected)

### SaaS Usage Monitoring & Billing

**Pattern**: Track customer usage, enforce quotas, run billing cycles.

- Increase monitoring frequency as usage approaches quota
- Pause monitoring after quota exceeded (save resources)
- Accelerate dunning reminders based on payment failure patterns

### Web Scraping & Data Collection

**Pattern**: Collect market data while respecting rate limits.

- Slow down scraping when rate limit warnings detected
- Pause endpoints if validation consistently fails
- Adjust intervals based on proxy pool health

## API Usage Patterns

### 1. Adaptive Intervals
```javascript
propose_interval({ 
  intervalMs: 30000,
  ttlMinutes: 15,
  reason: "High traffic detected"
})
```

### 2. Conditional Activation
```javascript
pause_until({ 
  untilIso: null,  // Resume now
  reason: "Threshold crossed"
})
```

### 3. One-Shot Actions
```javascript
propose_next_time({
  nextRunInMs: 0,
  ttlMinutes: 1,
  reason: "Cache warm-up triggered"
})
```

### 4. Coordinated Dependencies
1. Health endpoint detects issue
2. AI activates investigation endpoint
3. Investigation identifies root cause
4. Recovery action fires one-shot
5. Alert only if recovery fails

## Implementation Example

### Creating Jobs

```bash
curl -X POST https://api.example.com/api/v1/jobs \
  -H "x-api-key: cron_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-Commerce Health Monitor",
    "endpoints": [{
      "name": "Traffic Monitor",
      "url": "https://analytics.example.com/traffic",
      "method": "GET",
      "baselineIntervalMs": 300000,
      "minIntervalMs": 30000,
      "maxIntervalMs": 900000
    }]
  }'
```

### AI Hints (Adaptive Control)

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

---

**Want to see these patterns in action?** Check the flash sale simulation in `packages/worker-scheduler/src/sim/`.
