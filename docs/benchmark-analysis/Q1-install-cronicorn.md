# Q1: How do I install Cronicorn?

**Estimated Score: 4/10**
**Priority: 1 (Highest)**

## Question Analysis

This is the most fundamental question a developer would ask. Context7 evaluates how well documentation provides clear, actionable installation instructions.

## Current Documentation Coverage

### What Exists

1. **Quick Start** (`quick-start.md`):
   - Assumes hosted service ("Sign up at cronicorn.com")
   - Has MCP server install: `npm install -g @cronicorn/mcp-server`
   - No local development setup

2. **Self-Hosting** (`self-hosting.md`):
   - Docker Compose setup only
   - Links to external files (`docker-compose.yml`, `.env.example`)
   - Good for production deployment, not for quick trial

### What's Missing

1. **No clear "install" command** for trying Cronicorn locally
2. **No `npx` quick-run option** like many modern tools
3. **No npm package** for using Cronicorn as a library
4. **No "install" section** in any documentation
5. **Quick start assumes hosted service** - no local dev option
6. **Self-hosting is too complex** for "just trying it out"

## Context7 Scoring Criteria Analysis

| Metric | Score | Reason |
|--------|-------|--------|
| Question Coverage | 3/10 | No direct "install" instructions |
| Relevant Examples | 4/10 | MCP install exists but not main product |
| Formatting | 6/10 | Commands are formatted, but scattered |
| Initialization | 3/10 | Missing import statements, package setup |
| Metadata | 7/10 | Clean metadata in frontmatter |

## Gap Analysis

### Gap 1: No Quick Local Install (Critical)

**Problem**: Developer asks "How do I install Cronicorn?" and there's no `npm install` or `pip install` command.

**Context7's Expectation**: Clear installation command like:
```bash
npm install -g cronicorn
# or
npx cronicorn
```

**Current Reality**: Must use hosted service or set up Docker Compose.

### Gap 2: No "Install" Documentation Page (High)

**Problem**: No dedicated installation guide. Information is scattered across quick-start and self-hosting.

**Context7's Expectation**: Dedicated `installation.md` or clear "Installation" section.

### Gap 3: Missing Initialization Code (Medium)

**Problem**: No TypeScript/JavaScript examples showing how to import or initialize Cronicorn.

**Context7's Expectation**:
```typescript
import { Cronicorn } from '@cronicorn/sdk';

const client = new Cronicorn({
  apiKey: process.env.CRONICORN_API_KEY
});
```

## Recommendations

### Option A: Documentation Improvements (Quick Win)

1. **Create `installation.md`** with clear sections:
   - Using Hosted Service (current quick-start content)
   - Using MCP Server (AI assistants)
   - Using API Client (SDK)
   - Self-Hosting (Docker)

2. **Add to quick-start.md** opening:
   ```markdown
   ## Installation Options

   **Hosted (Quickest)**: No installation needed - [sign up](https://cronicorn.com)

   **MCP Server** (AI Assistants):
   ```bash
   npm install -g @cronicorn/mcp-server
   ```

   **API Client** (Programmatic):
   ```bash
   npm install @cronicorn/client
   ```

   **Self-Hosted** (Your Infrastructure): See [Self-Hosting Guide](./self-hosting.md)
   ```

### Option B: App Functionality Addition (Medium Effort)

1. **Create `@cronicorn/client` SDK package**:
   - TypeScript client for API access
   - Auto-generated from OpenAPI spec
   - Clear initialization examples

2. **Add `npx` quick-run support**:
   - `npx @cronicorn/cli init` - scaffold project
   - `npx @cronicorn/cli login` - authenticate

### Option C: Docker Simplification (Medium Effort)

1. **Create one-liner Docker run**:
   ```bash
   docker run -p 3000:3000 cronicorn/cronicorn
   ```

2. **Add to documentation** as quickest local option

## Implementation Priority

| Item | Effort | Impact | Recommendation |
|------|--------|--------|----------------|
| Create installation.md | Low | High | Do first |
| Add installation section to quick-start | Low | High | Do first |
| Create @cronicorn/client SDK | High | Very High | Consider for v2 |
| Docker one-liner | Medium | Medium | Nice to have |

## Expected Score Improvement

- **Current**: 4/10
- **After Option A**: 6/10
- **After Option B**: 8/10
- **After Option A + B**: 9/10

## Related Files

- `docs/public/quick-start.md` - Needs installation section
- `docs/public/self-hosting.md` - Good for Docker, needs simplification
- Need new: `docs/public/installation.md`
