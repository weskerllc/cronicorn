# Testing MCP Prompts in GitHub Copilot

This guide shows how to test the new prompts feature in GitHub Copilot (VS Code).

## Setup

1. **Install the MCP server globally:**
   ```bash
   cd apps/mcp-server
   pnpm link --global
   ```

2. **Configure VS Code Settings:**
   
   Open VS Code Settings (JSON) via `Cmd+Shift+P` → "Preferences: Open User Settings (JSON)"
   
   Add:
   ```json
   {
     "github.copilot.chat.mcp.servers": {
       "cronicorn": {
         "command": "cronicorn-mcp"
       }
     }
   }
   ```

3. **Restart VS Code** for changes to take effect

4. **Authenticate on first run:**
   - Open GitHub Copilot Chat
   - Type `@cronicorn` to trigger the server
   - Follow the OAuth device flow in your browser

## Testing Prompts

### Test 1: Setup First Job (No Arguments)

**In GitHub Copilot Chat, type:**
```
@cronicorn /setup-first-job
```

**Expected Behavior:**
- Prompt displays welcome message with Cronicorn overview
- Shows key concepts (Jobs, Endpoints, Baseline Schedule, AI Hints, Safety Constraints)
- Provides step-by-step setup guide
- Includes common patterns (Health Check, Data Sync, Daily Cleanup)
- Asks follow-up questions about task, URL, and schedule type
- References both hosted docs URLs and bundled resources

**Verify:**
- [ ] Message renders correctly with markdown formatting
- [ ] All sections are present (concepts, steps, patterns, resources)
- [ ] Links are clickable (https://docs.cronicorn.com/...)
- [ ] Copilot understands the context and can answer follow-ups

---

### Test 2: Setup First Job (With Arguments)

**In GitHub Copilot Chat, type:**
```
@cronicorn /setup-first-job task_description="monitor payment queue" endpoint_url="https://api.example.com/queue/status" schedule_type="interval"
```

**Expected Behavior:**
- Prompt acknowledges the provided arguments
- Customizes guidance based on provided info
- Shows "Task: monitor payment queue"
- Shows "Endpoint: https://api.example.com/queue/status"
- Shows "Schedule Type: interval"
- Adjusts recommendations accordingly

**Verify:**
- [ ] Arguments are properly displayed in the response
- [ ] Guidance is tailored to provided context
- [ ] Conditional sections appear/disappear based on args
- [ ] "Next Steps" section adapts to what's already provided

---

### Test 3: Migrate from Cron (Traditional Cron)

**In GitHub Copilot Chat, type:**
```
@cronicorn /migrate-from-cron current_system="traditional-cron" cron_expressions="0 */5 * * *
0 2 * * *"
```

**Expected Behavior:**
- Prompt displays migration guide header
- Shows current system: traditional-cron
- Displays provided cron expressions
- Explains key differences (file-based vs HTTP-first)
- Provides wrapper endpoint examples
- Suggests migration strategy (wrapper vs native)
- Includes parallel testing guidance

**Verify:**
- [ ] Multi-line cron expressions display correctly
- [ ] Code examples render properly
- [ ] Migration strategies are clear
- [ ] Wrapper endpoint code is valid TypeScript/JavaScript
- [ ] Batch migration section appears for multiple jobs

---

### Test 4: Migrate from Vercel Cron

**In GitHub Copilot Chat, type:**
```
@cronicorn /migrate-from-cron current_system="vercel-cron" job_count="15"
```

**Expected Behavior:**
- Shows current system: vercel-cron
- Displays job count: 15 jobs
- Mentions batch migration due to higher count (>10)
- Provides Vercel-specific guidance if needed
- Suggests grouping related endpoints

**Verify:**
- [ ] Job count displays correctly
- [ ] Batch migration guidance appears (since count > 10)
- [ ] System-specific notes are relevant
- [ ] Scripting examples are provided

---

### Test 5: Troubleshoot Failures (No Arguments)

**In GitHub Copilot Chat, type:**
```
@cronicorn /troubleshoot-failures
```

**Expected Behavior:**
- Displays troubleshooting framework
- Shows diagnostic approach (6 steps)
- Asks for endpoint identifier, error description, timeline
- Provides step-by-step investigation guide
- Lists common issues and solutions
- References tools to use (list_runs, get_run_details, etc.)

**Verify:**
- [ ] All 6 diagnostic steps are present
- [ ] Common issues section is comprehensive
- [ ] Tool names match actual available tools
- [ ] Code examples are correct
- [ ] Emergency actions section is clear

---

### Test 6: Troubleshoot Failures (With Context)

**In GitHub Copilot Chat, type:**
```
@cronicorn /troubleshoot-failures job_or_endpoint_name="payment-processor" error_description="timeout errors after 30 seconds" when_started="today"
```

**Expected Behavior:**
- Acknowledges provided context
- Shows: Endpoint: payment-processor
- Shows: Error: timeout errors after 30 seconds
- Shows: Timeline: Started today
- Tailors troubleshooting to timeout issues
- Suggests increasing timeoutMs and maxExecutionTimeMs
- Recommends checking endpoint performance

**Verify:**
- [ ] All provided arguments appear in response
- [ ] Guidance is specific to timeout errors
- [ ] Suggests relevant solutions first
- [ ] References appropriate tools
- [ ] Timeline context is mentioned

---

## Testing Follow-Up Interactions

After triggering a prompt, test Copilot's ability to continue the conversation:

### Follow-Up Test 1: Setup → Create Job

**Initial:**
```
@cronicorn /setup-first-job task_description="health check API" endpoint_url="https://api.myapp.com/health"
```

**Follow-Up:**
```
Create the job for me with a 5-minute interval
```

**Expected:**
- Copilot uses the `create_job` tool
- Passes correct parameters from prompt context
- Creates job with appropriate name and description

**Verify:**
- [ ] Copilot understands context from prompt
- [ ] Tool is called with correct parameters
- [ ] Job is created successfully

---

### Follow-Up Test 2: Troubleshoot → Check Run History

**Initial:**
```
@cronicorn /troubleshoot-failures job_or_endpoint_name="data-sync"
```

**Follow-Up:**
```
Show me the last 10 runs for this endpoint
```

**Expected:**
- Copilot uses `list_runs` tool
- Filters by endpoint name/ID
- Returns recent run history

**Verify:**
- [ ] Copilot remembers endpoint from prompt
- [ ] Tool parameters are correct
- [ ] Results are displayed clearly

---

### Follow-Up Test 3: Migrate → Batch Create

**Initial:**
```
@cronicorn /migrate-from-cron current_system="traditional-cron" job_count="5"
```

**Follow-Up:**
```
Help me create these 5 jobs:
1. Health check - every 5 min - https://api.example.com/health
2. Data sync - every hour - https://api.example.com/sync
3. Cleanup - daily at 2am - https://api.example.com/cleanup
4. Reports - Monday 9am - https://api.example.com/reports
5. Backups - every 6 hours - https://api.example.com/backup
```

**Expected:**
- Copilot creates multiple jobs
- Uses correct cron expressions or intervals
- Groups related jobs if appropriate

**Verify:**
- [ ] All 5 jobs are created
- [ ] Schedules are correctly converted
- [ ] Job names are descriptive
- [ ] Endpoints are configured properly

---

## Testing Documentation References

Verify that documentation links work:

1. **Hosted Docs Links:**
   - Click on https://docs.cronicorn.com/quick-start
   - Click on https://docs.cronicorn.com/core-concepts
   - Verify pages load correctly

2. **Bundled Resource References:**
   - Look for `file:///docs/...` references in prompt output
   - Note: GitHub Copilot may not automatically load these (expected)
   - Verify the inline summaries provide equivalent info

---

## Common Issues & Troubleshooting

### Issue: Prompts Don't Appear

**Symptoms:**
- Typing `@cronicorn /setup-first-job` does nothing
- No autocomplete suggestions for slash commands

**Solutions:**
1. Verify MCP server is installed: `cronicorn-mcp --version`
2. Check VS Code settings include MCP server config
3. Restart VS Code completely
4. Check Copilot Chat logs for errors

---

### Issue: Authentication Fails

**Symptoms:**
- OAuth device flow never completes
- Credentials not saved

**Solutions:**
1. Check internet connectivity
2. Verify CRONICORN_API_URL and CRONICORN_WEB_URL in env
3. Try deleting `~/.cronicorn/credentials.json` and re-authenticating
4. Check browser isn't blocking the device approval page

---

### Issue: Prompt Output is Truncated

**Symptoms:**
- Prompts appear cut off
- Missing sections

**Solutions:**
1. This is expected - prompts are very long
2. Scroll through the full response in Copilot Chat
3. Ask follow-up questions to get specific sections
4. Use arguments to get targeted guidance

---

### Issue: Tools Aren't Called

**Symptoms:**
- Prompt suggests using a tool
- Copilot doesn't actually call it in follow-up

**Solutions:**
1. Be explicit: "Use the create_job tool to..."
2. Provide all required parameters
3. Check tool names match exactly (list_jobs, not listJobs)
4. Verify authentication is working

---

## Success Criteria

For prompts to be working correctly:

- ✅ All 3 prompts can be triggered with slash commands
- ✅ Prompts accept optional arguments
- ✅ Output includes markdown formatting (headers, code blocks, lists)
- ✅ Documentation links are present (both hosted and bundled refs)
- ✅ Follow-up interactions maintain context
- ✅ Copilot can call suggested tools based on prompt guidance
- ✅ Arguments customize the prompt output appropriately
- ✅ Common patterns and examples are included
- ✅ Next steps guide users clearly

---

## Comparison: GitHub Copilot vs Claude Desktop

| Feature | GitHub Copilot (VS Code) | Claude Desktop |
|---------|-------------------------|----------------|
| **Slash Commands** | `@cronicorn /prompt-name` | `/prompt-name` |
| **Bundled Resources** | Not auto-loaded (expected) | Auto-loaded via file:// URIs |
| **Documentation** | Uses inline summaries + hosted URLs | Uses bundled resources |
| **Tool Calling** | Available in follow-ups | Available in follow-ups |
| **Context Retention** | Within session | Within session |
| **Formatting** | Markdown rendering | Markdown rendering |

**Key Takeaway:** Prompts work in both platforms, but GitHub Copilot relies on inline content and hosted URLs since it doesn't auto-load bundled resources. This is by design and expected behavior.

---

## Next Steps After Testing

1. **Document any issues** found during testing
2. **Create GitHub Issues** for bugs or improvements
3. **Update prompts** based on user feedback
4. **Add more prompts** for additional workflows
5. **Consider prompt arguments** that could be made smarter (enums, validation)

---

## Feedback

After testing, consider:
- Are the prompts too verbose? Should they be shorter?
- Are the arguments intuitive?
- Do follow-ups work smoothly?
- Is the documentation adequate?
- Are there missing workflows that need prompts?

File feedback as issues or discuss in team channels.
