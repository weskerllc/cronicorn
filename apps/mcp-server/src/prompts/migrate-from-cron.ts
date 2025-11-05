import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

export function registerMigrateFromCronPrompt(server: McpServer) {
    server.registerPrompt(
        "migrate-from-cron",
        {
            title: "Migrate from Traditional Cron",
            description: "Help migrate existing cron jobs to Cronicorn's HTTP-first architecture",
            argsSchema: {
                current_system: z
                    .enum([
                        "traditional-cron",
                        "vercel-cron",
                        "github-actions",
                        "aws-eventbridge",
                        "other",
                    ])
                    .optional()
                    .describe("Your current cron system"),
                cron_expressions: z
                    .string()
                    .optional()
                    .describe(
                        "Your existing cron expressions (one per line). Example: 0 */5 * * *",
                    ),
                job_count: z
                    .string()
                    .optional()
                    .describe("How many jobs do you need to migrate?"),
            },
        },
        ({ current_system, cron_expressions, job_count }) => {
            const hasCronExpressions = !!cron_expressions;
            const hasJobCount = !!job_count;
            const jobCountNum = job_count ? Number.parseInt(job_count, 10) : 0;

            return {
                messages: [
                    {
                        role: "assistant",
                        content: {
                            type: "text",
                            text: `# Migrate to Cronicorn 🚀

I'll help you migrate your existing cron jobs to Cronicorn's HTTP-first architecture.

${current_system ? `**Current System:** ${current_system}` : "**Current System:** Tell me what you're using"}
${hasCronExpressions ? `**Cron Expressions:**\n\`\`\`\n${cron_expressions}\n\`\`\`` : "**Cron Expressions:** We'll convert these together"}
${hasJobCount ? `**Migration Scale:** ${job_count} job${jobCountNum > 1 ? "s" : ""}` : "**Migration Scale:** How many jobs are we migrating?"}

---

## Key Differences: Traditional Cron vs Cronicorn

### Traditional Cron (File-Based)
\`\`\`bash
# Crontab entry - runs a script directly on the server
0 */5 * * * /path/to/script.sh

# Script has direct file system access
#!/bin/bash
cd /var/app
./process-queue.sh >> /var/log/queue.log 2>&1
\`\`\`

**Limitations:**
- ❌ No centralized monitoring
- ❌ Hard to debug failures
- ❌ Can't dynamically adjust schedules
- ❌ Requires server access
- ❌ Difficult to coordinate across jobs
- ❌ No retry logic or backoff

### Cronicorn (HTTP-First)
\`\`\`typescript
// Your script becomes an HTTP endpoint
app.post('/process-queue', async (req, res) => {
  const result = await processQueue();
  
  // Return metrics for AI adaptation
  res.json({
    queue_depth: result.remaining,
    processed_count: result.processed,
    error_rate_pct: result.errorRate,
    healthy: result.errors < 5
  });
});

// Cronicorn calls this URL on schedule
// Endpoint: https://your-api.com/process-queue
// Schedule: Same cron expression (0 */5 * * *)
\`\`\`

**Benefits:**
- ✅ Centralized execution history
- ✅ Response body monitoring
- ✅ AI-powered adaptive scheduling
- ✅ Safety constraints (min/max intervals)
- ✅ Multi-endpoint coordination
- ✅ Automatic failure tracking and backoff

---

## Migration Strategy

### Option 1: Wrapper Endpoints (Fastest)

Keep your existing scripts, wrap them with HTTP:

\`\`\`typescript
// Simple Express wrapper
app.post('/legacy/:scriptName', async (req, res) => {
  const { scriptName } = req.params;
  
  try {
    // Execute existing script
    const { stdout, stderr } = await execAsync(\`/path/to/\${scriptName}.sh\`);
    
    res.json({
      status: 'success',
      output: stdout,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'failure',
      error: error.message
    });
  }
});
\`\`\`

Then point Cronicorn at: https://your-api.com/legacy/process-queue

### Option 2: Native HTTP Endpoints (Recommended)

Refactor scripts into proper HTTP endpoints with metrics:

\`\`\`typescript
app.post('/process-queue', async (req, res) => {
  const startTime = Date.now();
  const metrics = {
    processed: 0,
    errors: 0,
    queue_depth: 0
  };
  
  try {
    // Your business logic here
    const result = await processQueue();
    
    metrics.processed = result.count;
    metrics.queue_depth = result.remaining;
    
    res.json({
      ...metrics,
      duration_ms: Date.now() - startTime,
      healthy: true
    });
  } catch (error) {
    metrics.errors++;
    res.status(500).json({
      ...metrics,
      error: error.message,
      healthy: false
    });
  }
});
\`\`\`

This enables AI scheduling based on queue depth and error patterns.

---

## Converting Cron Expressions

Good news: Cronicorn supports standard cron expressions! No conversion needed.

${hasCronExpressions
                                    ? `### Your Expressions:\n\n${cron_expressions.split("\n").map((expr) => {
                                        const trimmed = expr.trim();
                                        if (!trimmed)
                                            return "";
                                        return `\`\`\`
Cron: ${trimmed}
Usage in Cronicorn: baselineCron: "${trimmed}"
\`\`\``;
                                    }).filter(Boolean).join("\n\n")}`
                                    : "### Example Conversions:\n\n```\nEvery 5 minutes: 0 */5 * * *\nDaily at 2 AM: 0 2 * * *\nMonday-Friday at 9 AM: 0 9 * * 1-5\n```"}

**Alternative:** Use intervals instead
- More intuitive for simple delays
- Better for AI adaptation (easier to tighten/relax)

\`\`\`
Every 5 minutes: baselineIntervalMs = 300000
Every hour: baselineIntervalMs = 3600000
\`\`\`

---

## Step-by-Step Migration

### 1. Audit Your Current Cron Jobs

List all cron jobs to migrate:
\`\`\`bash
crontab -l  # For user cron
cat /etc/crontab  # For system cron
\`\`\`

Document:
- Schedule (cron expression)
- What the job does
- Dependencies (files, databases, APIs)
- Expected runtime

### 2. Create HTTP Endpoints

For each cron job, create an HTTP endpoint:

**Simple wrapper approach:**
\`\`\`typescript
// server.ts
const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const app = express();

app.post('/cron/:jobName', async (req, res) => {
  const scriptPath = \`/path/to/scripts/\${req.params.jobName}.sh\`;
  
  try {
    const { stdout } = await execAsync(scriptPath);
    res.json({ status: 'success', output: stdout });
  } catch (error) {
    res.status(500).json({ status: 'failure', error: error.message });
  }
});

app.listen(3000);
\`\`\`

**Enhanced with metrics:**
\`\`\`typescript
app.post('/cron/:jobName', async (req, res) => {
  const startTime = Date.now();
  const scriptPath = \`/path/to/scripts/\${req.params.jobName}.sh\`;
  
  try {
    const { stdout, stderr } = await execAsync(scriptPath);
    
    res.json({
      status: 'success',
      duration_ms: Date.now() - startTime,
      output_lines: stdout.split('\\n').length,
      healthy: true
    });
  } catch (error) {
    res.status(500).json({
      status: 'failure',
      error: error.message,
      duration_ms: Date.now() - startTime,
      healthy: false
    });
  }
});
\`\`\`

### 3. Create Jobs in Cronicorn

${hasJobCount && jobCountNum > 5 ? "Since you're migrating multiple jobs, consider grouping related endpoints:" : "Create a job for each logical unit:"}

\`\`\`
Use create_job tool:
- name: "Data Processing"
- description: "Migrated cron jobs for data processing pipeline"
\`\`\`

### 4. Add Endpoints with Same Schedules

For each endpoint, preserve the original schedule:

\`\`\`
Use add_endpoint tool:
- name: "Process Queue"
- url: "https://your-api.com/cron/process-queue"
- method: "POST"
- baselineCron: "0 */5 * * *"  # Original cron expression
- minIntervalMs: 60000  # Safety: minimum 1 minute
- maxIntervalMs: 600000  # Safety: maximum 10 minutes
\`\`\`

### 5. Test in Parallel

**Don't disable old cron jobs yet!**

Run both systems in parallel for 1-2 weeks:
1. Old cron continues to run
2. Cronicorn calls your HTTP endpoints
3. Monitor Cronicorn execution history
4. Compare results

Use \`get_endpoint_health_summary\` to verify success rates.

### 6. Gradually Cut Over

Once confident:
1. Disable one cron job at a time
2. Monitor Cronicorn for 24-48 hours
3. If stable, disable next cron job
4. Repeat until fully migrated

---

## Handling Common Scenarios

### File System Access
**Old cron:** \`cd /var/app && ./script.sh\`
**Cronicorn:** HTTP endpoint must handle file paths

\`\`\`typescript
app.post('/cleanup-logs', async (req, res) => {
  const logDir = '/var/app/logs';
  const deleted = await cleanupOldFiles(logDir, { olderThanDays: 7 });
  
  res.json({
    files_deleted: deleted.length,
    space_freed_mb: deleted.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024
  });
});
\`\`\`

### Environment Variables
**Old cron:** Set in crontab or .env files
**Cronicorn:** Set in your HTTP server environment

\`\`\`bash
# .env for your HTTP server
DATABASE_URL=postgres://...
API_KEY=secret123

# Cronicorn just calls the URL
\`\`\`

### Chained Jobs (Dependencies)
**Old cron:** Multiple crontab entries with staggered times
**Cronicorn:** Use multi-endpoint coordination

\`\`\`typescript
// Endpoint 1: Fetch data
app.post('/fetch-data', async (req, res) => {
  const data = await fetchFromAPI();
  await saveToDatabase(data);
  
  res.json({
    records_fetched: data.length,
    ready_for_processing: true,  // Signal for next endpoint
    last_sync_at: new Date().toISOString()
  });
});

// Endpoint 2: Process data (checks sibling response)
app.post('/process-data', async (req, res) => {
  // AI can check sibling endpoint's ready_for_processing flag
  const processed = await processData();
  
  res.json({
    records_processed: processed.length,
    completed_at: new Date().toISOString()
  });
});
\`\`\`

Create both endpoints in the same job, and the AI can coordinate them.

---

## Batch Migration Script

${hasJobCount && jobCountNum > 10 ? `For ${job_count} jobs, consider scripting the migration:` : "If migrating many jobs, automate it:"}

\`\`\`typescript
// migrate-cron.ts
const cronJobs = [
  { name: 'Process Queue', cron: '0 */5 * * *', url: '/cron/process-queue' },
  { name: 'Daily Cleanup', cron: '0 2 * * *', url: '/cron/cleanup' },
  // ... more jobs
];

async function migrateCronJobs() {
  // Create parent job
  const job = await createJob({
    name: 'Migrated Cron Jobs',
    description: 'Batch migration from traditional cron'
  });
  
  // Add all endpoints
  for (const cronJob of cronJobs) {
    await addEndpoint(job.id, {
      name: cronJob.name,
      url: \`https://your-api.com\${cronJob.url}\`,
      baselineCron: cronJob.cron,
      method: 'POST',
      minIntervalMs: 60000,
      maxIntervalMs: 3600000
    });
    
    console.log(\`✓ Migrated: \${cronJob.name}\`);
  }
}
\`\`\`

---

## Verification Checklist

After migration, verify each endpoint:

- [ ] Endpoint responds with 2xx status code
- [ ] Response body includes metrics (for AI adaptation)
- [ ] Execution history shows successful runs
- [ ] Failure rate is acceptable (< 5%)
- [ ] Average duration is reasonable
- [ ] No excessive resource usage

Use these tools:
- \`list_runs\` - Check execution history
- \`get_endpoint_health_summary\` - Success rates
- \`get_run_details\` - Investigate failures

---

## Next Steps

${!current_system ? "1. Tell me what cron system you're currently using" : ""}
${!hasCronExpressions ? `${!current_system ? "2" : "1"}. Share your cron expressions` : ""}
${!hasJobCount ? `${!current_system && !hasCronExpressions ? "3" : !current_system || !hasCronExpressions ? "2" : "1"}. How many jobs are you migrating?` : ""}

Once I have this info, I'll help you create the migration plan and set up your jobs!

---

📚 **Resources:**
- Core Concepts: https://docs.cronicorn.com/core-concepts
- How Scheduling Works: https://docs.cronicorn.com/technical/how-scheduling-works
- Bundled Docs: file:///docs/core-concepts.md

💡 **Available Tools:**
- create_job - Create job containers
- add_endpoint - Add migrated endpoints
- list_jobs - See all your jobs
- get_endpoint_health_summary - Monitor migration health
`,
                        },
                    },
                ],
            };
        },
    );
}
