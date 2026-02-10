---
id: quick-start
title: Quick Start Guide
description: Create your first scheduled job in 5 minutes
tags:
  - user
  - essential
sidebar_position: 3
mcp:
  uri: file:///docs/quick-start.md
  mimeType: text/markdown
  priority: 0.90
  lastModified: 2026-02-03T00:00:00Z
---

# Quick Start Guide

Create your first scheduled job and start monitoring executions.

> **Note**: This guide is for using Cronicorn as a hosted service. If you're self-hosting, see the [Self-Hosting Documentation](./self-hosting/index.md).

## 1. Sign Up

1. Visit [https://cronicorn.com](https://cronicorn.com)
2. Click **Sign in with GitHub**
3. Authorize the application

## 2. Create Your First Job

Jobs group related endpoints together. Let's create one for API monitoring:

1. Click **Create Job**
2. Fill in the details:
   - **Name**: `API Health Checks`
   - **Description**: `Monitor our API endpoints`
3. Click **Create**

## 3. Add an Endpoint

Now let's add an HTTP endpoint to monitor:

1. Click on your newly created job
2. Click **Add Endpoint**
3. Fill in:
   - **Name**: `Main API Health`
   - **URL**: `https://api.yourapp.com/health`
   - **Method**: `GET`
   - **Baseline Schedule**: Choose either:
     - **Cron**: `*/5 * * * *` (every 5 minutes)
     - **Interval**: `300000` (milliseconds = 5 minutes)

4. **(Optional but recommended)** Add a description to guide AI behavior:
   - **Description**: `Monitors API health. Poll more frequently when status shows errors or latency is high. Return to baseline when metrics normalize.`

5. **(Optional)** Add safety constraints:
   - **Min Interval**: `30000` (30 seconds - prevents over-polling)
   - **Max Interval**: `900000` (15 minutes - ensures regular checks)

6. Click **Add Endpoint**

> **Tip**: The description tells the AI when to adapt. Without a description, AI uses only response data and execution history. With a good description, you can express specific adaptation rules in natural language.

## 4. View Execution History

Your endpoint will start executing automatically. To monitor it:

1. Click on the endpoint name
2. View the **Runs** tab to see:
   - Execution timestamps
   - Success/failure status
   - Response time
   - Error messages (if any)

## 5. Enable AI Adaptation (Optional)

Want AI to optimize your schedule automatically?

1. Navigate to **Settings** in the top navigation
2. Find the **AI Features** section
3. Toggle **Enable AI Scheduling**
4. Your endpoints will now adapt based on performance patterns

**How AI helps:**
- Increases frequency when errors detected
- Backs off when everything is stable
- Always respects your min/max constraints
- All hints expire automatically (TTL)

## Common Patterns

### API Health Check

Monitor an API endpoint with adaptive frequency:

```
Name: API Health Check
URL: https://api.example.com/health
Method: GET
Baseline: Every 5 minutes (300000ms)
Min Interval: 30 seconds (prevents rate limit issues)
Max Interval: 15 minutes (ensures timely detection)
```

**With AI enabled:**
- Normal state: Runs every 5 minutes
- Errors detected: Increases to every 30 seconds
- All healthy: Backs off to every 15 minutes

### Data Sync

Synchronize data between systems:

```
Name: User Sync
URL: https://api.example.com/sync/users
Method: POST
Body: {"lastSyncTime": "{{lastRunAt}}"}
Baseline: Every hour (3600000ms)
Max Interval: 2 hours (ensures freshness)
```

### Daily Cleanup

Run maintenance tasks on a schedule:

```
Name: Database Cleanup
URL: https://api.example.com/admin/cleanup
Method: POST
Baseline: Daily at 2am (cron: "0 2 * * *")
Timeout: 300000ms (5 minutes)
```

## Using API Keys

For programmatic access, create API keys:

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Give it a name and copy the key (shown only once!)
4. Use in your requests:

```bash
curl -X GET https://cronicorn.com/api/jobs \
  -H "x-api-key: cron_abc123..."
```

See the [API Reference](https://cronicorn.com/docs/api) for all available endpoints.

## Using with AI Assistants

Cronicorn provides an MCP server for AI assistants like Claude:

### Installation

```bash
npm install -g @cronicorn/mcp-server
```

### Configuration

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "cronicorn-mcp"
    }
  }
}
```

### First Run

The MCP server will:

1. Display a device code
2. Open your browser to approve access
3. Store credentials securely

Then ask Claude to manage your jobs:

- "Create a health check endpoint for api.example.com"
- "Show me the run history for my API health check"
- "Pause all endpoints for the next hour"

## Troubleshooting

### Endpoint Not Running

**Check the endpoint status:**
1. Open the endpoint details
2. Look for **Status** field
3. If "Paused", click **Resume**

**Check execution history:**
1. View the **Runs** tab
2. Look for error messages
3. Check if the URL is accessible

### Authentication Errors

**For HTTPS endpoints with auth:**
1. Add authentication headers in the endpoint configuration
2. Common headers:
   - `Authorization: Bearer <token>`
   - `x-api-key: <key>`

### Timeout Errors

If requests are timing out:

1. Edit the endpoint
2. Increase **Timeout** (default is 30 seconds)
3. Consider if your API needs optimization

### Rate Limit Errors

If you're hitting rate limits:

1. Increase **Min Interval** (e.g., from 30s to 60s)
2. Adjust **Baseline Schedule** to be less frequent
3. Let AI adapt (it will back off automatically)

---

## See Also

- **[Core Concepts](./core-concepts.md)** - Understanding jobs, endpoints, and scheduling
- **[API Reference](./api-reference.md)** - Programmatic access to Cronicorn
- **[Troubleshooting](./troubleshooting.md)** - Diagnose and fix common issues
- **[MCP Server](./mcp-server.md)** - Manage jobs via AI assistant
