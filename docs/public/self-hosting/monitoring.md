---
id: self-hosting-monitoring
title: Monitoring
description: Health checks, logging, and observability for self-hosted Cronicorn
sidebar_position: 6
tags:
  - self-hosting
  - monitoring
  - health-checks
  - logging
---

# Monitoring

## Health Checks

### API Health Endpoint

The API exposes a health check at `GET /api/health`:

```bash
curl http://localhost:3333/api/health
```

- **200 OK** — API is healthy and database is reachable
- **503 Service Unavailable** — Database connection failed (2-second timeout)

### Docker Healthchecks

Each service has a Docker healthcheck configured:

| Service | Check | Method |
|---------|-------|--------|
| **db** | `pg_isready` | PostgreSQL readiness probe |
| **api** | `GET /api/health` | HTTP health endpoint |
| **web** | `GET /` | HTTP response check |
| **scheduler** | `pgrep -f 'node'` | Process liveness |
| **ai-planner** | `pgrep -f 'node'` | Process liveness |

Healthcheck timing: `interval: 30s`, `timeout: 5s`, `retries: 3`, `start_period: 30s` for most services. The database uses a faster cycle: `interval: 10s`, `retries: 5` (no start period).

### Checking Status

```bash
# Overview of all services and health status
docker compose ps

# Example output:
# NAME                 STATUS                    PORTS
# cronicorn-db         Up 2 hours (healthy)      5432/tcp
# cronicorn-api        Up 2 hours (healthy)      0.0.0.0:3333->3333/tcp
# cronicorn-scheduler  Up 2 hours (healthy)
# cronicorn-web        Up 2 hours (healthy)
# cronicorn-migrator   Exited (0) 2 hours ago
```

The migrator showing `Exited (0)` is normal — it runs once and exits after applying migrations.

## Logs

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api

# Last 100 lines
docker compose logs --tail=100 api

# Since a specific time
docker compose logs --since="2025-01-15T10:00:00" api
```

### Log Format

The API and workers emit structured JSON logs via [Pino](https://github.com/pinojs/pino):

```json
{
  "level": 30,
  "time": 1705312800000,
  "msg": "Request completed",
  "requestId": "abc-123",
  "userId": "user_456",
  "method": "GET",
  "path": "/api/endpoints",
  "status": 200,
  "duration": 42
}
```

### Key Log Fields

| Field | Description |
|-------|-------------|
| `level` | Pino log level (30=info, 40=warn, 50=error, 60=fatal) |
| `time` | Unix timestamp in milliseconds |
| `msg` | Log message |
| `requestId` | Unique request ID (matches `X-Request-Id` header) |
| `userId` | Authenticated user ID (if applicable) |
| `method` | HTTP method |
| `path` | Request path |
| `status` | HTTP response status code |
| `duration` | Request duration in milliseconds |

### Pretty-Printing Logs

For human-readable logs during debugging:

```bash
docker compose logs api | npx pino-pretty
```

## Request Tracing

Every API request receives a unique `X-Request-Id` header. Use this to trace a request through logs:

```bash
# Get the request ID from a response
curl -v http://localhost:3333/api/health 2>&1 | grep x-request-id

# Search logs for that request
docker compose logs api | grep "abc-123"
```

You can also pass your own request ID:

```bash
curl -H "X-Request-Id: my-trace-123" http://localhost:3333/api/health
```

## Resource Monitoring

### Container Resources

```bash
# Real-time CPU, memory, and network usage
docker stats

# One-shot snapshot
docker stats --no-stream
```

### Disk Usage

```bash
# Check database volume size
du -sh ../files/cronicorndatabasevolume

# Check Docker disk usage
docker system df
```

## Rate Limit Headers

The API returns rate limit information in response headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Seconds until the rate limit window resets |

Monitor these to detect clients approaching rate limits.

## External Alerting

Cronicorn does not include built-in alerting. For production deployments, consider external uptime monitoring:

- **[UptimeRobot](https://uptimerobot.com/)** — Free tier monitors up to 50 URLs
- **[Healthchecks.io](https://healthchecks.io/)** — Cron job monitoring (good for scheduler health)
- **[Better Uptime](https://betterstack.com/better-uptime)** — Incident management with status pages

Point these at your API health endpoint (`GET /api/health`) for basic availability monitoring.
