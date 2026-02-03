# Cronicorn MCP Server

[![npm version](https://badge.fury.io/js/@cronicorn%2Fmcp-server.svg)](https://www.npmjs.com/package/@cronicorn/mcp-server)

MCP server for managing cron jobs through AI assistants (Claude, Copilot, Cursor, etc.).

## Installation

```bash
npm install -g @cronicorn/mcp-server
```

## Configuration

Add to your AI assistant's MCP config:

<details open>
<summary><strong>Claude Desktop</strong></summary>

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "cronicorn-mcp"
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
      "command": "cronicorn-mcp"
    }
  }
}
```

Or create `~/.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "cronicorn-mcp"
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
      "command": "cronicorn-mcp"
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

## Prompts

Interactive guides available via slash commands:

| Prompt | Description |
|--------|-------------|
| `/setup-first-job` | Step-by-step guide for creating your first job |
| `/troubleshoot-failures` | Debug failing endpoints |

## Updating

```bash
# Check version
cronicorn-mcp --version

# Update global install
npm update -g @cronicorn/mcp-server
```

Or use `@latest` in config for automatic updates:

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
| `CRONICORN_API_URL` | `https://api.cronicorn.com` | API base URL |
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

MIT
