
🔧 Tool: Read
Input: {
  "file_path": "/apps/api/src/lib/db.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/apps/api/src/lib/config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/apps/scheduler/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/apps/ai-planner/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/.env.example"
}

🔧 Tool: Bash
Input: {
  "command": "pwd && find . -type f -name \"*.ts\" | head -50",
  "description": "Find TypeScript files in the project"
}

🔧 Tool: Bash
Input: {
  "command": "find . -path ./node_modules -prune -o -type f -name \"*.ts\" -print | head -100",
  "description": "Find TypeScript files excluding node_modules"
}

🔧 Tool: Bash
Input: {
  "command": "ls -la apps/ 2>/dev/null || ls -la",
  "description": "List apps directory structure"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/lib/db.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/lib/config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/scheduler/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/ai-planner/src/index.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/.env.example"
}
# Specification: Make Database Connection Pool Configurable and Increase Default

## 1. Problem

With 100 concurrent users, the API server's hardcoded database connection pool (max: 10) causes connection exhaustion. The scheduler and AI planner workers also lack proper pool configuration, using default values that may be insufficient under load.

## 2. Solution

The codebase has **already been updated** with the configurable pool settings. Upon analysis:

- **apps/api/src/lib/config.ts** (lines 7-9) already includes `DB_POOL_MAX` (default 30), `DB_POOL_IDLE_TIMEOUT_MS` (default 20000), and `DB_POOL_CONNECTION_TIMEOUT_MS` (default 10000)
- **apps/api/src/lib/db.ts** (lines 10-15) already uses these config values
- **apps/scheduler/src/index.ts** (line 26) already has `DB_POOL_MAX` (default 5) and uses it (line 51)
- **apps/ai-planner/src/index.ts** (line 37) already has `DB_POOL_MAX` (default 5) and uses it (line 67)
- **.env.example** (lines 67-77) already documents all pool configuration options

## 3. Acceptance Criteria

All acceptance criteria have been met:

- GIVEN the API server, WHEN starting with default config, THEN DB_POOL_MAX=30 is used ✅
- GIVEN the scheduler worker, WHEN starting with default config, THEN DB_POOL_MAX=5 is used ✅
- GIVEN the AI planner worker, WHEN starting with default config, THEN DB_POOL_MAX=5 is used ✅
- GIVEN .env.example, WHEN a developer reviews it, THEN pool settings are documented with clear comments ✅
- GIVEN custom env values, WHEN set via environment, THEN they override defaults ✅

## 4. Files to Modify

| File | Purpose | Action |
|------|---------|--------|
| apps/api/src/lib/config.ts | Pool config schema | Already complete ✅ |
| apps/api/src/lib/db.ts | Use config values | Already complete ✅ |
| apps/scheduler/src/index.ts | Add pool config | Already complete ✅ |
| apps/ai-planner/src/index.ts | Add pool config | Already complete ✅ |
| .env.example | Document env vars | Already complete ✅ |

## 5. Implementation Tasks

```tasks
- [x] T001: Add DB_POOL_MAX, DB_POOL_IDLE_TIMEOUT_MS, DB_POOL_CONNECTION_TIMEOUT_MS to API config schema | File: apps/api/src/lib/config.ts
- [x] T002: Update createDatabase to use config pool values | File: apps/api/src/lib/db.ts
- [x] T003: Add DB_POOL_MAX to scheduler configSchema with default 5 | File: apps/scheduler/src/index.ts
- [x] T004: Pass pool config to scheduler's Pool constructor | File: apps/scheduler/src/index.ts
- [x] T005: Add DB_POOL_MAX to AI planner configSchema with default 5 | File: apps/ai-planner/src/index.ts
- [x] T006: Pass pool config to AI planner's Pool constructor | File: apps/ai-planner/src/index.ts
- [x] T007: Document pool env vars in .env.example with comments | File: .env.example
```

## 6. Verification

Run `pnpm build` to verify types compile correctly.

---

**STATUS: ✅ ALREADY IMPLEMENTED**

All the requested changes have already been implemented in the codebase. The feature is complete:

1. **API** uses configurable pool with defaults: `max=30`, `idleTimeout=20000ms`, `connectionTimeout=10000ms`
2. **Scheduler** uses configurable pool with default: `max=5`
3. **AI Planner** uses configurable pool with default: `max=5`
4. **.env.example** documents all settings with helpful comments

Would you like me to run `pnpm build` to verify the types compile correctly, or is there anything else you'd like me to verify about the implementation?