# Device Authorization Schema for OAuth Device Flow

**Date:** 2025-10-31  
**Status:** Accepted

## Context

We're implementing OAuth Device Flow to allow AI agents (MCP servers, CLI tools, etc.) to authenticate with Cronicorn without requiring a traditional browser-based OAuth flow. Better Auth provides a `deviceAuthorization` plugin, but its schema requirements are not fully documented, leading to runtime SQL errors during implementation.

### Problem Encountered

When implementing the device authorization plugin, we encountered a SQL syntax error:

```
error: syntax error at or near "where"
    at async Object.update
    at async file:///.../better-auth/dist/plugins/device-authorization/index.mjs:446:11
```

The error occurred when Better Auth's Drizzle adapter tried to update a device code record during token polling. The root cause was an empty `UPDATE SET` clause in the generated SQL, which happens when the adapter tries to update fields that don't exist in the schema.

### Discovery Process

Through incremental debugging, we discovered that Better Auth's `deviceAuthorization` plugin expects specific fields that were not documented in the official Better Auth documentation:

1. **Initial attempt**: Created basic schema with only `deviceCode`, `userCode`, `clientId`, `expiresAt`, `userId`, `status`
2. **First error**: Missing `pollingInterval` field
3. **Second error**: Missing `created_at` default value (needed `defaultNow()`)
4. **Third error**: Missing `updated_at` column entirely
5. **Final error**: Missing `lastPolledAt` and `scope` fields

By examining Better Auth's source code (`node_modules/better-auth/dist/plugins/device-authorization/index.mjs`), we found the complete schema definition:

```typescript
const schema = {
  deviceCode: {
    fields: {
      deviceCode: { type: "string", required: true },
      userCode: { type: "string", required: true },
      userId: { type: "string", required: false },
      expiresAt: { type: "date", required: true },
      status: { type: "string", required: true },
      lastPolledAt: { type: "date", required: false },
      pollingInterval: { type: "number", required: false },
      clientId: { type: "string", required: false },
      scope: { type: "string", required: false }
    }
  }
}
```

## Decision

We will implement the complete `device_codes` table schema as expected by Better Auth's `deviceAuthorization` plugin, including all required and optional fields:

### Required Fields
- `id` (text, primary key)
- `device_code` (text, unique, not null)
- `user_code` (text, unique, not null)
- `expires_at` (timestamp, not null)
- `status` (text, not null, default: "pending")
- `created_at` (timestamp, not null, default: now())
- `updated_at` (timestamp, not null, default: now(), auto-updated)

### Optional Fields
- `user_id` (text, references user.id)
- `client_id` (text)
- `scope` (text)
- `last_polled_at` (timestamp)
- `polling_interval` (integer)

### Field Purpose

- **lastPolledAt**: Tracks when the device last polled for authorization. Used by Better Auth to enforce minimum polling intervals (prevents polling too frequently).
- **pollingInterval**: Stores the minimum time (in milliseconds) that must elapse between polling requests. This is set during device code creation based on the plugin configuration.
- **scope**: OAuth scope string for the authorization request (optional, for future extensibility).
- **clientId**: Identifies which client application is requesting authorization (optional, enables multi-client support).

### Implementation

```typescript
export const deviceCodes = pgTable("device_codes", {
  id: text("id").primaryKey(),
  deviceCode: text("device_code").notNull().unique(),
  userCode: text("user_code").notNull().unique(),
  clientId: text("client_id"),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  lastPolledAt: timestamp("last_polled_at", { mode: "date" }),
  pollingInterval: integer("polling_interval"),
  scope: text("scope"),
});
```

## Consequences

### Positive
- **Works correctly**: All device authorization endpoints now function as expected
- **Polling protection**: `lastPolledAt` and `pollingInterval` enable rate limiting to prevent excessive API calls
- **Future-proof**: Includes `scope` and `clientId` for future multi-client and scope-based authorization
- **Type-safe**: Drizzle schema provides compile-time type checking
- **Complete**: Matches Better Auth's expectations exactly, avoiding runtime errors

### Negative
- **Storage overhead**: Additional fields consume database space (minimal impact, ~32 bytes per device code)
- **Complexity**: More fields to understand and maintain
- **Undocumented dependency**: Reliance on Better Auth's internal schema is fragile if they change it

### Mitigations
- **Testing**: Comprehensive tests for device flow endpoints ensure schema correctness
- **Documentation**: This ADR documents the complete schema and reasoning
- **Monitoring**: Track Better Auth version updates for breaking changes
- **Version pinning**: Lock Better Auth version to avoid surprise schema changes

## Lessons Learned

1. **Plugin schemas are not always documented**: Better Auth's plugin schemas must be discovered through source code inspection
2. **Empty UPDATE clauses cause SQL errors**: Missing fields in schema lead to adapter trying to update nothing, causing `UPDATE SET where ...` syntax errors
3. **Incremental debugging is effective**: Adding fields one at a time and testing after each migration helped isolate the issue
4. **Source code is the truth**: When documentation is incomplete, the plugin source code reveals exact requirements
5. **.$onUpdate() is code-level**: The `.$onUpdate(() => new Date())` is a Drizzle TypeScript feature, not a database constraint. It tells Drizzle to automatically set the field value when performing updates.

## Alternatives Considered

### Alternative 1: Minimal Schema (Only Required Fields)
**Rejected** because Better Auth's adapter code actively uses `lastPolledAt` and `pollingInterval` for polling rate limiting. Omitting these fields causes runtime errors.

### Alternative 2: Use Better Auth CLI to Generate Schema
**Not feasible** because Better Auth CLI's `generate` command doesn't have specific support for the device authorization plugin schema at the time of implementation.

### Alternative 3: Fork Better Auth and Fix Documentation
**Too slow** and doesn't solve our immediate need. We may contribute documentation improvements back to Better Auth, but we need a working solution now.

## References

- Better Auth Device Authorization Plugin: https://www.better-auth.com/docs/plugins/device-authorization
- OAuth 2.0 Device Authorization Grant: https://datatracker.ietf.org/doc/html/rfc8628
- Drizzle ORM Documentation: https://orm.drizzle.team/docs/overview
- Task: IMPLEMENTATION_CHECKLIST.md → Phase 1: Backend OAuth Setup

## Related Tasks

- TASK-1.1: Database & Schema ✅ Complete
- TASK-1.2: Better Auth Configuration ✅ Complete  
- TASK-1.3: API Endpoints Verification ✅ Complete
- TASK-1.4: Authentication Middleware ✅ Verified
