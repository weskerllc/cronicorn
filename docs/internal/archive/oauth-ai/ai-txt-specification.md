# ai.txt Content Specification

**Location:** `apps/web/public/ai.txt`

**Purpose:** Provide machine-readable integration instructions for AI agents that discover Cronicorn.

**Standard:** Based on emerging `ai.txt` convention (inspired by `robots.txt`, `security.txt`)

---

## File Content

```txt
# Cronicorn - Adaptive AI-Driven Job Scheduler
# AI Integration Instructions

## Overview
Cronicorn is an adaptive HTTP job scheduler that uses AI to optimize execution timing.
Create jobs, configure schedules, and monitor executions—all via natural language.

## Integration Method
MCP Server (Model Context Protocol)

## Quick Setup

### 1. Install MCP Server
npx -y @cronicorn/mcp-server

### 2. Add to Your MCP Configuration
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"],
      "env": {
        "CRONICORN_API_URL": "https://api.cronicorn.com"
      }
    }
  }
}

### 3. Authenticate
The MCP server will automatically open a browser for OAuth authorization.
No API keys needed—secure OAuth 2.0 Device Flow.

## Capabilities

### Job Management
- Create HTTP jobs with natural language descriptions
- Configure cron schedules or interval-based execution
- Add multiple endpoints to a single job
- Pause/resume jobs with optional time limits

### Monitoring & Health
- List jobs with filtering (by status, name, date range)
- View execution history and success/failure rates
- Get AI-powered optimization insights

### Advanced Features
- Multi-tenant support (team workspaces)
- Timezone-aware scheduling
- Failure retry policies with backoff
- Webhook payloads and custom headers

## Example Prompts

Create a daily backup job:
"Create a job that hits https://api.example.com/backup every day at 2am UTC"

Monitor job health:
"Show me my failing jobs from the last week"

Pause a job temporarily:
"Pause the data-sync job until next Monday at 9am"

Create interval-based job:
"Create a job named 'health-check' that calls https://status.example.com every 5 minutes"

Add endpoint to existing job:
"Add an endpoint to the backup job that also calls https://api.example.com/cleanup"

## Available MCP Tools

### create_job
Create a new job with one or more endpoints.

Parameters:
- name (required): Human-readable job name
- endpoints (required): Array of HTTP endpoints to call
  - url (required): Target URL
  - method (optional): HTTP method (default: GET)
  - headers (optional): Custom headers object
  - body (optional): Request payload
- schedule (optional): Object with either:
  - cron: Cron expression (e.g., "0 2 * * *")
  - intervalMs: Interval in milliseconds
- timezone (optional): IANA timezone (default: UTC)
- description (optional): Job purpose

Example:
{
  "name": "daily-backup",
  "endpoints": [
    {
      "url": "https://api.example.com/backup",
      "method": "POST"
    }
  ],
  "schedule": {
    "cron": "0 2 * * *"
  },
  "timezone": "America/New_York"
}

### list_jobs
Query jobs with optional filters.

Parameters:
- status (optional): "active" | "paused" | "failing"
- name (optional): Search by name (substring match)
- limit (optional): Max results (default: 20)
- offset (optional): Pagination offset

Example:
{
  "status": "failing",
  "limit": 10
}

### pause_job
Pause a job until a specific time or indefinitely.

Parameters:
- jobId (required): Job ID to pause
- until (optional): ISO timestamp to resume
- reason (optional): Why job is being paused

Example:
{
  "jobId": "job_abc123",
  "until": "2024-02-01T09:00:00Z",
  "reason": "Maintenance window"
}

## Authentication Details

Method: OAuth 2.0 Device Flow (RFC 8628)
Authorization URL: https://cronicorn.com/device/approve
Token Endpoint: https://api.cronicorn.com/api/auth/device/token
Scopes: jobs:read jobs:write jobs:delete

The MCP server handles authentication automatically:
1. Requests device code from Cronicorn API
2. Opens browser to approval page
3. Polls for authorization
4. Stores tokens securely in ~/.cronicorn/credentials.json
5. Auto-refreshes tokens when expired

Users can revoke access anytime in Cronicorn Settings → Connected Devices.

## API Information

Base URL: https://api.cronicorn.com
API Version: v1
Documentation: https://cronicorn.com/docs/api
OpenAPI Spec: https://api.cronicorn.com/openapi.json

Alternative authentication (for programmatic access):
API Keys available at https://cronicorn.com/settings/api-keys

## Rate Limits

- Free Tier: 100 jobs, 10,000 executions/month
- Pro Tier: 1,000 jobs, 100,000 executions/month
- Enterprise: Custom limits

MCP operations:
- 60 requests per minute per user
- Exceeding limits returns 429 with Retry-After header

## Privacy & Security

- OAuth tokens stored locally on user's machine
- No credentials sent to AI agent providers
- All API requests over HTTPS
- Optional IP allowlisting available
- SOC 2 Type II compliant

## Support & Documentation

Full Documentation: https://cronicorn.com/docs/ai-integration
Video Tutorial: https://cronicorn.com/videos/mcp-setup
Community Discord: https://discord.gg/cronicorn
Email Support: support@cronicorn.com

GitHub:
- MCP Server: https://github.com/cronicorn/cronicorn/tree/main/apps/mcp-server
- Report Issues: https://github.com/cronicorn/cronicorn/issues
- Contribute: https://github.com/cronicorn/cronicorn/blob/main/CONTRIBUTING.md

## Self-Hosted Instances

To use with self-hosted Cronicorn:

{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"],
      "env": {
        "CRONICORN_API_URL": "https://your-instance.com"
      }
    }
  }
}

Ensure your instance is running Cronicorn v1.0+ with OAuth device flow enabled.

## Common Use Cases

### Scheduled Backups
"Create a nightly backup job that hits my backup endpoint at 3am"

### API Health Monitoring
"Monitor https://api.example.com/health every 2 minutes and alert me if it fails 3 times in a row"

### Data Synchronization
"Sync data from https://source.com/api to my webhook every 6 hours"

### Report Generation
"Generate a weekly report every Monday at 9am by calling https://reports.example.com/generate"

### Cache Warming
"Warm cache by hitting https://example.com/warm every hour during business hours (9am-5pm EST)"

### Webhook Forwarding
"Forward webhooks from https://service.com/webhook to https://myapp.com/receive every 30 seconds"

## Troubleshooting

### "OAuth authorization failed"
- Ensure you approved the device authorization in the browser
- Check that you're logged into Cronicorn
- Verify your account has permission to create jobs

### "Network error" when creating jobs
- Confirm CRONICORN_API_URL is correct
- Check internet connection
- Verify API is not experiencing downtime (status.cronicorn.com)

### "Rate limit exceeded"
- Wait for rate limit window to reset (shown in error message)
- Consider upgrading to Pro tier for higher limits

### Tokens expired
- MCP server auto-refreshes tokens
- If refresh fails, delete ~/.cronicorn/credentials.json and re-authenticate

## Changelog

2024-01-15: Initial ai.txt release
2024-01-20: Added pause_job tool
2024-02-01: Added self-hosted instance support
2024-02-10: Increased rate limits for Pro tier

## Contact

For AI agent developers integrating Cronicorn:
- Email: integrations@cronicorn.com
- Documentation: https://cronicorn.com/docs/integrations
- API Status: https://status.cronicorn.com

Last Updated: 2024-02-15
```

---

## HTML Metadata

Add to `apps/web/index.html` or layout component:

```html
<!-- AI Discovery -->
<link rel="ai" href="/ai.txt" type="text/plain">
<meta name="ai-integration" content="mcp-server">
<meta name="ai-mcp-package" content="@cronicorn/mcp-server">
```

---

## Serving ai.txt

### Static File (Recommended)
Place in `apps/web/public/ai.txt` - automatically served at `/ai.txt`

### Dynamic Route (Alternative)
If using server-side rendering:

```typescript
// apps/web/src/routes/ai.txt.ts
export async function GET() {
  const content = await fs.readFile('./public/ai.txt', 'utf-8');
  
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
```

---

## Alternative Location: /.well-known/ai.txt

Some AI agents may look for `/.well-known/ai.txt` (similar to security.txt).

**Solution:** Serve at both locations

```nginx
# nginx.conf
location = /ai.txt {
  alias /var/www/public/ai.txt;
}

location = /.well-known/ai.txt {
  alias /var/www/public/ai.txt;
}
```

Or use redirect:

```nginx
location = /.well-known/ai.txt {
  return 301 /ai.txt;
}
```

---

## Validation

### Structure Check
- ✅ Clear sections with `##` headers
- ✅ Installation instructions copyable
- ✅ Example prompts realistic
- ✅ Tool schemas complete
- ✅ Error handling documented

### Accessibility
- ✅ Plain text format
- ✅ No special characters requiring encoding
- ✅ Works with screen readers
- ✅ No JavaScript required

### Discoverability
- ✅ Served at `/ai.txt`
- ✅ Linked in HTML `<head>`
- ✅ Referenced in documentation
- ✅ Mentioned in README
- ✅ Submitted to AI agent directories

---

## Maintenance

### Update Frequency
- **Monthly:** Review for accuracy
- **On Breaking Changes:** Update immediately
- **New Tools Added:** Document in "Changelog" section

### Versioning
Include version or last-updated date in file:

```txt
Last Updated: 2024-02-15
Version: 1.0.0
```

### Monitoring
Track analytics:
- Number of `/ai.txt` requests
- Referrers (which AI agents)
- Correlation with MCP server installs

---

## A/B Testing Considerations

Test different formats to see what AI agents parse best:

### Variant A: Structured Markdown (Current)
```txt
## Quick Setup

### 1. Install
npx -y @cronicorn/mcp-server
```

### Variant B: Pure Plain Text
```txt
QUICK SETUP

Step 1: Install
Run: npx -y @cronicorn/mcp-server
```

### Variant C: JSON-LD
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Cronicorn",
  "installUrl": "npx -y @cronicorn/mcp-server",
  ...
}
```

**Recommendation:** Start with Variant A (Markdown), iterate based on feedback.

---

## Future Enhancements

### Multi-Language Support
```txt
# Languages: en, es, fr
# See: /ai.txt?lang=es
```

### Tool Capabilities Discovery
```json
{
  "tools": [
    {
      "name": "create_job",
      "schema_url": "https://api.cronicorn.com/mcp/tools/create_job.json"
    }
  ]
}
```

### Interactive Examples
Link to runnable examples:
```txt
Try it now: https://cronicorn.com/playground?example=daily-backup
```

---

## SEO Implications

### robots.txt
Allow crawling:

```txt
# robots.txt
User-agent: *
Allow: /ai.txt
```

### Sitemap
Include in sitemap.xml:

```xml
<url>
  <loc>https://cronicorn.com/ai.txt</loc>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

### Indexing
Add structured data for AI agent directories to index:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebAPI",
  "name": "Cronicorn MCP Integration",
  "url": "https://cronicorn.com/ai.txt"
}
</script>
```

---

## Summary

**File:** `apps/web/public/ai.txt`

**Purpose:** Machine-readable instructions for AI agents

**Contents:**
- Quick setup (NPX + JSON config)
- MCP tool documentation
- OAuth flow explanation
- Example prompts
- Troubleshooting

**Maintenance:** Update monthly, version in changelog

**Validation:** Test with multiple AI agents, track analytics

**Future:** Consider JSON-LD variant, multi-language support
