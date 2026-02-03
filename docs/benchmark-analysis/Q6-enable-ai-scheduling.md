# Q6: How do I enable AI scheduling for my endpoints?

**Estimated Score: 6/10**
**Priority: 4 (Medium)**

## Question Analysis

This is a practical "how-to" question. Context7 evaluates whether docs provide clear, actionable steps to enable AI features.

## Current Documentation Coverage

### What Exists

1. **Quick Start** (`quick-start.md`):
   - UI instructions: Settings → AI Features → Enable
   - Brief explanation of what AI does

2. **Self-Hosting** (`self-hosting.md`):
   - Environment variables for AI (`OPENAI_API_KEY`, `AI_MODEL`)

3. **API Reference** (`api-reference.md`):
   - AI Scheduling API for programmatic control
   - Hints API (interval, one-shot)

### What Works Well

1. **UI path documented** for hosted service
2. **Self-hosting config** for own infrastructure
3. **API endpoints** for programmatic control

### What's Missing

1. **No API to enable/disable AI** for specific endpoints
2. **No "AI requirements" checklist** (what endpoint needs)
3. **No per-endpoint AI configuration** documentation
4. **No "verification" step** - how to know AI is working

## Context7 Scoring Criteria Analysis

| Metric | Score | Reason |
|--------|-------|--------|
| Question Coverage | 6/10 | Basic UI steps, missing programmatic |
| Relevant Examples | 5/10 | Limited examples |
| Formatting | 7/10 | Clear steps |
| Initialization | 5/10 | Missing verification |
| Metadata | 8/10 | Good frontmatter |

## Gap Analysis

### Gap 1: No "AI Readiness Checklist" (Medium)

**Problem**: Developer enables AI but nothing happens. Why?

**Context7's Expectation**:
```markdown
## AI Scheduling Requirements

For AI to analyze your endpoint, ensure:

1. **Return JSON responses** - AI reads response bodies
2. **Include meaningful metrics** - queue depth, error rates, etc.
3. **Set min/max constraints** - gives AI safe boundaries
4. **Use interval scheduling** - AI adapts intervals, not cron times

**AI won't analyze if:**
- Endpoint is paused
- No runs in last 24 hours
- Using cron-only schedule (no interval adaptation possible)
```

### Gap 2: No Verification Steps (Medium)

**Problem**: "How do I know AI is working?"

**Context7's Expectation**:
```markdown
## Verify AI is Active

1. **Check Analysis Sessions:**
   ```bash
   curl -H "x-api-key: YOUR_KEY" \
     https://api.cronicorn.com/api/endpoints/EP_ID/analysis-sessions
   ```

2. **Look for hints in endpoint details:**
   - `aiIntervalMs` - current AI interval hint
   - `nextAiAnalysisAt` - when AI will next analyze

3. **UI indicators:**
   - AI icon next to endpoint name
   - "Last AI Analysis" timestamp
```

### Gap 3: No Per-Endpoint Configuration (Low)

**Problem**: Can't enable/disable AI for specific endpoints via API.

**May be app limitation, not doc issue.**

## Recommendations

### Documentation Improvements

1. **Add "AI Readiness Checklist"** to quick-start and core-concepts:

```markdown
## AI Scheduling Requirements

Before enabling AI, ensure your endpoints:

- [ ] Return JSON response bodies
- [ ] Include useful metrics (queue depth, error rates, status)
- [ ] Have min/max interval constraints configured
- [ ] Use interval-based scheduling (not cron-only)
```

2. **Add "Verify AI is Working" section**:

```markdown
## Verify AI is Analyzing Your Endpoints

After enabling AI:

1. Wait for at least one scheduled execution
2. Check the endpoint's "Analysis Sessions" in the UI
3. Or query via API:
   ```bash
   curl -H "x-api-key: YOUR_KEY" \
     "https://api.cronicorn.com/api/endpoints/EP_ID/analysis-sessions?limit=1"
   ```

If no sessions appear after 24 hours, check:
- Endpoint is not paused
- Endpoint has recent runs
- Response body returns valid JSON
```

3. **Add troubleshooting section** for AI not working

## Implementation Priority

| Item | Effort | Impact | Recommendation |
|------|--------|--------|----------------|
| Add AI readiness checklist | Low | High | Do first |
| Add verification steps | Low | High | Do first |
| Add AI troubleshooting | Medium | Medium | Do soon |

## Expected Score Improvement

- **Current**: 6/10
- **After checklist + verification**: 8/10

## Related Files

- `docs/public/quick-start.md` - Enable AI section (lines 69-83)
- `docs/public/self-hosting.md` - AI configuration (lines 86-92)
- `docs/public/api-reference.md` - AI Analysis API
- `docs/public/troubleshooting.md` - Needs AI troubleshooting
