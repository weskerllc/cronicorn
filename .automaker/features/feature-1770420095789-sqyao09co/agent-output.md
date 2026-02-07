
🔧 Tool: Read
Input: {
  "file_path": "/Users/jshawl/dev/helloworld-express/docs/_RUNNING_TECH_DEBT.md"
}

🔧 Tool: Grep
Input: {
  "pattern": "TODO",
  "path": "/Users/jshawl/dev/helloworld-express",
  "output_mode": "content",
  "-n": true
}

🔧 Tool: Glob
Input: {
  "pattern": "**/_RUNNING_TECH_DEBT.md"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/docs/**/*.md"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/docs/_RUNNING_TECH_DEBT.md"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/packages/adapter-ai/src/client.ts",
  "limit": 120
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/packages/services/src/subscriptions/manager.ts",
  "limit": 120
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/packages/adapter-drizzle/src/runs-repo.ts",
  "limit": 180
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/ai-planner/src/index.ts",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/mcp-server/src/resources/README.md"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/web/src/lib/api-client/format-api-error.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/web/src/lib/api-client/queries/api-keys.queries.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/web/src/routes/_authed/endpoints.$id.runs.tsx",
  "offset": 160,
  "limit": 30
}
# Specification: Log All Untracked TODOs to Tech Debt Document

## 1. Problem

The project has 8 TODO comments in the codebase that are not tracked in `docs/_RUNNING_TECH_DEBT.md`. Additionally, several infrastructure issues identified during assessment (rate limiting, Sentry, backups, encryption, webhooks) need to be documented. This violates the project's mandatory rule that all TODOs must be logged for future reference.

## 2. Solution

Add new sections to `docs/_RUNNING_TECH_DEBT.md` documenting all untracked TODOs grouped by area, plus infrastructure tech debt items from the assessment.

## 3. Acceptance Criteria

- GIVEN the existing tech debt document, WHEN I add the new entries, THEN all 8 untracked TODOs are documented with file references and line numbers
- GIVEN the assessment findings, WHEN I add infrastructure tech debt, THEN all 5 infrastructure items are documented (Redis rate limiting, Sentry, backups, encryption, webhooks)
- GIVEN the existing document format, WHEN I add entries, THEN they follow the checkbox format (`- [ ]`) with file references
- GIVEN the tech debt document, WHEN organized, THEN entries are grouped by area (AI Planner, Adapter Drizzle, Subscriptions, Web App, MCP Server, Infrastructure)

## 4. Files to Modify

| File | Purpose | Action |
|------|---------|--------|
| `docs/_RUNNING_TECH_DEBT.md` | Central tech debt tracking document | modify |

## 5. Implementation Tasks

```tasks
- [ ] T001: Add AI Planner section with logger stub and model selection TODOs | File: docs/_RUNNING_TECH_DEBT.md
- [ ] T002: Add Adapter Drizzle section with count query optimization TODO | File: docs/_RUNNING_TECH_DEBT.md
- [ ] T003: Add Subscriptions section with return type fields TODO | File: docs/_RUNNING_TECH_DEBT.md
- [ ] T004: Add Web App section with error formatting, api-keys refactor, and backend search TODOs | File: docs/_RUNNING_TECH_DEBT.md
- [ ] T005: Add MCP Server section with resource implementation TODO | File: docs/_RUNNING_TECH_DEBT.md
- [ ] T006: Add Infrastructure Assessment Findings section with Redis, Sentry, backups, encryption, and webhooks items | File: docs/_RUNNING_TECH_DEBT.md
```

## 6. Verification

- Read `docs/_RUNNING_TECH_DEBT.md` and confirm all 8 TODOs are documented
- Verify 5 infrastructure assessment items are documented
- Confirm entries follow existing checkbox format with file references
- Ensure entries are properly grouped by area

---

[SPEC_GENERATED] Please review the specification above. Reply with 'approved' to proceed or provide feedback for revisions.I'll implement task T001 by adding the AI Planner section with logger stub and model selection TODOs to the tech debt document. Let me first read the current state of the document and the relevant source files to get the exact TODO details.Now let me also read the ai-planner source file to get more context about the TODOs, including any model selection related TODO:Let me also check the adapter-ai client.ts file for the model selection TODO:I now have all the information I need. I found:
1. **Line 84 in `apps/ai-planner/src/index.ts`**: `// TODO: Use real logger` - the logger stub that needs to be replaced with a proper logger
2. **Line 95 in `packages/adapter-ai/src/client.ts`**: `// TODO: Consider using modelName to support per-call model selection` - the model selection TODO

Now I'll add the AI Planner section to the tech debt document:Task T001 is complete. Let me verify the change was applied correctly:## Summary: Task T001 Complete

I added the **AI Planner** section to `docs/_RUNNING_TECH_DEBT.md` with two previously untracked TODOs:

1. **Use real logger instead of stub** — `apps/ai-planner/src/index.ts:84`
   - Documents the inline logger stub that wraps console.log and needs replacement with a proper Pino logger

2. **Support per-call model selection** — `packages/adapter-ai/src/client.ts:95`
   - Documents the ignored `_modelName` parameter in the `planWithTools` interface that could enable per-call model selection

The section follows the existing document format with:
- Status and related context headers
- Checkbox format (`- [ ]`) for actionable items
- File path and line number references
- Brief descriptions of what needs to be done## Summary: Task T001 Complete

I added the **AI Planner** section to `docs/_RUNNING_TECH_DEBT.md` with two previously untracked TODOs:

1. **Use real logger instead of stub** — `apps/ai-planner/src/index.ts:84`
   - Documents the inline logger stub that wraps console.log and needs replacement with a proper Pino logger

2. **Support per-call model selection** — `packages/adapter-ai/src/client.ts:95`
   - Documents the ignored `_modelName` parameter in the `planWithTools` interface that could enable per-call model selection

The section follows the existing document format with:
- Status and related context headers
- Checkbox format (`- [ ]`) for actionable items
- File path and line number references
- Brief descriptions of what needs to be doneI'll implement task T002 by adding the Adapter Drizzle section with the count query optimization TODO. Let me first read the current state of the tech debt document and find the specific TODO in the adapter-drizzle package.Let me check the correct path based on the plan context which shows `/Users/brandincanfield/Documents/Git/cronicorn/`:Now I have the information I need. Let me read the specific TODO in context to understand it better:Now I have all the information I need. The TODO is at line 163 in `packages/adapter-drizzle/src/runs-repo.ts` and it's about optimizing the count query using window functions instead of making two separate queries. Let me add the Adapter Drizzle section to the tech debt document after the AI Planner section:Let me verify the change was applied correctly:## Summary: Task T002 Completed

I successfully added the **Adapter Drizzle** section to `docs/_RUNNING_TECH_DEBT.md` with the count query optimization TODO.

### What was added (lines 57-67):

- **New section**: "Adapter Drizzle" with status and related context
- **TODO item**: Documents the optimization opportunity at `packages/adapter-drizzle/src/runs-repo.ts:163`
- **Description**: Explains that the `listRuns` method currently makes two separate database queries (one for paginated results, one for total count) and could be optimized to a single query using SQL window functions like `COUNT(*) OVER()`

The entry follows the existing document format with:
- Checkbox format (`- [ ]`)
- Bold title with file reference and line number
- Descriptive explanation of the tech debt item## Summary: Task T002 Completed

I successfully added the **Adapter Drizzle** section to `docs/_RUNNING_TECH_DEBT.md` with the count query optimization TODO.

### What was added (lines 57-67):

- **New section**: "Adapter Drizzle" with status and related context
- **TODO item**: Documents the optimization opportunity at `packages/adapter-drizzle/src/runs-repo.ts:163`
- **Description**: Explains that the `listRuns` method currently makes two separate database queries (one for paginated results, one for total count) and could be optimized to a single query using SQL window functions like `COUNT(*) OVER()`

The entry follows the existing document format with:
- Checkbox format (`- [ ]`)
- Bold title with file reference and line number
- Descriptive explanation of the tech debt itemI'll implement task T003: Add Subscriptions section with return type fields TODO. Let me first read the current state of the tech debt document and find the relevant TODO in the subscriptions code.Now I can see:
1. The current state of the tech debt document with AI Planner and Adapter Drizzle sections already added
2. The TODOs in the subscriptions manager at lines 97-98 about adding fields to the `getUserById` return type

Let me read more context around those TODOs to understand the issue better:Now I have all the context I need. The TODOs are about the `getUserById` return type not including `subscriptionStatus` and `endsAt` fields that exist on the user table. Now I'll add the Subscriptions section to the tech debt document, following the established format:Task T003 is complete. Let me verify the change was applied correctly:## Summary: Task T003 Complete

I added the **Subscriptions** section to `docs/_RUNNING_TECH_DEBT.md` documenting two related TODOs:

1. **Add subscription status to getUserById return type** — `packages/services/src/subscriptions/manager.ts:97`
   - The `getStatus` method returns `status: null` because the `subscriptionStatus` field exists on the user table but isn't included in the port interface

2. **Add subscription endsAt to getUserById return type** — `packages/services/src/subscriptions/manager.ts:98`  
   - The `getStatus` method returns `endsAt: null` because the `endsAt` field exists on the user table but isn't included in the port interface

The new section follows the established document format with:
- Status and Related metadata headers
- "Untracked TODOs" subsection
- Checkbox format (`- [ ]`) with bold description, file reference with line number, and explanatory text## Summary: Task T003 Complete

I added the **Subscriptions** section to `docs/_RUNNING_TECH_DEBT.md` documenting two related TODOs:

1. **Add subscription status to getUserById return type** — `packages/services/src/subscriptions/manager.ts:97`
   - The `getStatus` method returns `status: null` because the `subscriptionStatus` field exists on the user table but isn't included in the port interface

2. **Add subscription endsAt to getUserById return type** — `packages/services/src/subscriptions/manager.ts:98`  
   - The `getStatus` method returns `endsAt: null` because the `endsAt` field exists on the user table but isn't included in the port interface

The new section follows the established document format with:
- Status and Related metadata headers
- "Untracked TODOs" subsection
- Checkbox format (`- [ ]`) with bold description, file reference with line number, and explanatory textI'll implement task T004 by adding the Web App section with the relevant TODOs. Let me first read the current state of the tech debt document and the source files to get the exact TODO details.The paths from the plan reference a different directory. Let me find the correct files:Now let me read these files:Now I have all the information needed. I can see the current tech debt document ends at line 280, and I've found the three TODOs for the Web App section:

1. **format-api-error.ts:2** - Error formatting for zod validation errors
2. **api-keys.queries.ts:21** - Refactor to use api contracts package
3. **endpoints.$id.runs.tsx:171** - Implement backend searching for runs

Let me add the Web App section after the Subscriptions section (which ends at line 82):Let me verify the changes were applied correctly:## Summary: Task T004 Completed

I successfully added the **Web App** section to `docs/_RUNNING_TECH_DEBT.md` with the following three untracked TODOs:

1. **Clarify or remove zod error formatter** — `apps/web/src/lib/api-client/format-api-error.ts:2`
   - Documents the uncertainty about whether the `formatApiError` utility is needed

2. **Refactor API key types to use contracts package** — `apps/web/src/lib/api-client/queries/api-keys.queries.ts:21`
   - Documents the inline `CreateApiKeyInput` type that should be moved to the shared api-contracts package

3. **Implement backend searching for runs** — `apps/web/src/routes/_authed/endpoints.$id.runs.tsx:171`
   - Documents the commented-out search functionality in the runs table that needs backend implementation

The section follows the existing document format with:
- Status and Related context headers
- "Untracked TODOs" subsection
- Checkbox format (`- [ ]`) with bold title, file reference with line number, and detailed description## Summary: Task T004 Completed

I successfully added the **Web App** section to `docs/_RUNNING_TECH_DEBT.md` with the following three untracked TODOs:

1. **Clarify or remove zod error formatter** — `apps/web/src/lib/api-client/format-api-error.ts:2`
   - Documents the uncertainty about whether the `formatApiError` utility is needed

2. **Refactor API key types to use contracts package** — `apps/web/src/lib/api-client/queries/api-keys.queries.ts:21`
   - Documents the inline `CreateApiKeyInput` type that should be moved to the shared api-contracts package

3. **Implement backend searching for runs** — `apps/web/src/routes/_authed/endpoints.$id.runs.tsx:171`
   - Documents the commented-out search functionality in the runs table that needs backend implementation

The section follows the existing document format with:
- Status and Related context headers
- "Untracked TODOs" subsection
- Checkbox format (`- [ ]`) with bold title, file reference with line number, and detailed descriptionLet me try the correct path based on the plan context:Now I have both files. I can see:
1. The current `_RUNNING_TECH_DEBT.md` document with sections already added (AI Planner, Adapter Drizzle, Subscriptions, Web App - from tasks T001-T004)
2. The MCP Server README that contains the TODO items that need to be tracked

I need to add an MCP Server section after the Web App section. Let me add it:Task T005 is complete. Let me verify the edit was applied correctly:## Summary: Task T005 Completed

I've added the **MCP Server** section to `docs/_RUNNING_TECH_DEBT.md` with the resource implementation TODO. The new section:

- **Location**: Added between the Web App section (line 100) and the Rate Limiter section (line 120)
- **Format**: Follows the same structure as other sections with Status, Related, and Untracked TODOs headers
- **Content**: Documents the TODO from `apps/mcp-server/src/resources/README.md` which includes:
  - Declaring `resources` capability during server initialization
  - Implementing `resources/list` and `resources/read` handlers
  - Loading and parsing markdown files from `docs-v2/` with frontmatter metadata
  - Caching parsed resources in memory
  - Adding `gray-matter` dependency for frontmatter parsing
  - Testing integration with MCP inspector## Summary: Task T005 Completed

I've added the **MCP Server** section to `docs/_RUNNING_TECH_DEBT.md` with the resource implementation TODO. The new section:

- **Location**: Added between the Web App section (line 100) and the Rate Limiter section (line 120)
- **Format**: Follows the same structure as other sections with Status, Related, and Untracked TODOs headers
- **Content**: Documents the TODO from `apps/mcp-server/src/resources/README.md` which includes:
  - Declaring `resources` capability during server initialization
  - Implementing `resources/list` and `resources/read` handlers
  - Loading and parsing markdown files from `docs-v2/` with frontmatter metadata
  - Caching parsed resources in memory
  - Adding `gray-matter` dependency for frontmatter parsing
  - Testing integration with MCP inspectorLet me check for the correct path based on the context provided in the plan:I can see the current state of the tech debt document. The document already has sections for Redis/Rate Limiter and Sentry. According to task T006, I need to add an "Infrastructure Assessment Findings" section with Redis, Sentry, backups, encryption, and webhooks items.

Looking at the document, Redis and Sentry are already documented as separate sections. For T006, I need to add a consolidated Infrastructure Assessment Findings section that covers all 5 items: Redis rate limiting, Sentry, backups, encryption, and webhooks.

Let me add the Infrastructure Assessment Findings section at the end of the document:Let me verify the changes were applied correctly:## Summary

Task T006 has been completed. I added the **Infrastructure Assessment Findings** section to `docs/_RUNNING_TECH_DEBT.md` with the following 5 items:

1. **Redis for Rate Limiting** - References the existing detailed section for Redis migration, noting the need for shared state when horizontally scaling

2. **Sentry Error Tracking** - References the existing detailed section for Sentry integration, noting the need for centralized error aggregation and alerting

3. **Database Backups** - New item documenting the need for:
   - Automated daily backups with point-in-time recovery
   - Backup retention policy
   - Backup verification and restoration testing
   - Off-site backup storage for disaster recovery

4. **Data Encryption** - New item documenting the need to review and document:
   - Encryption at rest for database and file storage
   - Encryption in transit (TLS) verification
   - API key and secret storage encryption
   - Key rotation policy and procedures

5. **Webhooks System** - New item documenting the need for:
   - Webhook endpoint registration and management
   - Event types for run completions, failures, and status changes
   - Delivery retry logic with exponential backoff
   - Webhook signature verification for security
   - Delivery status tracking and debugging UI

The section follows the existing document format with checkbox items (`- [ ]`) and is properly structured with status, overview, and a checklist of actionable items.## Summary

Task T006 has been completed. I added the **Infrastructure Assessment Findings** section to `docs/_RUNNING_TECH_DEBT.md` with the following 5 items:

1. **Redis for Rate Limiting** - References the existing detailed section for Redis migration, noting the need for shared state when horizontally scaling

2. **Sentry Error Tracking** - References the existing detailed section for Sentry integration, noting the need for centralized error aggregation and alerting

3. **Database Backups** - New item documenting the need for:
   - Automated daily backups with point-in-time recovery
   - Backup retention policy
   - Backup verification and restoration testing
   - Off-site backup storage for disaster recovery

4. **Data Encryption** - New item documenting the need to review and document:
   - Encryption at rest for database and file storage
   - Encryption in transit (TLS) verification
   - API key and secret storage encryption
   - Key rotation policy and procedures

5. **Webhooks System** - New item documenting the need for:
   - Webhook endpoint registration and management
   - Event types for run completions, failures, and status changes
   - Delivery retry logic with exponential backoff
   - Webhook signature verification for security
   - Delivery status tracking and debugging UI

The section follows the existing document format with checkbox items (`- [ ]`) and is properly structured with status, overview, and a checklist of actionable items.