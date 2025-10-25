# AI Planner Worker

**Analyzes endpoint execution patterns and writes adaptive scheduling hints to the database.**

This worker runs independently from the scheduler worker and communicates via the database as an integration point.

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│  Scheduler Worker   │         │  AI Planner Worker  │
│  (apps/scheduler)   │         │  (apps/ai-planner)  │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           │ writes runs                   │ reads runs
           │ reads hints                   │ writes hints
           │                               │
           └───────────┬───────────────────┘
                       │
                ┌──────▼──────┐
                │  Database   │
                └─────────────┘
```

## Key Features

- **Decoupled**: Runs independently - scheduler works without AI
- **Graceful degradation**: If AI worker crashes, scheduler continues with baseline intervals
- **Cost control**: Adjustable analysis frequency and model selection
- **Batch analysis**: Processes multiple endpoints per cycle
- **Lookback window**: Only analyzes endpoints with recent activity

## How It Works

1. **Discovery**: Queries database for endpoints with runs in last N minutes
2. **Analysis**: For each endpoint:
   - Fetches endpoint state and health summary (last 24 hours)
   - Builds context prompt with metrics
   - Invokes AI SDK with 3 tools: `propose_interval`, `propose_next_time`, `pause_until`
3. **AI Decision**: AI analyzes patterns and may call tools to write hints
4. **Persistence**: Tools write hints to database with TTL
5. **Scheduler Pickup**: Scheduler reads hints on next execution (via governor)

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | *required* | PostgreSQL connection string |
| `OPENAI_API_KEY` | *required* | OpenAI API key for AI SDK |
| `AI_MODEL` | `gpt-4o-mini` | OpenAI model (gpt-4o-mini recommended for cost) |
| `AI_ANALYSIS_INTERVAL_MS` | `300000` (5 min) | How often to run analysis |
| `AI_LOOKBACK_MINUTES` | `5` | Only analyze endpoints with runs in last N min |
| `AI_MAX_TOKENS` | `500` | Max tokens per AI response (keep concise) |
| `AI_TEMPERATURE` | `0.7` | AI creativity (0-2) |

## Running Locally

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:6666/db"
export OPENAI_API_KEY="sk-..."

# Start worker
pnpm --filter @cronicorn/ai-planner-app start
```

## Running with Docker Compose

```bash
# Start database + scheduler + AI planner
docker compose up

# Or start only AI planner (requires db + scheduler already running)
docker compose up ai-planner
```

## AI Tools

The AI has access to 3 endpoint-scoped tools:

### 1. `propose_interval`
Adjust execution frequency based on patterns.

**When to use:**
- High failure rate → decrease frequency (give service time to recover)
- Stable performance + low frequency → increase frequency (optimize responsiveness)

**Example:**
```typescript
propose_interval({
  intervalMs: 120000, // 2 minutes
  ttlMinutes: 60,
  reason: "Failure rate 40% - reducing frequency to allow recovery"
})
```

### 2. `propose_next_time`
Schedule one-shot execution at specific time.

**When to use:**
- Failure streak ≥3 → run immediately to investigate
- Off-peak optimization → defer to low-traffic hours

**Example:**
```typescript
propose_next_time({
  nextRunAtIso: "2025-10-15T10:00:00Z",
  ttlMinutes: 30,
  reason: "3 consecutive failures - scheduling immediate investigation"
})
```

### 3. `pause_until`
Pause execution temporarily or indefinitely.

**When to use:**
- Persistent failures → pause until manual intervention
- Maintenance window → pause during known downtime

**Example:**
```typescript
pause_until({
  untilIso: "2025-10-15T12:00:00Z",
  reason: "High failure rate - pausing for 1 hour"
})
```

## Monitoring

### Logs

Structured JSON logs for easy parsing:

```json
{
  "timestamp": "2025-10-15T10:00:00Z",
  "level": "info",
  "message": "Starting analysis cycle",
  "endpointCount": 12,
  "since": "2025-10-15T09:55:00Z"
}
```

### Key Metrics to Track

- **Endpoints analyzed per cycle**
- **Analysis duration** (should be <30s for 10-20 endpoints)
- **AI hint write rate** (% of analyses that result in hints)
- **Hint effectiveness** (did performance improve after hint?)

### Health Check

```sql
-- Check if AI Planner is running (recent hints written)
SELECT COUNT(*) 
FROM job_endpoints 
WHERE ai_hint_expires_at > NOW() - INTERVAL '10 minutes';
```

## Cost Optimization

### Model Selection

| Model | Input Cost | Output Cost | Speed | Recommendation |
|---|---|---|---|---|
| `gpt-4o-mini` | $0.15/1M | $0.60/1M | Fast | ✅ **Recommended for MVP** |
| `gpt-4o` | $2.50/1M | $10.00/1M | Faster | Use if quality issues |
| `gpt-3.5-turbo` | $0.50/1M | $1.50/1M | Slowest | Deprecated soon |

### Cost Estimates

**Assumptions:**
- 100 endpoints analyzed/day
- ~300 input tokens/endpoint
- ~100 output tokens/endpoint
- gpt-4o-mini pricing

**Daily cost:** ~$0.012 (negligible)  
**Monthly cost:** ~$0.36

**With 1000 endpoints/day:** ~$3.60/month

### Reducing Costs

1. **Increase analysis interval**: 5min → 15min (3x reduction)
2. **Tighten lookback window**: 5min → 2min (fewer endpoints analyzed)
3. **Skip stable endpoints**: Only analyze if health changed
4. **Batch prompts**: Analyze multiple endpoints per AI call (future optimization)

## Troubleshooting

### AI Planner not running

**Check:** `OPENAI_API_KEY` is set
```bash
echo $OPENAI_API_KEY  # Should output your key
```

**Solution:** Set environment variable and restart

### No hints being written

**Check:** Are endpoints being analyzed?
```bash
docker logs cronicorn-ai-planner | grep "Starting analysis cycle"
```

**Possible causes:**
- No endpoints with recent runs (check lookback window)
- AI determined no adjustments needed (normal)
- OpenAI API errors (check logs for `[AI]` prefix)

### High OpenAI costs

**Check:** Analysis frequency and endpoint count
```bash
docker logs cronicorn-ai-planner | grep "Analysis cycle complete"
```

**Solution:** Increase `AI_ANALYSIS_INTERVAL_MS` or tighten lookback window

### Scheduler not picking up hints

**Check:** Are hints being written with future expiry?
```sql
SELECT * FROM job_endpoints 
WHERE ai_hint_expires_at IS NOT NULL 
  AND ai_hint_expires_at > NOW();
```

**Solution:** Verify scheduler is running and re-reading endpoints after execution

## Development

### Adding New Tools

1. Define tool in `packages/services/src/scheduling/ai-tools.ts`
2. Update prompt in `packages/services/src/scheduling/ai-planner.ts`
3. Test with `apps/test-ai` before deploying

### Testing AI Analysis

```bash
# Use test-ai app to validate AI SDK integration
cd apps/test-ai
OPENAI_API_KEY=sk-... pnpm start
```

## References

- [Architecture Guide](../../.github/instructions/architecture.instructions.md)
- [AI Planner Service](../../packages/services/src/scheduling/ai-planner.ts)
- [AI Tools](../../packages/services/src/scheduling/ai-tools.ts)
- [Tech Debt Log](../../docs/_RUNNING_TECH_DEBT.md)
