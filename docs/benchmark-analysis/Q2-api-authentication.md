# Q2: How do I authenticate with the Cronicorn API?

**Estimated Score: 7/10**
**Priority: 3 (Medium)**

## Question Analysis

Authentication is crucial for API access. Context7 evaluates whether documentation clearly explains how to obtain and use API credentials.

## Current Documentation Coverage

### What Exists

1. **API Reference** (`api-reference.md`):
   - **API Keys**: Clear instructions to generate at `/settings/api-keys`
   - **OAuth Device Flow**: Complete flow with curl examples
   - **Header usage**: `x-api-key` and `Authorization: Bearer`

2. **Quick Start** (`quick-start.md`):
   - Brief API key section with UI steps and curl example

### What Works Well

1. **Two auth methods documented**: API keys and OAuth device flow
2. **Complete curl examples** for both methods
3. **Step-by-step OAuth flow** with request/response examples
4. **Header format clearly shown**: `x-api-key: cron_abc123...`

### What's Missing

1. **No SDK/library authentication examples** (TypeScript, Python)
2. **No environment variable best practices**
3. **No token refresh documentation** for OAuth
4. **No scopes/permissions documentation**
5. **API key format not explained** (`cron_` prefix)

## Context7 Scoring Criteria Analysis

| Metric | Score | Reason |
|--------|-------|--------|
| Question Coverage | 8/10 | Both auth methods well documented |
| Relevant Examples | 7/10 | Curl examples good, missing SDK examples |
| Formatting | 8/10 | Clear code blocks, step numbering |
| Initialization | 5/10 | No SDK initialization code |
| Metadata | 8/10 | Good frontmatter |

## Gap Analysis

### Gap 1: No SDK Authentication Examples (Medium)

**Problem**: Only curl examples. Modern devs want TypeScript/JavaScript.

**Context7's Expectation**:
```typescript
import { CronicornClient } from '@cronicorn/client';

// API Key auth
const client = new CronicornClient({
  apiKey: process.env.CRONICORN_API_KEY
});

// OR OAuth
const client = await CronicornClient.fromOAuth({
  clientId: 'your-app'
});
```

### Gap 2: No Security Best Practices (Low)

**Problem**: No guidance on secure key storage.

**Context7's Expectation**:
```markdown
## Security Best Practices

- Store API keys in environment variables, never in code
- Use separate keys for development and production
- Rotate keys regularly
- Use OAuth for user-facing applications
```

### Gap 3: No Token Refresh (Low)

**Problem**: OAuth tokens expire but no refresh documentation.

## Recommendations

### Documentation Improvements

1. **Add SDK examples** to API Reference authentication section:

```typescript
// TypeScript example
import { CronicornClient } from '@cronicorn/client';

const client = new CronicornClient({
  apiKey: process.env.CRONICORN_API_KEY
});

// Verify connection
const jobs = await client.jobs.list();
```

2. **Add environment variable guidance**:

```markdown
## Environment Variables

Store your API key securely:

```bash
# .env
CRONICORN_API_KEY=cron_your_key_here
```

```typescript
// Use in code
const apiKey = process.env.CRONICORN_API_KEY;
```

3. **Add authentication troubleshooting**:

```markdown
## Common Authentication Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/missing key | Check key is correct |
| 403 Forbidden | Key lacks permissions | Use key with correct scope |
| Token expired | OAuth token timeout | Request new token |
```

## Implementation Priority

| Item | Effort | Impact | Recommendation |
|------|--------|--------|----------------|
| Add SDK auth examples | Low | Medium | Do soon |
| Add env variable guidance | Low | Low | Nice to have |
| Add troubleshooting table | Low | Medium | Do soon |

## Expected Score Improvement

- **Current**: 7/10
- **After improvements**: 8.5/10

## Related Files

- `docs/public/api-reference.md` - Authentication section (lines 23-65)
- `docs/public/quick-start.md` - API keys section (lines 129-143)
