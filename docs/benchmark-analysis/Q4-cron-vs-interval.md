# Q4: How do I configure cron vs interval scheduling?

**Estimated Score: 8/10**
**Priority: 6 (Lower)**

## Question Analysis

Understanding scheduling options is fundamental. Context7 evaluates whether docs clearly explain when to use each approach with practical examples.

## Current Documentation Coverage

### What Exists

1. **Core Concepts** (`core-concepts.md`):
   - Defines both baseline schedule types
   - Explains interval hints vs cron expressions
   - Priority order documentation

2. **Configuration & Constraints** (`technical/configuration-and-constraints.md`):
   - **Excellent**: Full decision tree for cron vs interval
   - When to use each approach
   - Examples and common patterns

3. **Quick Start** (`quick-start.md`):
   - Shows both options when adding endpoint
   - Example patterns for each

4. **API Reference** (`api-reference.md`):
   - Field documentation: `baselineCron` vs `baselineIntervalMs`

### What Works Well

1. **Decision framework**: Clear guidance on when to use each
2. **Real-world examples**: Flash sales, maintenance, data sync
3. **Complete field documentation** in API reference
4. **Multiple entry points**: Quick start, core concepts, technical docs

### What's Missing

1. **Cron expression reference** - no cron syntax guide
2. **Interval conversion table** - ms to human readable
3. **Migration guide** - switching between cron and interval

## Context7 Scoring Criteria Analysis

| Metric | Score | Reason |
|--------|-------|--------|
| Question Coverage | 9/10 | Excellent coverage across docs |
| Relevant Examples | 8/10 | Good examples, could add more |
| Formatting | 8/10 | Decision trees, tables, code blocks |
| Initialization | 7/10 | Clear field names in API |
| Metadata | 8/10 | Good frontmatter |

## Gap Analysis

### Gap 1: No Cron Syntax Reference (Low)

**Problem**: Developers unfamiliar with cron need syntax reference.

**Context7's Expectation**:
```markdown
## Cron Expression Syntax

| Field | Values | Example |
|-------|--------|---------|
| Minute | 0-59 | `*/5` (every 5 min) |
| Hour | 0-23 | `0` (midnight) |
| Day | 1-31 | `1` (first of month) |
| Month | 1-12 | `*` (every month) |
| Weekday | 0-6 | `1-5` (Mon-Fri) |

**Common patterns:**
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 0 * * *` - Daily at midnight
- `0 2 * * 0` - Sunday at 2am
```

### Gap 2: Interval Conversion Table (Low)

**Problem**: Milliseconds aren't intuitive.

**Context7's Expectation**:
```markdown
## Interval Quick Reference

| Human | Milliseconds |
|-------|-------------|
| 30 seconds | 30000 |
| 1 minute | 60000 |
| 5 minutes | 300000 |
| 15 minutes | 900000 |
| 1 hour | 3600000 |
| 1 day | 86400000 |
```

## Recommendations

### Documentation Improvements

1. **Add cron syntax reference** to core-concepts or as appendix
2. **Add interval conversion table** to quick-start and api-reference
3. **Consider**: Link to external cron tool like crontab.guru

## Implementation Priority

| Item | Effort | Impact | Recommendation |
|------|--------|--------|----------------|
| Add cron syntax reference | Low | Medium | Nice to have |
| Add interval conversion | Low | Low | Nice to have |

## Expected Score Improvement

- **Current**: 8/10
- **After improvements**: 9/10

This question is already well-covered. Focus improvement efforts on lower-scoring questions first.

## Related Files

- `docs/public/core-concepts.md` - Baseline schedules section
- `docs/public/technical/configuration-and-constraints.md` - Decision tree
- `docs/public/api-reference.md` - Field documentation
