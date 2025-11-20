# Dynamic Body Templates Guide

Dynamic body templates allow your endpoints to send different request bodies based on real-time data from endpoint responses. This enables powerful workflows like status reporting, data-driven orchestration, and coordinated multi-endpoint systems.

## Quick Start

### Basic Template

Instead of a static body:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

Use a dynamic template:
```json
{
  "status": "{{$.self.latestResponse.status}}",
  "timestamp": "{{$.now}}"
}
```

The scheduler evaluates templates at execution time, filling placeholders with current data.

## Template Syntax

Templates use `{{...}}` delimiters with JSONPath-like expressions:

### Self Data Access

Access this endpoint's latest response:

```json
{
  "health": "{{$.self.latestResponse.health_status}}",
  "load": "{{$.self.latestResponse.current_load}}",
  "errors": "{{$.self.latestResponse.error_count}}"
}
```

**Available fields:**
- `$.self.latestResponse.*` - Latest response data
- `$.self.endpointId` - This endpoint's ID
- `$.self.endpointName` - This endpoint's name

### Sibling Data Access

Access other endpoints in the same job:

```json
{
  "monitoring_status": "{{$.siblings['health-monitor'].latestResponse.status}}",
  "queue_depth": "{{$.siblings['queue-checker'].latestResponse.depth}}",
  "alerts": "{{$.siblings['alert-system'].latestResponse.active_alerts}}"
}
```

**Syntax:** `$.siblings['endpoint-name'].latestResponse.*`

**Note:** Only works if endpoints are in the same job. Returns unchanged template if sibling not found.

### System Values

Access system-provided values:

```json
{
  "reported_at": "{{$.now}}",
  "service_name": "my-service"
}
```

**Available:**
- `$.now` - Current ISO timestamp (e.g., "2025-01-15T10:30:00Z")

### Nested Fields

Access nested response data:

```json
{
  "cpu": "{{$.self.latestResponse.metrics.cpu}}",
  "memory": "{{$.self.latestResponse.metrics.memory}}",
  "region": "{{$.siblings['health-check'].latestResponse.config.region}}"
}
```

### String Interpolation

Combine templates with static text:

```json
{
  "message": "Status is {{$.self.latestResponse.status}} as of {{$.now}}",
  "summary": "Queue has {{$.siblings['queue'].latestResponse.count}} items pending"
}
```

### Type Preservation

Templates preserve JSON types:

```json
{
  "count": "{{$.self.latestResponse.count}}",           // Returns: 42 (number)
  "active": "{{$.self.latestResponse.active}}",         // Returns: true (boolean)
  "status": "{{$.self.latestResponse.status}}",         // Returns: "healthy" (string)
  "metrics": "{{$.self.latestResponse.metrics}}"        // Returns: {...} (object)
}
```

## Common Patterns

### Pattern 1: Status Reporting

**Scenario:** Post system health to monitoring service.

**Template:**
```json
{
  "service": "payment-processor",
  "status": "{{$.self.latestResponse.status}}",
  "response_time_ms": "{{$.self.latestResponse.response_time}}",
  "error_rate": "{{$.self.latestResponse.error_rate}}",
  "timestamp": "{{$.now}}"
}
```

**Response from this endpoint:**
```json
{
  "status": "degraded",
  "response_time": 450,
  "error_rate": 0.05
}
```

**Sent body:**
```json
{
  "service": "payment-processor",
  "status": "degraded",
  "response_time_ms": 450,
  "error_rate": 0.05,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Pattern 2: ETL Coordination

**Scenario:** Data processor checks if upstream fetch is ready.

**Job Structure:**
- `data-fetcher` - Downloads data files
- `data-processor` - Processes downloaded files

**Template (for `data-processor`):**
```json
{
  "action": "process",
  "source_file": "{{$.siblings['data-fetcher'].latestResponse.file_path}}",
  "record_count": "{{$.siblings['data-fetcher'].latestResponse.records}}",
  "checksum": "{{$.siblings['data-fetcher'].latestResponse.checksum}}"
}
```

**Response from `data-fetcher`:**
```json
{
  "file_path": "/data/export_2025-01-15.csv",
  "records": 15000,
  "checksum": "a3f5b8c2",
  "status": "ready"
}
```

**Sent body:**
```json
{
  "action": "process",
  "source_file": "/data/export_2025-01-15.csv",
  "record_count": 15000,
  "checksum": "a3f5b8c2"
}
```

### Pattern 3: Multi-Service Coordination

**Scenario:** Deployment orchestrator coordinates across multiple services.

**Job Structure:**
- `build-service` - Builds artifacts
- `test-service` - Runs tests
- `deploy-service` - Deploys to production

**Template (for `deploy-service`):**
```json
{
  "deploy": {
    "artifact": "{{$.siblings['build-service'].latestResponse.artifact_url}}",
    "version": "{{$.siblings['build-service'].latestResponse.version}}",
    "test_status": "{{$.siblings['test-service'].latestResponse.status}}",
    "test_coverage": "{{$.siblings['test-service'].latestResponse.coverage}}"
  },
  "timestamp": "{{$.now}}"
}
```

### Pattern 4: Dynamic Configuration Updates

**Scenario:** Update remote configuration based on observed metrics.

**Template:**
```json
{
  "config_update": {
    "max_connections": "{{$.self.latestResponse.recommended_max_connections}}",
    "timeout_ms": "{{$.self.latestResponse.recommended_timeout}}",
    "reason": "Adjusting based on current load: {{$.self.latestResponse.current_load}}"
  }
}
```

## AI Integration

The AI can observe your templates and override values when needed using the `propose_body_values` tool.

### How It Works

1. **You define the template structure** (what fields to send)
2. **AI observes response data** (from this endpoint or siblings)
3. **AI decides when to override** (e.g., during critical situations)
4. **AI sets specific values** (bypasses template for this execution)

### Example: Escalation Override

**Your Template:**
```json
{
  "status": "{{$.self.latestResponse.status}}",
  "action": "monitor"
}
```

**Normal Operation:**
- AI lets template evaluate normally
- Sends `{"status": "healthy", "action": "monitor"}`

**Critical Situation:**
- AI sees error rate > 50%
- AI calls `propose_body_values`:
  ```json
  {
    "bodyValues": {
      "status": "critical",
      "action": "page_on_call",
      "escalation_reason": "Error rate 62% - exceeds 50% threshold"
    },
    "ttlMinutes": 15,
    "reason": "Escalating to on-call due to high error rate"
  }
  ```
- Next execution uses AI values instead of template
- After 15 minutes, AI hint expires and template resumes

## Edge Cases & Fallbacks

### Missing Fields

If a template references missing data, it returns the template unchanged:

**Template:**
```json
{
  "value": "{{$.self.latestResponse.nonexistent}}"
}
```

**Sent body (if field missing):**
```json
{
  "value": "{{$.self.latestResponse.nonexistent}}"
}
```

**Best practice:** Have endpoint return default values or check responses before setting templates.

### Missing Siblings

If a sibling endpoint doesn't exist or hasn't run yet:

**Template:**
```json
{
  "data": "{{$.siblings['nonexistent'].latestResponse.value}}"
}
```

**Sent body:**
```json
{
  "data": "{{$.siblings['nonexistent'].latestResponse.value}}"
}
```

**Best practice:** Ensure sibling endpoints exist and have executed at least once.

### Evaluation Errors

If template evaluation fails entirely:

1. Error is logged in scheduler
2. Falls back to static `bodyJson` field
3. Execution continues (non-blocking)

## Resolution Priority

Bodies are resolved in this order:

1. **AI Body Hint** (if set and not expired)
   - AI has explicitly set specific values
   - Bypasses template evaluation
   - Auto-expires after TTL

2. **Body Template** (if configured)
   - Evaluates template with current context
   - Fetches latest responses as needed
   - Falls through on evaluation errors

3. **Static bodyJson** (fallback)
   - Original static body field
   - Backward compatible
   - Always works

## Best Practices

### DO

✅ **Start simple** - Use templates for basic field substitution first

✅ **Document your templates** - Use endpoint description to explain what data is needed

✅ **Test with static data** - Verify template structure before adding dynamic values

✅ **Group related endpoints** - Use jobs to organize endpoints that coordinate

✅ **Provide defaults** - Ensure endpoints return values for all template fields

### DON'T

❌ **Don't use templates for complex logic** - Let AI handle complex decisions via `propose_body_values`

❌ **Don't nest too deeply** - Keep templates readable (max 3-4 levels)

❌ **Don't reference unstable fields** - Template fields should be consistently present

❌ **Don't over-template** - Use static values for fields that never change

## Troubleshooting

### Template Not Evaluating

**Problem:** Body sent contains `{{...}}` literals

**Causes:**
1. Referenced field doesn't exist in response
2. Sibling endpoint hasn't executed yet
3. Syntax error in template expression

**Solutions:**
- Check endpoint responses contain expected fields
- Ensure sibling endpoints have run at least once
- Verify template syntax (use examples as reference)

### Wrong Values Sent

**Problem:** Unexpected values in sent body

**Causes:**
1. AI override active (check AI hint expiration)
2. Referencing wrong sibling endpoint
3. Response structure changed

**Solutions:**
- Check run history for AI reasoning
- Verify sibling endpoint names (case-sensitive)
- Update templates when response schemas change

### Stale Data

**Problem:** Old values sent instead of current

**Causes:**
1. Endpoint not executing frequently enough
2. Template references sibling that runs infrequently

**Solutions:**
- Increase endpoint execution frequency
- Ensure sibling endpoints run before this one
- Consider using AI hints for time-critical values

## API Integration (Coming Soon)

These features are planned for the next phase:

- API endpoints for template CRUD operations
- UI template editor with syntax highlighting  
- Template validation and preview
- Resolved body history in run details

## Learn More

- [ADR-0050: Dynamic JSON Body Templates](../../.adr/0050-dynamic-json-body-templates.md) - Technical implementation details
- [AI Tools Documentation](./ai-tools.md) - How AI uses `propose_body_values`
- [Endpoint Orchestration](./endpoint-orchestration.md) - Coordinating multiple endpoints
