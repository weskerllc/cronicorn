# Q5: How does AI adaptation work in Cronicorn?

**Estimated Score: 7/10**
**Priority: 5 (Medium)**

## Question Analysis

AI adaptation is Cronicorn's key differentiator. Context7 evaluates whether docs explain this clearly for both conceptual understanding and practical implementation.

## Current Documentation Coverage

### What Exists

1. **Core Concepts** (`core-concepts.md`):
   - AI hints explanation (interval, one-shot, pause)
   - Priority order of scheduling sources
   - TTL and expiration mechanics

2. **How AI Adaptation Works** (`technical/how-ai-adaptation-works.md`):
   - **Excellent technical depth**
   - Smart scheduling discovery
   - What AI sees (config, health metrics, response bodies)
   - Available tools (4 action, 3 query)
   - Session constraints (15 tool calls)

3. **Quick Start** (`quick-start.md`):
   - Brief "Enable AI Adaptation" section
   - Simple explanation of what AI does

4. **Use Cases** (`use-cases.md`):
   - Real-world examples of AI adaptation

### What Works Well

1. **Technical documentation is excellent** for deep understanding
2. **Real-world examples** show AI in action
3. **Tool documentation** explains AI capabilities
4. **Constraints documented** (TTLs, session limits)

### What's Missing

1. **No simple "how it works" summary** at the right abstraction level
2. **No visual diagram** of AI decision flow
3. **No "AI decision examples"** showing before/after
4. **Gap between quick-start (too simple) and technical (too deep)**

## Context7 Scoring Criteria Analysis

| Metric | Score | Reason |
|--------|-------|--------|
| Question Coverage | 7/10 | Covered but scattered across docs |
| Relevant Examples | 7/10 | Good use cases, missing specific decisions |
| Formatting | 7/10 | Good, could use more visual elements |
| Initialization | 8/10 | Clear on how to enable |
| Metadata | 8/10 | Good frontmatter |

## Gap Analysis

### Gap 1: Missing Mid-Level Explanation (Medium)

**Problem**: Jump from "AI helps" (quick-start) to deep technical details. Need middle ground.

**Context7's Expectation**:
```markdown
## How AI Adaptation Works (5-Minute Overview)

1. **Monitoring**: AI analyzes your endpoint's response bodies and health metrics
2. **Decision**: Based on patterns, AI decides to:
   - Increase frequency (errors or important signals detected)
   - Decrease frequency (everything stable)
   - Schedule one-shot (immediate action needed)
   - Pause temporarily (system overloaded)
3. **Action**: AI applies temporary "hints" that override your baseline schedule
4. **Expiration**: Hints automatically expire (TTL) and return to baseline

**Example:**
Your health check returns `{"error_rate": 0.15}` (15% errors).
AI detects this and tightens monitoring from 5 minutes to 30 seconds.
After errors resolve, AI lets the hint expire, returning to 5-minute baseline.
```

### Gap 2: No Decision Flow Examples (Medium)

**Problem**: Developers want to see "AI saw X, decided Y".

**Context7's Expectation**:
```markdown
## AI Decision Examples

### Example 1: Error Detection → Tighten Monitoring

**Before:**
- Baseline: Every 5 minutes
- Response: `{"healthy": false, "error_count": 50}`

**AI Analysis:**
"Error count of 50 detected. Tightening monitoring to every 30 seconds for 1 hour."

**After:**
- Active hint: 30 seconds for 60 minutes
- AI will re-evaluate after hint expires

### Example 2: System Stable → Relax Monitoring

**Before:**
- Baseline: Every 5 minutes
- Response: `{"healthy": true, "queue_depth": 5}`

**AI Analysis:**
"System stable for 24 hours with queue depth consistently under 10. Relaxing to every 15 minutes."
```

### Gap 3: No Visual Flow (Low)

**Problem**: No diagram showing decision flow.

## Recommendations

### Documentation Improvements

1. **Add mid-level explanation** to core-concepts.md:
   - 5-minute overview of how AI works
   - Simple flow: Monitor → Decide → Act → Expire

2. **Add "AI Decision Examples" section**:
   - Show concrete before/after scenarios
   - Include actual response bodies
   - Show AI's reasoning

3. **Add AI summary to quick-start**:
   - Beyond "Enable AI Adaptation"
   - Brief explanation of what happens next

4. **Consider**: Mermaid diagram of decision flow

## Implementation Priority

| Item | Effort | Impact | Recommendation |
|------|--------|--------|----------------|
| Add mid-level explanation | Medium | High | Do soon |
| Add decision examples | Medium | High | Do soon |
| Add visual diagram | Low | Medium | Nice to have |

## Expected Score Improvement

- **Current**: 7/10
- **After mid-level + examples**: 8.5/10
- **After all improvements**: 9/10

## Related Files

- `docs/public/core-concepts.md` - AI hints section
- `docs/public/quick-start.md` - Enable AI section
- `docs/public/technical/how-ai-adaptation-works.md` - Deep technical
- `docs/public/use-cases.md` - Real-world examples
