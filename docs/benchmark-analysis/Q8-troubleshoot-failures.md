# Q8: How do I troubleshoot failing endpoints?

**Estimated Score: 8/10**
**Priority: 7 (Lower)**

## Question Analysis

Troubleshooting is critical for operations. Context7 evaluates whether docs provide systematic diagnostic steps for common problems.

## Current Documentation Coverage

### What Exists

1. **Troubleshooting Guide** (`troubleshooting.md`):
   - **Excellent coverage** of common issues
   - Endpoint not running, running too fast/slow
   - Timeout and error handling
   - Authentication issues
   - AI adaptation issues
   - MCP server issues
   - Self-hosting issues
   - Diagnostic commands

2. **Quick Start** (`quick-start.md`):
   - Basic troubleshooting section
   - Common issues: not running, auth errors, timeouts, rate limits

3. **API Reference** (`api-reference.md`):
   - Error codes table
   - Reset failures endpoint

### What Works Well

1. **Dedicated troubleshooting guide** is comprehensive
2. **Organized by symptom** (what you see)
3. **Includes diagnostic commands** and API calls
4. **Covers multiple areas**: endpoints, AI, auth, MCP, self-hosting
5. **Quick-start has brief troubleshooting** for common issues

### What's Missing (Minor)

1. **No flowchart/decision tree** for troubleshooting
2. **No "common error messages" table** with solutions
3. **No log interpretation guide** for self-hosted

## Context7 Scoring Criteria Analysis

| Metric | Score | Reason |
|--------|-------|--------|
| Question Coverage | 9/10 | Comprehensive troubleshooting guide |
| Relevant Examples | 8/10 | Good diagnostic commands |
| Formatting | 8/10 | Well organized sections |
| Initialization | 7/10 | Clear API calls for diagnostics |
| Metadata | 8/10 | Good frontmatter |

## Gap Analysis

### Gap 1: No Common Error Messages Table (Low)

**Problem**: Developer sees specific error, wants quick fix.

**Context7's Expectation**:
```markdown
## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Target server down | Check if URL is accessible |
| `ETIMEDOUT` | Request too slow | Increase timeout or optimize endpoint |
| `401 Unauthorized` | Bad credentials | Check auth headers |
| `429 Too Many Requests` | Rate limited | Increase min interval |
| `CERT_INVALID` | SSL issue | Check certificate chain |
```

### Gap 2: No Troubleshooting Flowchart (Low)

**Problem**: Where to start when something's wrong?

**Nice to have**: Visual flowchart for diagnosis

## Recommendations

### Documentation Improvements

1. **Add error messages table** to troubleshooting.md:

```markdown
## Quick Reference: Error Messages

| Error | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| `ECONNREFUSED` | Server unreachable | Verify URL is accessible |
| `ETIMEDOUT` | Slow response | Increase timeout setting |
| `ENOTFOUND` | DNS failure | Check URL spelling |
| `CERT_HAS_EXPIRED` | SSL cert expired | Update target's certificate |
| `401` | Auth failed | Check authentication headers |
| `429` | Rate limited | Increase min interval |
| `500` | Server error | Check target server logs |
```

2. **Add "Where to Start" section**:

```markdown
## Where to Start Troubleshooting

1. **Check endpoint status**: Is it paused? Archived?
2. **View recent runs**: Any error messages?
3. **Test URL directly**: `curl -v YOUR_URL`
4. **Check authentication**: Are credentials valid?
5. **Review constraints**: Is min interval too low?
```

## Implementation Priority

| Item | Effort | Impact | Recommendation |
|------|--------|--------|----------------|
| Add error messages table | Low | Medium | Nice to have |
| Add "where to start" | Low | Low | Nice to have |

## Expected Score Improvement

- **Current**: 8/10
- **After improvements**: 9/10

This question is already well-covered. Focus on lower-scoring questions first.

## Related Files

- `docs/public/troubleshooting.md` - Main troubleshooting guide
- `docs/public/quick-start.md` - Basic troubleshooting (lines 185-219)
- `docs/public/api-reference.md` - Error codes (lines 528-536)
