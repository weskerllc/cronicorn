---
applyTo: '**'
---

# Playwright Instructions

## Authentication (CRITICAL - Read First)

**IMPORTANT:** Most pages in this application require authentication. You MUST authenticate BEFORE navigating to any page that might be protected (dashboard, jobs, endpoints, settings, etc.).

### How to Authenticate

**Always run this code snippet FIRST, before any navigation or screenshots:**

```typescript
await page.request.post('http://localhost:3333/api/auth/sign-in/email', {
  data: {
    email: 'admin@example.com',
    password: 'devpassword'
  }
});
```

This will set the authentication cookies automatically. After this, you can navigate to any protected route.

### Authentication Workflow

1. **First:** Run the authentication code above using `mcp_playwright_browser_run_code`
2. **Then:** Navigate to the desired page using `mcp_playwright_browser_navigate`
3. **Finally:** Take screenshots or interact with the page

### Common Mistake

❌ **Wrong:** Navigate → Get redirected to login → Screenshot login page → Think you're done

✅ **Correct:** Authenticate first → Navigate → Screenshot actual dashboard/page

### Protected Routes

These routes require authentication:
- `/dashboard` - Main dashboard
- `/jobs` - Jobs list and management
- `/endpoints` - Endpoints management  
- `/settings` - User settings
- Any route starting with `/dashboard/`

### Public Routes (No Auth Needed)

- `/` - Landing page
- `/login` - Login page
- `/signup` - Signup page
- `/docs` - Documentation

### Checking Authentication Status

After authenticating, you can verify by checking the URL after navigation:
- If you end up on `/login`, authentication failed
- If you stay on the intended route, authentication succeeded

### Troubleshooting Authentication Failures

If authentication fails (401 error or redirects to login):

**Default credentials:**
- Email: `admin@example.com`
- Password: `devpassword`

These defaults can be overridden via environment variables in the developer's `.env` file:
- `ADMIN_USER_EMAIL` - Custom admin email
- `ADMIN_USER_PASSWORD` - Custom admin password

If the default credentials don't work, look for an existing `.env` file.