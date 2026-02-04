# Benchmark Analysis: Q10 - Preventing Oscillation with Volatile Patterns

**Score: 53/100**

## Question

> What strategies would you employ to prevent Cronicorn's adaptive scheduling from oscillating between extreme frequencies in a scenario with highly volatile HTTP response patterns, and how would you configure rules to maintain stability while still responding to genuine state changes?

## Current Capability Assessment

### Built-in Stability Mechanisms

Cronicorn has several mechanisms that naturally prevent oscillation:

1. **TTL-Based Hints**: All AI hints expire, preventing permanent extreme states
2. **Min/Max Constraints**: Hard limits on interval extremes
3. **Multi-Window Health Metrics**: AI sees 1h, 4h, 24h trends, not just latest response
4. **Analysis Cooldown**: AI re-analyzes at scheduled intervals (default: 5 min), not on every response
5. **Exponential Backoff**: Failures naturally slow polling, preventing rapid retries
6. **AI Reasoning**: Prompt encourages stability-oriented decisions

### What Works Well

From the AI Planner prompt (`planner.ts`):
- AI is instructed to "default to stability"
- Multi-window metrics provide trend context
- AI can set `next_analysis_in_ms` to control re-analysis timing

### What May Cause Oscillation

1. **Very short TTLs**: Hints expire quickly, AI may flip-flop
2. **No configured constraints**: Without min/max, AI has full range
3. **Response body volatility**: If response data changes rapidly, AI may react to noise
4. **Aggressive min intervals**: Very short minimums allow rapid fluctuation

## Gap Analysis

### Documentation Gaps

| Gap | Impact | Current State |
|-----|--------|---------------|
| Anti-oscillation strategies not documented | Users don't know how to prevent | Not addressed |
| TTL guidance for stability not provided | Users choose arbitrary TTLs | Missing |
| Constraint tuning for stability not explained | Underutilized feature | Minimal coverage |
| Response design for stability not covered | Users may create volatile responses | Not addressed |
| AI's built-in stability behavior not explained | Hidden capability | Not documented |

### Functionality Assessment

**Current functionality is SUFFICIENT** - the anti-oscillation mechanisms exist but aren't documented.

## Recommended Documentation Improvements

### 1. New Section in `how-ai-adaptation-works.md`

Add: **"Stability and Oscillation Prevention"**

```markdown
## Stability and Oscillation Prevention

Cronicorn includes multiple mechanisms to prevent oscillation between extreme scheduling states.

### Built-in Stability Mechanisms

#### 1. Multi-Window Health Metrics

The AI Planner sees success rates across three windows:
```
| Window | Purpose |
|--------|---------|
| 1 hour | Recent behavior, quick trend detection |
| 4 hours | Medium-term pattern |
| 24 hours | Long-term baseline |
```

This prevents reacting to momentary spikes. The AI compares windows to distinguish:
- **Genuine state change**: All windows show decline
- **Transient spike**: 1h differs significantly from 4h/24h

#### 2. Analysis Cooldown

The AI Planner doesn't analyze every response:
- Default: Re-analyzes endpoints every 5 minutes
- AI can extend via `next_analysis_in_ms` (up to 24 hours)
- This prevents rapid decision changes

#### 3. TTL-Based Hints

All scheduling hints expire automatically:
```
Short TTL (5-15 min): For transient investigations
Medium TTL (30-60 min): For operational shifts
Long TTL (2-4 hours): For sustained conditions
```

When hints expire, endpoints return to baseline—a natural stability anchor.

#### 4. Hard Constraints

Min/Max intervals provide absolute limits:
```
minIntervalMs: 30000    // Never faster than 30 seconds
maxIntervalMs: 600000   // Never slower than 10 minutes
```

Even with volatile AI decisions, constraints bound the range.

### Configuring for Stability

#### Strategy 1: Appropriate Constraints

For volatile workloads, use tighter constraint ranges:

```json
{
  "baselineIntervalMs": 60000,    // 1 minute baseline
  "minIntervalMs": 30000,          // 30 seconds minimum
  "maxIntervalMs": 120000          // 2 minutes maximum
}
```

This limits oscillation to a 4x range (30s to 2min) instead of unbounded.

#### Strategy 2: Response Design for Stability

Include smoothed/aggregated metrics instead of instantaneous values:

```json
// BAD: Instantaneous values cause oscillation
{
  "current_queue_depth": 500,     // Spikes constantly
  "current_error_rate": 15.5      // Fluctuates wildly
}

// GOOD: Smoothed values provide stability
{
  "avg_queue_depth_5min": 250,    // Smoothed average
  "avg_error_rate_1hr": 2.3,      // Longer-term average
  "trend": "stable",               // Explicit trend indicator
  "volatility": "high"             // Signal to AI
}
```

#### Strategy 3: Explicit Stability Signals

Include signals that tell AI to maintain stability:

```json
{
  "status": "degraded",
  "recommendation": "maintain_current_interval",
  "avoid_oscillation": true,
  "min_stable_period_ms": 300000   // Stay stable for 5 min
}
```

#### Strategy 4: Cooldown Indicators

Prevent rapid back-and-forth by including cooldown information:

```json
{
  "last_state_change_at": "2025-01-15T14:25:00Z",
  "time_in_current_state_ms": 180000,
  "stable_for": "3 minutes",
  "recommend_no_change_until_stable_for": "5 minutes"
}
```

### AI's Stability Behavior

The AI Planner is designed to favor stability:

1. **Default to baseline**: When uncertain, AI maintains or clears hints
2. **Trend confirmation**: AI looks for consistent patterns, not one-off spikes
3. **Gradual adjustments**: AI prefers incremental changes over extreme swings
4. **Extended analysis intervals**: For stable endpoints, AI may wait 4-24 hours between analyses

### Debugging Oscillation

If you observe oscillation:

1. **Check AI Analysis Sessions**:
   ```sql
   SELECT analyzed_at, reasoning, tool_calls
   FROM ai_analysis_sessions
   WHERE endpoint_id = '...'
   ORDER BY analyzed_at DESC;
   ```

2. **Review Response Pattern**:
   - Are response values volatile?
   - Are you returning instantaneous vs. averaged metrics?

3. **Verify Constraints**:
   - Are min/max intervals configured?
   - Is the range appropriate for your workload?

4. **Check TTL Patterns**:
   - Are hints expiring too quickly?
   - Is AI using consistent TTL durations?
```

### 2. Add to `configuration-and-constraints.md`

Add: **"Tuning for Volatile Workloads"**

```markdown
## Tuning for Volatile Workloads

When your endpoints monitor volatile systems, configure for stability:

### Constraint Configuration

| Volatility Level | Min Interval | Max Interval | Ratio |
|------------------|--------------|--------------|-------|
| Low (stable systems) | 10s | 10min | 60x |
| Medium (normal variation) | 30s | 5min | 10x |
| High (volatile metrics) | 30s | 2min | 4x |
| Extreme (chaotic systems) | 1min | 2min | 2x |

### Why Tighter Ranges Help

With a 60x range (10s to 10min), AI has room to oscillate dramatically.
With a 2x range (1min to 2min), even wild AI decisions stay bounded.

### Baseline Selection

For volatile workloads, set baseline in the middle of your constraint range:
```
min: 30s, max: 2min → baseline: 1min (middle)
```

This gives AI equal room to tighten or relax.

### Response Smoothing Recommendations

| Metric Type | Smoothing Approach |
|-------------|-------------------|
| Queue depth | 5-minute rolling average |
| Error rate | 1-hour rolling percentage |
| Latency | P95 over 5 minutes |
| Throughput | Requests per minute (not per second) |
```

### 3. Add to `troubleshooting.md`

Add: **"AI is oscillating between intervals"**

```markdown
### AI is oscillating between intervals

**Symptoms**: Endpoint interval changes frequently, alternating between fast and slow.

**Causes**:
1. Response data is volatile (instantaneous metrics)
2. Constraints allow wide range
3. TTLs are too short

**Solutions**:

1. **Add/tighten constraints**:
   ```json
   {
     "minIntervalMs": 30000,
     "maxIntervalMs": 120000
   }
   ```

2. **Smooth response metrics**:
   Return averaged values instead of instantaneous:
   ```json
   { "avg_error_rate_5min": 2.3 }  // Instead of instant rate
   ```

3. **Include stability signals**:
   ```json
   {
     "trend": "stable",
     "time_in_current_state_ms": 300000
   }
   ```

4. **Check AI analysis sessions** for reasoning patterns
```

### 4. Add Use Case: **"Monitoring Volatile Systems"**

In `use-cases.md`:

```markdown
### Monitoring Volatile Systems

**Scenario**: Monitor a system with highly variable metrics (stock prices, IoT sensors, traffic patterns).

**Challenge**: Prevent AI from overreacting to normal volatility.

**Configuration**:
```json
{
  "name": "volatile-metrics-monitor",
  "baselineIntervalMs": 60000,
  "minIntervalMs": 30000,      // Tight range
  "maxIntervalMs": 120000      // Only 4x variation allowed
}
```

**Response Design**:
```json
{
  "metrics": {
    "instant_value": 523,           // For display
    "avg_5min": 487,                 // For AI analysis
    "avg_1hr": 502,                  // For trend context
    "std_deviation": 45,             // Indicates volatility
    "within_normal_range": true      // Explicit stability signal
  },
  "trend": "stable",
  "recommendation": "no_change_needed"
}
```

**AI Behavior**:
- Sees `within_normal_range: true` → maintains current interval
- Uses smoothed averages for decisions, not instant values
- Interprets `recommendation` as guidance
- With tight constraints, even if it changes interval, range is bounded
```

## Priority Assessment

| Action | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Add stability/oscillation section to AI docs | **HIGH** | Medium | High - direct answer |
| Add volatile workload configuration guide | **HIGH** | Low | High - practical guidance |
| Add troubleshooting entry | **MEDIUM** | Low | Medium - quick reference |
| Add volatile systems use case | **MEDIUM** | Low | Medium - concrete example |

## Expected Score Improvement

With documentation improvements:
- Current: 53/100
- Expected: 80-85/100

The mechanisms exist; documentation is the gap.

## Summary

**Primary Gap**: Documentation - stability mechanisms exist but aren't documented.

**No Major Functionality Gap**: The system has:
- Multi-window health metrics (prevents reacting to noise)
- Analysis cooldown (prevents rapid decisions)
- TTL-based hints (automatic return to baseline)
- Min/max constraints (hard limits on range)
- AI reasoning favoring stability

**Recommendation**: Document the anti-oscillation mechanisms and provide:
1. Configuration guidance for volatile workloads
2. Response design best practices for stability
3. Explicit stability signals that AI understands
4. Troubleshooting guidance for oscillation issues
