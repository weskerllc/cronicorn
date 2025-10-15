# @cronicorn/worker-ai-planner

AI-powered adaptive scheduling orchestration for the AI Planner background worker.

## Overview

This package contains the orchestration logic for the AI Planner worker process. It analyzes endpoint execution patterns and writes adaptive scheduling hints to the database.

## Architecture

- **AIPlanner**: Main orchestration class that coordinates AI analysis
- **Tools**: Endpoint-scoped tools for adaptive scheduling (propose_interval, propose_next_time, pause_until)

## Usage

```typescript
import { AIPlanner } from "@cronicorn/worker-ai-planner";
import { createVercelAiClient } from "@cronicorn/adapter-ai";

const aiClient = createVercelAiClient(config);
const planner = new AIPlanner({
  aiClient,
  jobs: jobsRepo,
  runs: runsRepo,
  clock: systemClock,
});

// Analyze single endpoint
await planner.analyzeEndpoint("endpoint-id");

// Batch analysis
await planner.analyzeEndpoints(["ep-1", "ep-2", "ep-3"]);
```

## Dependencies

- `@cronicorn/domain` - Domain entities and ports
- `@cronicorn/scheduler` - Tool system infrastructure (defineTools, tool, AIClient type)
- `zod` - Schema validation for AI tools

## Pattern

This package follows the **worker orchestration** pattern:
- Used by background workers (not user-facing APIs)
- Coordinates port method calls in specific sequences
- No framework dependencies (works with any composition root)

## See Also

- `packages/scheduler` - Scheduler worker orchestration (execution)
- `packages/services` - User-facing business logic (CRUD operations)
- `apps/ai-planner` - Composition root for AI Planner worker
