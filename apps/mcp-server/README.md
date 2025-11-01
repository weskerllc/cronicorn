# Cronicorn MCP Server

Model Context Protocol server that enables AI agents to manage cron jobs through Cronicorn.

## Overview

This MCP server provides tools for AI assistants (like Claude Desktop, Cline, etc.) to:
- Create and manage cron jobs
- List existing jobs and their schedules
- Pause/unpause jobs
- View job execution history

Authentication uses OAuth 2.0 Device Authorization Grant (RFC 8628) to securely connect to your Cronicorn account.

## Installation

### Published Package (Recommended)

```bash
npm install -g @cronicorn/mcp-server
# or
pnpm add -g @cronicorn/mcp-server
```

### From Source (Development)

```bash
# From monorepo root
pnpm install
pnpm --filter @cronicorn/mcp-server build

# Link globally (optional)
cd apps/mcp-server
pnpm link --global
```

## Usage

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "cronicorn-mcp"
    }
  }
}
```

### First Run - OAuth Device Flow

On first run, the server will:

1. Display a device code and user code
2. Open your browser to https://app.cronicorn.com/device/approve
3. Enter the user code and approve access
4. Store credentials securely in `~/.cronicorn/credentials.json`

Subsequent runs will use the stored access token automatically.

## Available Tools

### `create_job`

Create a new cron job.

**Parameters:**
- `name` (string, required): Job name
- `endpoint` (object, required):
  - `url` (string): HTTP endpoint URL
  - `method` (string): HTTP method (GET, POST, etc.)
  - `headers` (object, optional): HTTP headers
  - `body` (string, optional): Request body
- `schedule` (string, required): Cron expression (e.g., "0 9 * * *")
- `timezone` (string, optional): IANA timezone (e.g., "America/New_York")

**Example:**
```
Please create a job that checks my website health every 5 minutes
```

### `list_jobs`

List all jobs for the authenticated user.

**Parameters:**
- `status` (string, optional): Filter by status (active, paused, all)

**Example:**
```
Show me all my active cron jobs
```

### `pause_job`

Pause or unpause a job.

**Parameters:**
- `job_id` (string, required): Job ID
- `paused` (boolean, required): true to pause, false to unpause

**Example:**
```
Pause the job named "website-health-check"
```

### `get_job_history`

Get execution history for a job.

**Parameters:**
- `job_id` (string, required): Job ID
- `limit` (number, optional): Number of recent runs to return (default: 10)

**Example:**
```
Show me the last 5 runs of my backup job
```

## Configuration

### Credentials Storage

Credentials are stored in `~/.cronicorn/credentials.json` with permissions `0600` (owner read/write only).

**File structure:**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1234567890000
}
```

### Environment Variables

- `CRONICORN_API_URL`: Override API base URL (default: `https://api.cronicorn.com`)
- `CRONICORN_WEB_URL`: Override web UI URL (default: `https://app.cronicorn.com`)

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm watch

# Type check
pnpm typecheck
```

## Publishing

The MCP server is published as a **bundled package** - all dependencies (including `@cronicorn/api-contracts`) are bundled into a single executable. See [BUNDLING.md](./BUNDLING.md) for technical details.

### Release Workflow

```bash
# 1. Update version
cd apps/mcp-server
npm version patch|minor|major

# 2. Build the bundle
pnpm build

# 3. Verify bundle contents
pnpm pack
tar -tzf cronicorn-mcp-server-*.tgz

# 4. Publish to npm
pnpm publish --access public

# 5. Tag and push
git add package.json
git commit -m "chore(mcp-server): release v0.1.x"
git tag mcp-server-v0.1.x
git push --follow-tags
```

### What Gets Published

- `dist/index.js` (470KB bundled executable)
- `dist/index.js.map` (source maps)
- `package.json`
- `README.md`

**Note**: Only production dependency is `@modelcontextprotocol/sdk` - everything else is bundled.

## Security

- OAuth 2.0 Device Authorization Grant for secure authentication
- Credentials stored locally with strict file permissions
- No API keys or secrets stored in server code
- Uses standard MCP stdio transport (no network exposure)

## Troubleshooting

### "No credentials found" error

Delete `~/.cronicorn/credentials.json` and re-authenticate.

### Browser doesn't open automatically

Manually visit the URL shown in the terminal and enter the user code.

### "Invalid grant" error

Your access token may have expired. Delete credentials and re-authenticate:

```bash
rm ~/.cronicorn/credentials.json
```

## License

MIT
