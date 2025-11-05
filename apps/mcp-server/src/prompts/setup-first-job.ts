import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

export function registerSetupFirstJobPrompt(server: McpServer) {
    server.registerPrompt(
        "setup-first-job",
        {
            title: "Set Up Your First Job",
            description: "Interactive guide to create your first scheduled job in Cronicorn",
            argsSchema: {
                task_description: z
                    .string()
                    .optional()
                    .describe("What should this job do? (e.g., \"check API health every 5 minutes\")"),
                endpoint_url: z
                    .string()
                    .url()
                    .optional()
                    .describe("The HTTP endpoint URL to call"),
                schedule_type: z
                    .enum(["interval", "cron"])
                    .optional()
                    .describe("Preferred schedule type: interval (fixed delay) or cron (time-based)"),
            },
        },
        ({ task_description, endpoint_url, schedule_type }) => {
            const hasTask = !!task_description;
            const hasUrl = !!endpoint_url;
            const hasSchedule = !!schedule_type;

            return {
                messages: [
                    {
                        role: "assistant",
                        content: {
                            type: "text",
                            text: `# Welcome to Cronicorn! 🦄

I'll help you set up your first scheduled job. Cronicorn is an HTTP-first cron scheduler with AI-powered adaptive scheduling.

## What You'll Create

${hasTask ? `**Task:** ${task_description}` : "**Task:** We'll define this together"}
${hasUrl ? `**Endpoint:** ${endpoint_url}` : "**Endpoint:** We'll set up your HTTP endpoint"}
${hasSchedule ? `**Schedule Type:** ${schedule_type}` : "**Schedule Type:** Choose between interval or cron"}

---

## Key Concepts

### Jobs vs Endpoints
- **Job**: A container for related scheduled tasks (e.g., "Payment Processing")
- **Endpoint**: The actual HTTP URL that gets called on schedule (e.g., "Process Queue")

A job can have multiple endpoints that coordinate together.

### Baseline Schedule
Your desired execution frequency:
- **Interval**: Fixed delay between runs (e.g., every 5 minutes)
- **Cron**: Time-based schedule (e.g., "0 */5 * * *" = every 5 minutes)

### AI Hints (Optional)
The AI can dynamically adjust your schedule based on:
- Response body metrics (queue depth, error rate, load)
- Execution patterns (failures, performance)
- Coordination signals (from other endpoints)

### Safety Constraints
- **minIntervalMs**: Fastest the endpoint can run (prevents runaway execution)
- **maxIntervalMs**: Slowest the endpoint can run (ensures timely execution)

---

## Step-by-Step Setup

### 1. Create a Job Container

First, create a job to hold your endpoint:

\`\`\`
Use the create_job tool:
- name: "${hasTask ? task_description.slice(0, 50) : "My First Job"}"
- description: "${hasTask ? task_description : "Description of what this job does"}"
\`\`\`

### 2. Add an Endpoint

After creating the job, add an endpoint with your HTTP URL:

\`\`\`
Use the add_endpoint tool:
- name: "Main Endpoint"
- url: "${hasUrl ? endpoint_url : "https://your-api.com/endpoint"}"
- method: "GET" (or POST/PUT/etc.)
${schedule_type === "interval" ? `- baselineIntervalMs: 300000 (5 minutes in milliseconds)` : ""}
${schedule_type === "cron" ? `- baselineCron: "0 */5 * * *" (every 5 minutes)` : ""}
${!hasSchedule ? `- Choose either baselineIntervalMs OR baselineCron (not both)` : ""}
\`\`\`

### 3. Set Safety Constraints (Optional but Recommended)

Prevent runaway execution with constraints:

\`\`\`
In the add_endpoint call, also include:
- minIntervalMs: 60000 (minimum 1 minute between runs)
- maxIntervalMs: 600000 (maximum 10 minutes between runs)
\`\`\`

### 4. Structure Your Endpoint Response (For AI Adaptation)

To enable AI scheduling, return JSON with metrics:

\`\`\`json
{
  "queue_depth": 150,
  "processing_rate_per_min": 80,
  "error_rate_pct": 2.5,
  "healthy": true,
  "last_success_at": "2025-11-05T14:30:00Z"
}
\`\`\`

The AI looks for field names like: queue, latency, error, rate, count, healthy, status.

### 5. Verify It's Working

After setup, check execution:

\`\`\`
Use get_endpoint_health_summary tool to see:
- Success rate
- Average duration
- Failure streak
- Last run info
\`\`\`

---

## Common Patterns

### Health Check Endpoint
\`\`\`
Interval: Every 1 minute
URL: https://api.example.com/health
Response: { "status": "healthy", "latency_ms": 45 }
AI behavior: Tighten to 30s if unhealthy, relax to 5min when stable
\`\`\`

### Data Sync Endpoint
\`\`\`
Interval: Every 5 minutes
URL: https://api.example.com/sync
Response: { "queue_depth": 50, "pending_count": 12 }
AI behavior: Tighten to 1min when queue grows, relax to 10min when empty
\`\`\`

### Daily Cleanup
\`\`\`
Cron: "0 2 * * *" (2 AM daily)
URL: https://api.example.com/cleanup
Response: { "records_deleted": 1500, "duration_ms": 3200 }
AI behavior: Run immediately if previous run failed
\`\`\`

---

## Next Steps

${!hasTask ? "1. Tell me what task you want to schedule" : ""}
${!hasUrl ? `${!hasTask ? "2" : "1"}. Provide your HTTP endpoint URL` : ""}
${!hasSchedule ? `${!hasTask && !hasUrl ? "3" : !hasTask || !hasUrl ? "2" : "1"}. Choose interval or cron scheduling` : ""}

Then I'll help you create the job and endpoint using the available tools!

---

📚 **Resources:**
- Quick Start Guide: https://docs.cronicorn.com/quick-start
- Core Concepts: https://docs.cronicorn.com/core-concepts
- Bundled Docs: file:///docs/quick-start.md

💡 **Available Tools:**
- create_job - Create a job container
- add_endpoint - Add an endpoint to a job
- get_endpoint_health_summary - Check execution health
- list_jobs - See all your jobs
- list_endpoints - See endpoints in a job
`,
                        },
                    },
                ],
            };
        },
    );
}
