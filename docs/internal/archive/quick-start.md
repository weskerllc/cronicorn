---
id: quick-start
title: Quick Start Guide
description: Get up and running with Cronicorn in 5 minutes
tags:
  - user
  - essential
sidebar_position: 3
mcp:
  uri: file:///docs/quick-start.md
  mimeType: text/markdown
  priority: 0.9
  lastModified: 2025-11-02T00:00:00Z
---

# Quick Start Guide

Get Cronicorn running locally in 5 minutes.

## Prerequisites

- **Node.js** 24.0 or higher
- **pnpm** 10.0 or higher
- **Docker** (for PostgreSQL)
- **Git**

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/weskerllc/cronicorn.git
cd cronicorn
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start PostgreSQL

```bash
pnpm db
```

This starts a PostgreSQL container using Docker Compose.

### 4. Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and set required variables:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cronicorn"

# API Server
API_PORT=3000
API_HOST=localhost

# JWT Secret (generate a random string)
JWT_SECRET="your-secret-key-here"

# Web App
WEB_URL="http://localhost:3001"
```

### 5. Run Database Migrations

```bash
pnpm db:migrate
```

This creates the necessary database tables.

### 6. Start the Development Environment

```bash
pnpm dev
```

This starts all services in parallel:
- API server at `http://localhost:3000`
- Web dashboard at `http://localhost:3001`
- Scheduler worker (background)

## Create Your First Job

### Using the API

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Job",
    "description": "A test job"
  }'
```

Response:

```json
{
  "id": "job_abc123",
  "name": "My First Job",
  "description": "A test job",
  "status": "active",
  "createdAt": "2025-11-02T12:00:00Z"
}
```

### Add an Endpoint

```bash
curl -X POST http://localhost:3000/jobs/job_abc123/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Health Check",
    "url": "https://httpbin.org/status/200",
    "method": "GET",
    "baselineIntervalMs": 60000,
    "description": "Check service health every minute"
  }'
```

Response:

```json
{
  "id": "ep_xyz789",
  "name": "Health Check",
  "url": "https://httpbin.org/status/200",
  "method": "GET",
  "baselineIntervalMs": 60000,
  "nextRunAt": "2025-11-02T12:01:00Z",
  "status": "active"
}
```

### Monitor Execution

View run history:

```bash
curl http://localhost:3000/endpoints/ep_xyz789/runs
```

Response:

```json
{
  "runs": [
    {
      "id": "run_123",
      "status": "success",
      "startedAt": "2025-11-02T12:01:00Z",
      "finishedAt": "2025-11-02T12:01:00.234Z",
      "durationMs": 234,
      "source": "baseline-interval"
    }
  ]
}
```

## Using the Web Dashboard

Open `http://localhost:3001` in your browser to:

1. **Create jobs** through a visual interface
2. **Manage endpoints** with form validation
3. **View run history** with charts and filters
4. **Monitor health** with real-time status updates

## Using the MCP Server (AI Assistants)

The MCP server allows AI assistants like Claude to manage your jobs:

### 1. Install the MCP Server

```bash
# Already installed with pnpm install
```

### 2. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "node",
      "args": ["/path/to/cronicorn/apps/mcp-server/dist/index.js"],
      "env": {
        "CRONICORN_API_URL": "http://localhost:3000",
        "CRONICORN_WEB_URL": "http://localhost:3001"
      }
    }
  }
}
```

### 3. Authenticate

When you first use the MCP server, it will:
1. Display a device code
2. Prompt you to visit the web URL
3. Wait for you to approve the connection

### 4. Use in Claude

Ask Claude to manage your jobs:

- "Create a job called 'API Monitor' with a health check endpoint"
- "Show me the run history for the health check endpoint"
- "Pause the API Monitor job for the next hour"

## Next Steps

### Learn Core Concepts

- [Core Concepts](./core-concepts.md) - Understand jobs, endpoints, and scheduling
- [Architecture](./architecture.md) - Learn about system design

### Explore Features

- [AI Scheduling](./guides/ai-scheduling.md) - Leverage AI-powered adaptations
- [Monitoring](./guides/monitoring.md) - Set up observability
- [Authentication](./api/authentication.md) - Secure your API

### Deploy to Production

- [Deployment Guide](./advanced/deployment.md) - Production setup
- [Multi-tenancy](./advanced/multi-tenancy.md) - Tenant isolation

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart the database
pnpm db:reset
```

### Port Already in Use

Edit `.env` to change the port:

```bash
API_PORT=3002
```

### Migration Errors

```bash
# Reset and re-run migrations
pnpm db:reset
pnpm db:migrate
```

## Getting Help

- 📖 [Full Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/weskerllc/cronicorn/issues)
- 💬 [Discussions](https://github.com/weskerllc/cronicorn/discussions)

## What's Next?

Now that you have Cronicorn running, explore:

1. **Create multiple endpoints** with different schedules
2. **Test AI hints** by manually adjusting intervals
3. **Monitor execution** through the dashboard
4. **Experiment with constraints** (min/max intervals, timeouts)
5. **Try the MCP server** for AI-powered management
