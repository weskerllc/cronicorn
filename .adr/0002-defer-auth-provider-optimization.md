# Defer Authentication Provider for Home Page Performance

**Date:** 2025-11-13
**Status:** Accepted

## Context

The web application's home page was loading the authentication provider immediately on page load, causing unnecessary API calls and blocking the initial render. This resulted in:
- Large initial bundle (533 KB / 160 KB gzipped)
- Unnecessary auth API call on public pages
- Slower Time to Interactive (TTI)
- Poor Core Web Vitals scores

Industry best practices recommend deferring authentication initialization until it's actually needed (i.e., when accessing protected routes).

## Decision

We implemented a lazy authentication initialization pattern:

1. **Removed AuthProvider from App Root**: Moved `AuthProvider` from wrapping the entire app to only wrapping protected routes in the `_authed` layout.

2. **Lazy Auth Function**: Changed the router context from an eager Promise to a lazy function `() => Promise<AuthContextValue>` that only resolves when called.

3. **Protected Route Initialization**: The `_authed` layout now wraps its content with `AuthProvider` and resolves the auth client when needed.

4. **Public Routes**: Home page, pricing, terms, privacy, and other public routes no longer trigger any auth-related code or API calls.

## Implementation

```typescript
// Before: app.tsx
export default function App() {
  return (
    <AuthProvider>  {/* Wraps entire app */}
      <RouterProvider router={router} context={{ auth: authClient }} />
    </AuthProvider>
  )
}

// After: app.tsx
export default function App() {
  return (
    <RouterProvider router={router} context={{ auth: getAuthClient }} />
  )
}

// After: _authed.tsx
function AuthenticatedLayout() {
  const hookSession = useAuth();
  
  React.useEffect(() => {
    if (!hookSession.isLoading) {
      resolveAuthClient(hookSession);
    }
  }, [hookSession]);

  return (
    <AuthProvider>
      <AuthenticatedLayoutInner />
    </AuthProvider>
  );
}
```

## Consequences

### Positive
- **80% reduction** in home page initial bundle (533 KB → 101 KB)
- **No auth API calls** on public pages
- **Faster Time to Interactive** - critical content loads immediately
- **Better Core Web Vitals** - reduced main thread blocking
- **Improved caching** - auth code only loaded when needed

### Negative
- Slightly more complex auth initialization flow
- Need to ensure all protected routes properly initialize auth

### Migration Notes
- Protected routes must use `context.auth()` (function call) instead of `context.auth` (Promise)
- Any new protected routes should follow the `_authed` layout pattern

## References
- Task: Web app home page performance optimization
- Industry best practices: Defer non-critical resources
- React Router documentation on context and loaders
