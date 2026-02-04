# Benchmark Analysis: Q8 - Baseline with Temporary Tightening During Surges

**Score: 95/100**

## Question

> Describe how to configure a Cronicorn job that maintains a baseline schedule but temporarily tightens execution frequency during detected activity surges, then gracefully returns to baseline when conditions normalize.

## Current Capability Assessment

### This Is Cronicorn's Core Design

This question perfectly describes Cronicorn's fundamental architecture:

1. **Baseline Schedule**: Every endpoint has a `baselineIntervalMs` or `baselineCron`
2. **Temporary Tightening**: AI uses `propose_interval` with TTL
3. **Automatic Return**: When TTL expires, system returns to baseline
4. **Surge Detection**: AI interprets response body metrics
5. **Graceful Normalization**: AI uses `clear_hints` when conditions stabilize

### Why Score Is High (95/100)

The existing documentation covers this well:
- `how-ai-adaptation-works.md` explains TTL-based hints
- `core-concepts.md` covers baseline vs. AI hints
- `configuration-and-constraints.md` shows constraint setup
- Multiple use cases demonstrate this pattern

### Where The 5% Gap Comes From

Minor improvements possible:
- Explicit "surge detection" terminology not used
- "Graceful return" process could be more explicit
- Complete end-to-end example could be more prominent

## Gap Analysis

### Documentation Gaps (Minor)

| Gap | Impact | Current State |
|-----|--------|---------------|
| "Surge" terminology not used | Question uses specific term | Covered conceptually |
| Complete lifecycle example | Could be more explicit | Exists but scattered |
| "Graceful return" not a heading | Terminology gap | Covered as TTL expiration |

### Functionality Assessment

**Fully supported** - this is exactly what Cronicorn does.

## Recommended Documentation Improvements

### 1. Add Section: **"Surge Response Pattern"**

In `how-ai-adaptation-works.md`:

```markdown
## Surge Response Pattern

Cronicorn's most common pattern: maintain baseline, tighten during surges, return gracefully.

### The Lifecycle

```
1. BASELINE (Normal Operation)
   └── Polling at baselineIntervalMs (e.g., 5 minutes)
   └── AI monitors response metrics

2. SURGE DETECTED
   └── Response indicates increased activity
   └── AI proposes shorter interval with TTL
   └── Polling tightens (e.g., 30 seconds)

3. SURGE ACTIVE
   └── AI continues monitoring at tightened interval
   └── May extend TTL if surge persists
   └── May tighten further if conditions worsen

4. NORMALIZATION
   └── Response indicates normal activity
   └── AI either:
       a) Calls clear_hints (immediate return)
       b) Lets TTL expire (automatic return)
   └── Returns to baseline

5. BASELINE (Restored)
   └── Back to normal polling interval
   └── AI continues passive monitoring
```

### Configuring for Surge Response

```json
{
  "name": "activity-monitor",
  "url": "https://api.example.com/metrics",
  "baselineIntervalMs": 300000,   // 5 min baseline
  "minIntervalMs": 30000,          // 30s during surges
  "maxIntervalMs": 600000          // Never slower than 10 min
}
```

### Response Design for Surge Detection

```json
// Normal activity
{
  "activity_level": "normal",
  "requests_per_minute": 150,
  "surge_threshold": 500
}

// Surge detected
{
  "activity_level": "surge",
  "requests_per_minute": 750,
  "surge_threshold": 500,
  "surge_started_at": "2025-01-15T14:25:00Z",
  "recommendation": "increase_monitoring"
}

// Returning to normal
{
  "activity_level": "elevated",
  "requests_per_minute": 400,
  "surge_threshold": 500,
  "trending": "down",
  "recommendation": "maintain_monitoring"
}

// Normalized
{
  "activity_level": "normal",
  "requests_per_minute": 120,
  "surge_threshold": 500,
  "normalized_at": "2025-01-15T15:10:00Z"
}
```

### Graceful Return Mechanisms

Cronicorn ensures graceful return to baseline through multiple mechanisms:

1. **TTL Expiration**: All AI hints have time limits
   - Hint expires → immediate return to baseline
   - No permanent state changes

2. **Explicit Clear**: AI calls `clear_hints` when:
   - Sustained normal metrics detected
   - User requests return to baseline
   - Conditions clearly stabilized

3. **Constraint Clamping**: Even during surges:
   - `minIntervalMs` prevents too-fast polling
   - `maxIntervalMs` prevents too-slow polling

### Example: E-Commerce Flash Sale

```
Timeline:

09:00 - Baseline (5 min polling)
  └── Response: { "orders_per_min": 20 }

09:30 - Flash sale starts
  └── Response: { "orders_per_min": 500, "surge": true }
  └── AI: propose_interval(30000, ttl=60min)

09:31 - 10:30 - Surge active (30s polling)
  └── AI monitors, may extend TTL if needed

10:30 - Sale ends, orders decrease
  └── Response: { "orders_per_min": 80, "surge": false }
  └── AI: clear_hints("surge ended")

10:31 - Baseline restored (5 min polling)
  └── Graceful return complete
```
```

### 2. Minor Enhancement to `core-concepts.md`

Add brief mention:

```markdown
### Surge Response

Cronicorn automatically tightens polling during activity surges and returns to baseline when conditions normalize. This is achieved through:

- **TTL-bounded hints**: Temporary changes that auto-expire
- **AI interpretation**: Detects surge signals in response data
- **Graceful return**: Either explicit clear or TTL expiration

See [How AI Adaptation Works](./technical/how-ai-adaptation-works.md) for details.
```

## Priority Assessment

| Action | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Add "Surge Response Pattern" section | **LOW** | Low | Low - already at 95% |
| Add lifecycle diagram | **LOW** | Low | Low - nice to have |
| Cross-reference from core-concepts | **LOW** | Low | Low - minor improvement |

## Expected Score Improvement

With documentation improvements:
- Current: 95/100
- Expected: 98-100/100

This is already very well documented. Improvements are marginal.

## Summary

**Minimal Gap**: Documentation is comprehensive. Minor terminology and prominence improvements possible.

**No Functionality Gap**: This is Cronicorn's core design pattern.

**Recommendation**:
1. Add explicit "Surge Response Pattern" section for terminology alignment
2. Add complete lifecycle example with timeline
3. Minimal effort - already well documented

**Priority**: LOW - focus on lower-scored questions first.
