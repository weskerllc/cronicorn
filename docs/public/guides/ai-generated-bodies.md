# AI-Generated Request Bodies

AI can dynamically generate request bodies for your endpoints based on observations from response data. This enables intelligent, data-driven API interactions without hardcoding values.

## Quick Start

Instead of a static body:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

Provide a **JSON Schema** that describes what the body should contain:
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["healthy", "degraded", "critical"],
      "description": "System health. Use 'critical' if error_rate > 50%, 'degraded' if > 10%, else 'healthy'. Check self.latestResponse.error_rate"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Current timestamp in ISO 8601 format"
    }
  },
  "required": ["status", "timestamp"]
}
```

The AI observes your endpoint responses, interprets the schema descriptions, and generates appropriate values.

## How It Works

1. **You provide a JSON Schema** (`bodySchema`) describing the structure
2. **AI observes endpoint responses** (from this endpoint and siblings)
3. **AI reads field descriptions** to understand what values to generate
4. **AI generates a body** that conforms to your schema
5. **Request is sent** with the AI-generated body

## JSON Schema Basics

### Simple String Field

```json
{
  "status": {
    "type": "string",
    "description": "Current status of the system"
  }
}
```

### Enum (Limited Choices)

```json
{
  "priority": {
    "type": "string",
    "enum": ["low", "normal", "high", "critical"],
    "description": "Priority level based on alert count"
  }
}
```

### Number Field

```json
{
  "error_count": {
    "type": "integer",
    "description": "Total number of errors from last run"
  }
}
```

### Required vs Optional

```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string" },
    "optional_field": { "type": "string" }
  },
  "required": ["status"]  // Only status is mandatory
}
```

## Writing Effective Descriptions

The `description` field is crucial - it tells the AI **what** to generate and **where** to get the data.

### ✅ Good Descriptions

**Be specific about the source:**
```json
{
  "error_rate": {
    "type": "number",
    "description": "Error rate percentage from self.latestResponse.error_rate"
  }
}
```

**Include conditional logic:**
```json
{
  "status": {
    "type": "string",
    "enum": ["healthy", "unhealthy"],
    "description": "Use 'unhealthy' if self.latestResponse.error_count > 100, otherwise 'healthy'"
  }
}
```

**Reference sibling endpoints:**
```json
{
  "queue_depth": {
    "type": "integer",
    "description": "Current queue size from siblings['queue-monitor'].latestResponse.depth"
  }
}
```

### ❌ Poor Descriptions

**Too vague:**
```json
{
  "status": {
    "type": "string",
    "description": "The status"  // AI doesn't know what this means
  }
}
```

**No source specified:**
```json
{
  "error_count": {
    "type": "integer",
    "description": "Number of errors"  // AI doesn't know where to get this
  }
}
```

## Accessing Response Data

AI can access response data from two sources:

### 1. Self (This Endpoint)

Reference the latest response from this endpoint:

```json
{
  "description": "Get value from self.latestResponse.field_name"
}
```

**Example:**
```json
{
  "cpu_usage": {
    "type": "number",
    "description": "CPU percentage from self.latestResponse.metrics.cpu"
  }
}
```

### 2. Siblings (Other Endpoints in Same Job)

Reference responses from other endpoints in the same job:

```json
{
  "description": "Get value from siblings['endpoint-name'].latestResponse.field_name"
}
```

**Example:**
```json
{
  "monitoring_status": {
    "type": "string",
    "description": "Status from siblings['health-monitor'].latestResponse.status"
  }
}
```

### 3. System Values

AI knows certain system values:

```json
{
  "timestamp": {
    "type": "string",
    "format": "date-time",
    "description": "Current timestamp in ISO 8601 format"
  }
}
```

## Common Patterns

### Pattern 1: Status Reporting

**Scenario:** Report system health to monitoring service

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "service": {
      "type": "string",
      "const": "payment-processor",
      "description": "Fixed service name"
    },
    "status": {
      "type": "string",
      "enum": ["healthy", "degraded", "critical"],
      "description": "Health status: 'critical' if self.latestResponse.error_rate > 0.20, 'degraded' if > 0.05, else 'healthy'"
    },
    "error_count": {
      "type": "integer",
      "description": "Total errors from self.latestResponse.errors"
    },
    "response_time_ms": {
      "type": "integer",
      "description": "Average response time from self.latestResponse.response_time"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": ["service", "status", "error_count", "timestamp"]
}
```

**AI observes:** `self.latestResponse = { error_rate: 0.15, errors: 42, response_time: 450 }`

**AI generates:**
```json
{
  "service": "payment-processor",
  "status": "degraded",
  "error_count": 42,
  "response_time_ms": 450,
  "timestamp": "2025-11-20T10:30:00Z"
}
```

### Pattern 2: ETL Coordination

**Scenario:** Process data after upstream fetch completes

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "const": "process"
    },
    "source_file": {
      "type": "string",
      "description": "File path from siblings['data-fetcher'].latestResponse.file_path"
    },
    "record_count": {
      "type": "integer",
      "description": "Number of records from siblings['data-fetcher'].latestResponse.records"
    },
    "checksum": {
      "type": "string",
      "description": "File checksum from siblings['data-fetcher'].latestResponse.checksum"
    }
  },
  "required": ["action", "source_file", "record_count", "checksum"]
}
```

### Pattern 3: Conditional Actions

**Scenario:** Different actions based on observed conditions

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": ["wait", "scale_up", "scale_down", "alert"],
      "description": "Action to take: 'scale_up' if self.latestResponse.queue_depth > 1000, 'scale_down' if < 100, 'alert' if errors > 50, else 'wait'"
    },
    "reason": {
      "type": "string",
      "description": "Brief explanation of why this action was chosen"
    }
  },
  "required": ["action", "reason"]
}
```

### Pattern 4: Multi-Service Coordination

**Scenario:** Deployment orchestrator using data from multiple services

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "deploy": {
      "type": "object",
      "properties": {
        "artifact": {
          "type": "string",
          "description": "Artifact URL from siblings['build-service'].latestResponse.artifact_url"
        },
        "version": {
          "type": "string",
          "description": "Version from siblings['build-service'].latestResponse.version"
        },
        "test_passed": {
          "type": "boolean",
          "description": "true if siblings['test-service'].latestResponse.status === 'passed'"
        },
        "test_coverage": {
          "type": "number",
          "description": "Coverage from siblings['test-service'].latestResponse.coverage"
        }
      },
      "required": ["artifact", "version", "test_passed"]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": ["deploy", "timestamp"]
}
```

## Advanced Features

### Nested Objects

```json
{
  "type": "object",
  "properties": {
    "metadata": {
      "type": "object",
      "properties": {
        "source": {
          "type": "string",
          "description": "Data source identifier"
        },
        "version": {
          "type": "string",
          "description": "API version"
        }
      }
    }
  }
}
```

### Arrays

```json
{
  "alerts": {
    "type": "array",
    "items": {
      "type": "string",
      "description": "Alert messages from self.latestResponse.alerts array"
    }
  }
}
```

### Const Values

Use `const` for fixed values:

```json
{
  "api_version": {
    "type": "string",
    "const": "v2",
    "description": "API version (always v2)"
  }
}
```

## How AI Decides

The AI follows this process:

1. **Read the schema** - Understand required structure and types
2. **Read descriptions** - Understand where to get data and what logic to apply
3. **Query response data** - Fetch latest responses from self and siblings
4. **Apply logic** - Follow conditional rules in descriptions
5. **Generate body** - Create a valid JSON object conforming to schema
6. **Validate** - Ensure generated body matches schema
7. **Store with TTL** - Save generated body with expiration time

## Validation

The AI validates the generated body against your schema:

**Type checking:**
- Strings must be strings
- Numbers must be numbers
- Enums must match allowed values

**Required fields:**
- All fields in `required` array must be present

**Format validation:**
- `date-time` must be ISO 8601
- `email` must be valid email
- etc.

## Troubleshooting

### Problem: AI Generates Wrong Values

**Cause:** Vague or missing descriptions

**Solution:** Be more specific:
```json
// ❌ Vague
"status": {
  "description": "The status"
}

// ✅ Specific
"status": {
  "description": "Use 'critical' if self.latestResponse.error_rate > 0.5, 'degraded' if > 0.1, else 'healthy'"
}
```

### Problem: Missing Data

**Cause:** Referenced endpoint hasn't run yet or field doesn't exist

**Solution:** 
- Ensure sibling endpoints run before this one
- Check that response fields exist
- Provide fallback instructions in description:

```json
{
  "priority": {
    "type": "string",
    "description": "Priority from siblings['monitor'].latestResponse.priority, or 'normal' if not available"
  }
}
```

### Problem: Body Not Generated

**Cause:** AI not active or bodySchema not set

**Solution:**
- Verify AI planner is running
- Check that `bodySchema` is configured
- Ensure endpoint has `jobId` (required for sibling access)

## Best Practices

### DO

✅ **Write clear, detailed descriptions** - AI relies on these

✅ **Test with static bodies first** - Verify endpoint works before adding AI

✅ **Group related endpoints** - Use jobs for coordination

✅ **Provide fallback values** - Handle missing data gracefully

✅ **Use enums** - Limit choices when possible

✅ **Include reasoning** - AI will log why it chose values

### DON'T

❌ **Don't make schemas too complex** - Keep it simple and readable

❌ **Don't reference non-existent fields** - Verify response structure first

❌ **Don't skip descriptions** - AI can't guess what you want

❌ **Don't rely on perfect AI** - Always have fallback (static bodyJson)

## Resolution Priority

Bodies are resolved in this order:

1. **AI-generated body** (if set and not expired)
   - AI has generated a body based on observations
   - TTL-based (typically 30 minutes)
   - Auto-expires and regenerates

2. **Static bodyJson** (fallback)
   - Original static body field
   - Always works
   - Backward compatible

## API Integration (Coming Soon)

Planned features for Phase 2:

- API endpoints for schema CRUD operations
- UI JSON Schema editor with visual builder
- Schema validation before save
- Preview generated bodies with example data
- Run history showing AI reasoning

## Learn More

- [ADR-0051: JSON Schema-Driven Body Generation](../../.adr/0051-json-schema-driven-body-generation.md) - Technical implementation
- [JSON Schema Documentation](https://json-schema.org/) - Complete specification
- [AI Tools Documentation](./ai-tools.md) - How AI uses `propose_body_values`
