
🔧 Tool: Read
Input: {
  "file_path": "/apps/api/src/app.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "apps/api/src/**/*.ts"
}

🔧 Tool: Grep
Input: {
  "pattern": "webhooks",
  "path": "apps/api/src"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/app.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/routes/webhooks.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/lib/config.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api/src/auth/middleware.ts"
}

🔧 Tool: Grep
Input: {
  "pattern": "csrf",
  "path": "/Users/brandincanfield/Documents/Git/cronicorn/apps/api"
}

🔧 Tool: mcp__Context7__resolve-library-id
Input: {
  "query": "Hono CSRF middleware protection",
  "libraryName": "hono"
}

🔧 Tool: mcp__Context7__query-docs
Input: {
  "libraryId": "/honojs/website",
  "query": "CSRF protection middleware configuration origin validation"
}
Now I have all the information needed to create the specification.

---

# Specification: CSRF Protection Middleware

## 1. Problem
The API currently lacks explicit CSRF token validation on state-changing endpoints. While the app has baseline protection via SameSite=lax cookies and CORS origin validation, explicit CSRF protection is a recommended security practice, especially as the user base grows beyond 100 users.

## 2. Solution
Add Hono's built-in CSRF middleware to validate the `Origin` header on state-changing requests. The middleware will be configured to allow requests from `config.WEB_URL` while excluding webhook endpoints (which receive POST requests from external services like Stripe) using a custom validation function.

## 3. Acceptance Criteria

- **GIVEN** a browser POST request to a protected endpoint, **WHEN** the request includes a valid Origin header matching WEB_URL, **THEN** the request is allowed to proceed
- **GIVEN** a browser POST request to a protected endpoint, **WHEN** the request includes an invalid or missing Origin header from a different origin, **THEN** the request is rejected with 403 Forbidden
- **GIVEN** a POST request to `/webhooks/stripe`, **WHEN** the request comes from Stripe (cross-site), **THEN** the request bypasses CSRF validation and proceeds normally
- **GIVEN** an API key authenticated request (x-api-key header), **WHEN** the request is made without browser cookies, **THEN** the request proceeds normally (CSRF only applies to cookie-based auth)
- **GIVEN** a request to Better Auth routes (`/auth/*`), **WHEN** the request is made from the allowed origin, **THEN** the request proceeds normally

## 4. Files to Modify

| File | Purpose | Action |
|------|---------|--------|
| `apps/api/src/app.ts` | Main application setup with middleware | modify |

## 5. Implementation Tasks

```tasks
- [ ] T001: Import csrf middleware from hono/csrf | File: apps/api/src/app.ts
- [ ] T002: Add CSRF middleware after CORS middleware with custom origin/secFetchSite validation | File: apps/api/src/app.ts
- [ ] T003: Configure CSRF to exclude webhook routes from validation | File: apps/api/src/app.ts
```

## 6. Verification

1. **Manual Testing:**
   - Start the API server: `pnpm dev` in apps/api
   - Use curl to test CSRF protection:
     ```bash
     # Should fail (403) - POST without Origin header from different origin
     curl -X POST http://localhost:5010/api/jobs -H "Content-Type: application/json" -d '{}' -v
     
     # Should pass - POST with correct Origin header (if authenticated)
     curl -X POST http://localhost:5010/api/jobs -H "Content-Type: application/json" -H "Origin: http://localhost:5173" -d '{}' -v
     
     # Should pass - Webhook endpoint (bypasses CSRF)
     curl -X POST http://localhost:5010/api/webhooks/stripe -H "Content-Type: application/json" -H "stripe-signature: test" -d '{}' -v
     ```

2. **Verify in browser:**
   - Web app should continue to work normally (requests from same origin pass)
   - API key authenticated requests should continue to work

3. **Type checking:**
   - Run `pnpm typecheck` to ensure no TypeScript errors

---

[SPEC_GENERATED] Please review the specification above. Reply with 'approved' to proceed or provide feedback for revisions.Now I can see the current imports in the file. I need to add the `csrf` import from `hono/csrf` following the existing pattern. Looking at line 7, I can see the `cors` middleware is imported from `hono/cors`, so I'll add the `csrf` import in a similar location.Task T001 is complete. Here's what I implemented:

## Summary

**Task T001: Import csrf middleware from hono/csrf**

Added the CSRF middleware import to `apps/api/src/app.ts`:

```typescript
import { csrf } from "hono/csrf";
```

The import was added directly after the existing `cors` import from `hono/cors` on line 7, following the established pattern of grouping Hono middleware imports together.

This import makes the `csrf` middleware available for use in the subsequent tasks (T002 and T003) where it will be configured and applied to protect state-changing endpoints while excluding webhook routes.Task T001 is complete. Here's what I implemented:

## Summary

**Task T001: Import csrf middleware from hono/csrf**

Added the CSRF middleware import to `apps/api/src/app.ts`:

```typescript
import { csrf } from "hono/csrf";
```

The import was added directly after the existing `cors` import from `hono/cors` on line 7, following the established pattern of grouping Hono middleware imports together.

This import makes the `csrf` middleware available for use in the subsequent tasks (T002 and T003) where it will be configured and applied to protect state-changing endpoints while excluding webhook routes.Now I understand the codebase. I can see that:
1. T001 is already done - the `csrf` import from `hono/csrf` is on line 8
2. I need to add the CSRF middleware after the CORS middleware (which ends at line 86)
3. The middleware should use custom origin validation based on `config.WEB_URL`

Let me also check the Hono CSRF docs to understand the correct configuration:Now I have all the information I need. The CSRF middleware should:
1. Allow requests from `config.WEB_URL` origin
2. Be placed after the CORS middleware

I'll add the CSRF middleware right after the CORS middleware. Since T003 will handle webhook exclusions, I'll add the basic CSRF middleware now with origin validation:Now let me verify the change was applied correctly:Let me also run the TypeScript type checker to ensure the code is correct:The TypeScript errors are pre-existing issues in test files and unrelated to my CSRF middleware change. Let me specifically verify that the `app.ts` file has no TypeScript errors by checking for errors specifically mentioning `app.ts`:The CSRF middleware implementation has no TypeScript errors.

## Summary

**Task T002 completed:** Added CSRF middleware after CORS middleware with custom origin validation.

### What was implemented:

I added the CSRF middleware from `hono/csrf` (already imported in T001) right after the CORS middleware configuration. The middleware is configured with:

- **Custom origin validation**: Uses a function `(origin) => origin === config.WEB_URL` to validate that the request's Origin header matches the configured `WEB_URL`
- **Location**: Placed at line 88-96, immediately after the CORS middleware (which ends at line 86) and before the global error handler
- **Pattern**: Applied globally with `"*"` pattern to cover all routes

The CSRF middleware will:
1. Validate the `Origin` header on unsafe HTTP methods (POST, PUT, PATCH, DELETE)
2. Allow requests where the Origin matches `config.WEB_URL`
3. By default, also validate `Sec-Fetch-Site` header (allowing `same-origin`)
4. Reject requests with invalid Origin/Sec-Fetch-Site with 403 Forbidden

**Note:** T003 will add the webhook route exclusion to allow cross-site requests to `/webhooks/stripe`.The CSRF middleware implementation has no TypeScript errors.

## Summary

**Task T002 completed:** Added CSRF middleware after CORS middleware with custom origin validation.

### What was implemented:

I added the CSRF middleware from `hono/csrf` (already imported in T001) right after the CORS middleware configuration. The middleware is configured with:

- **Custom origin validation**: Uses a function `(origin) => origin === config.WEB_URL` to validate that the request's Origin header matches the configured `WEB_URL`
- **Location**: Placed at line 88-96, immediately after the CORS middleware (which ends at line 86) and before the global error handler
- **Pattern**: Applied globally with `"*"` pattern to cover all routes

The CSRF middleware will:
1. Validate the `Origin` header on unsafe HTTP methods (POST, PUT, PATCH, DELETE)
2. Allow requests where the Origin matches `config.WEB_URL`
3. By default, also validate `Sec-Fetch-Site` header (allowing `same-origin`)
4. Reject requests with invalid Origin/Sec-Fetch-Site with 403 Forbidden

**Note:** T003 will add the webhook route exclusion to allow cross-site requests to `/webhooks/stripe`.Now I can see the current state of the CSRF middleware. Task T002 has already added the CSRF middleware (lines 91-96), but it doesn't yet exclude webhook routes from validation. I need to configure it to exclude `/webhooks/*` routes.

Let me check the Hono CSRF middleware documentation to understand how to exclude specific routes:The documentation shows exactly what I need. The CSRF middleware supports a function-based `origin` validation that receives both the `origin` and the `context` (which has access to `c.req.path`). I can modify the origin validation function to:
1. Allow requests from `config.WEB_URL`
2. Skip CSRF validation for webhook routes by returning `true` for paths starting with `/webhooks/`

Let me update the CSRF middleware configuration:Let me verify the change was applied correctly:Now let me run the type checker to make sure there are no TypeScript errors:Let me check what script names are available:The pre-existing TypeScript errors are unrelated to my change (they're in test files about missing properties, drizzle-orm type issues, etc.). The errors are not in `app.ts`. Let me verify the specific file I edited compiles correctly by running a quick check on just that file:These are all pre-existing errors unrelated to my change - they're moduleResolution issues and other TypeScript configuration problems in the project. None of them are related to the CSRF middleware change in `app.ts`.

Let me check if there are any errors specifically in the lines I modified by looking at the CSRF middleware syntax:No TypeScript errors in `app.ts`. The change compiled cleanly.

## Summary - Task T003 Complete

I've configured the CSRF middleware to exclude webhook routes from validation by modifying the `origin` validation function in `apps/api/src/app.ts`.

### Changes Made

**File:** `apps/api/src/app.ts` (lines 88-103)

The CSRF middleware now uses a function-based `origin` validator that:

1. **Checks the request path** - If the path starts with `/api/webhooks/`, it returns `true` to skip CSRF validation (allowing external services like Stripe to POST to webhook endpoints)

2. **Validates origin for all other routes** - For non-webhook routes, it validates that the `Origin` header matches `config.WEB_URL`

### Code Change

```typescript
csrf({
  origin: (origin, c) => {
    // Skip CSRF validation for webhook routes (external services like Stripe)
    if (c.req.path.startsWith("/api/webhooks/")) {
      return true;
    }
    // Validate origin for all other routes
    return origin === config.WEB_URL;
  },
}),
```

This implementation follows the pattern shown in Hono's documentation for dynamic origin validation with path-based exclusions.No TypeScript errors in `app.ts`. The change compiled cleanly.

## Summary - Task T003 Complete

I've configured the CSRF middleware to exclude webhook routes from validation by modifying the `origin` validation function in `apps/api/src/app.ts`.

### Changes Made

**File:** `apps/api/src/app.ts` (lines 88-103)

The CSRF middleware now uses a function-based `origin` validator that:

1. **Checks the request path** - If the path starts with `/api/webhooks/`, it returns `true` to skip CSRF validation (allowing external services like Stripe to POST to webhook endpoints)

2. **Validates origin for all other routes** - For non-webhook routes, it validates that the `Origin` header matches `config.WEB_URL`

### Code Change

```typescript
csrf({
  origin: (origin, c) => {
    // Skip CSRF validation for webhook routes (external services like Stripe)
    if (c.req.path.startsWith("/api/webhooks/")) {
      return true;
    }
    // Validate origin for all other routes
    return origin === config.WEB_URL;
  },
}),
```

This implementation follows the pattern shown in Hono's documentation for dynamic origin validation with path-based exclusions.