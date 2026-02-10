# Cronicorn MCP Server

[![npm version](https://badge.fury.io/js/@cronicorn%2Fmcp-server.svg)](https://www.npmjs.com/package/@cronicorn/mcp-server)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-blue)](https://registry.modelcontextprotocol.io/servers/io.github.weskerllc/cronicorn-mcp-server)
[![Smithery](https://img.shields.io/badge/Smithery-listed-green)](https://smithery.ai/server/@cronicorn/mcp-server)

Manage cron jobs by talking to your AI assistant.

```
You: "Check my API health every 5 minutes"
AI: ✅ Created job with health check running every 5 minutes.

You: "Help me migrate my app's scheduling to Cronicorn"
AI: I found 3 cron jobs in your codebase. Here's how to move each one...

You: "Give me 5 profitable SaaS ideas built on Cronicorn"
AI: Based on Cronicorn's adaptive scheduling and AI capabilities...
```

Works with Claude, GitHub Copilot, Cursor, Cline, Continue, and any MCP-compatible assistant.

## Setup

<details open>
<summary><strong>Claude Code (CLI)</strong></summary>

```bash
claude mcp add cronicorn -- npx -y @cronicorn/mcp-server
```
</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"]
    }
  }
}
```
</details>

<details>
<summary><strong>VS Code / GitHub Copilot</strong></summary>

In VS Code settings (JSON):

```json
{
  "github.copilot.chat.mcp.servers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"]
    }
  }
}
```

Or create `~/.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"]
    }
  }
}
```
</details>

<details>
<summary><strong>Cursor / Cline / Continue</strong></summary>

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"]
    }
  }
}
```
</details>

## Authentication

On first run, the server starts OAuth device flow:

1. Opens browser to `https://cronicorn.com/device/approve`
2. Enter the displayed user code
3. Credentials stored in `~/.cronicorn/credentials.json`

Tokens are valid for 30 days. Re-authentication is automatic when expired.

## Tools

### Jobs
| Tool | Description |
|------|-------------|
| `createJob` | Create a new job container |
| `getJob` | Get job details |
| `listJobs` | List all jobs |
| `updateJob` | Update job properties |
| `archiveJob` | Archive a job (soft delete) |
| `pauseJob` | Pause job execution |
| `resumeJob` | Resume paused job |

### Endpoints
| Tool | Description |
|------|-------------|
| `addEndpoint` | Add HTTP endpoint to a job |
| `getEndpoint` | Get endpoint details |
| `listEndpoints` | List endpoints for a job |
| `updateEndpoint` | Update endpoint config |
| `archiveEndpoint` | Archive an endpoint |
| `pauseResumeEndpoint` | Pause/unpause endpoint |

### AI Scheduling
| Tool | Description |
|------|-------------|
| `applyIntervalHint` | Suggest new interval |
| `scheduleOneShot` | Trigger immediate run |
| `clearHints` | Remove pending hints |
| `resetFailures` | Reset failure count |

### Monitoring
| Tool | Description |
|------|-------------|
| `listEndpointRuns` | Get execution history |
| `getRunDetails` | Get specific run details |
| `getEndpointHealth` | Get health summary |
| `getDashboardStats` | Get account-wide stats |

## Documentation Resources

The server bundles comprehensive docs as MCP resources — concepts, recipes, API reference, troubleshooting, and self-hosting guides. AI assistants read these automatically to answer questions about Cronicorn.

For conversational examples and detailed tool call walkthroughs, see the [full docs](https://docs.cronicorn.com/mcp-server).

## Updating

Use `@latest` tag to always get the newest version:

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server@latest"]
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CRONICORN_API_URL` | `https://cronicorn.com/api` | API base URL |
| `CRONICORN_WEB_URL` | `https://cronicorn.com` | Web UI URL |

## Development

```bash
# From monorepo root
pnpm install
pnpm --filter @cronicorn/mcp-server build
pnpm --filter @cronicorn/mcp-server dev
```

## Troubleshooting

**"No credentials found"** - Delete `~/.cronicorn/credentials.json` and re-authenticate.

**Browser doesn't open** - Manually visit the URL shown in terminal.

**"Invalid grant" error** - Token revoked. Delete credentials and re-authenticate.

## License

[FSL-1.1-MIT](../../LICENSE)
