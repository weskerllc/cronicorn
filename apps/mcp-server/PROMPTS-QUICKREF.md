# MCP Prompts Quick Reference

Quick reference card for Cronicorn MCP Server prompts.

## Available Prompts

### `/setup-first-job`
**Get started with Cronicorn (works for all scenarios)**

```
@cronicorn /setup-first-job
```

With arguments:
```
@cronicorn /setup-first-job task_description="check API health" endpoint_url="https://api.example.com/health" schedule_type="interval"
```

**Use when:** 
- You're new to Cronicorn
- Creating any scheduled job
- Migrating from other cron systems

**You'll learn:** Jobs vs endpoints, baseline schedules, AI hints, safety constraints

---

### `/troubleshoot-failures`
**Debug failing job executions**

```
@cronicorn /troubleshoot-failures
```

With arguments:
```
@cronicorn /troubleshoot-failures job_or_endpoint_name="payment-processor" error_description="timeout errors" when_started="today"
```

**Use when:** Jobs are failing and you need to diagnose the issue

**You'll learn:** Diagnostic approach, common issues, how to fix them

---

## Platform-Specific Usage

### GitHub Copilot (VS Code)

1. Open GitHub Copilot Chat (Ctrl+Shift+I / Cmd+Shift+I)
2. Type: `@cronicorn /prompt-name`
3. Add arguments inline (optional)
4. Follow the guidance provided

### Claude Desktop

1. Type: `/prompt-name` in chat
2. Add arguments if needed
3. Claude will load bundled resources automatically

---

## Tips

- **Start broad:** Trigger prompts without arguments to get full guidance
- **Add context:** Include arguments when you have specific information
- **Follow suggestions:** Prompts reference tools you can use next
- **Ask follow-ups:** Copilot/Claude remember the context

---

## Quick Links

- 📖 Full Documentation: https://docs.cronicorn.com
- 🧪 Testing Guide: [TESTING-PROMPTS.md](./TESTING-PROMPTS.md)
- 📋 Implementation Details: [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)
