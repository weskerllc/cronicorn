# Automatic Credential Cleanup

## Feature Overview

The MCP server now **automatically detects and clears invalid credentials**, eliminating the need for users to manually delete credential files when authentication fails.

## How It Works

### 1. Expired Token Detection (Startup)
When the MCP server starts, it checks if stored credentials are expired:

```typescript
let credentials = await getCredentials();
if (credentials && isTokenExpired(credentials)) {
  console.error("⚠️  Token expired. Clearing credentials...");
  await deleteCredentials();
  // Initiates new device flow automatically
}
```

### 2. Invalid Token Detection (Runtime)
When any API call receives a 401 Unauthorized response:

```typescript
if (response.status === 401) {
  console.error("⚠️  Token is invalid (401 Unauthorized). Clearing credentials...");
  await deleteCredentials();
  throw new ApiError(
    401,
    "Authentication failed. Invalid or expired token. Please restart the MCP server to re-authenticate."
  );
}
```

## User Experience

### Before (Manual Process)
```bash
# User sees 401 error
❌ API Error (401): Unauthorized

# User must manually delete credentials
$ rm ~/.cronicorn/credentials.json

# User must restart editor
```

### After (Automatic Cleanup)
```bash
# User sees 401 error with helpful message
⚠️  Token is invalid (401 Unauthorized). Clearing credentials...
❌ Authentication failed. Invalid or expired token. Please restart the MCP server to re-authenticate.

# Credentials already deleted automatically
# User just needs to restart editor/IDE
```

## Benefits

1. **Better UX**: Users don't need to know where credentials are stored
2. **Fewer steps**: No manual file deletion required
3. **Clear guidance**: Error message tells exactly what to do next
4. **Automatic cleanup**: Prevents invalid credentials from persisting

## Implementation Details

### Files Modified

1. **`src/index.ts`**
   - Added `deleteCredentials()` import
   - Automatically clears expired credentials on startup

2. **`src/adapters/http-api-client.ts`**
   - Detects 401 responses
   - Automatically clears invalid credentials
   - Provides user-friendly error message

3. **`docs/AUTHENTICATION.md`**
   - Updated troubleshooting section
   - Documented automatic cleanup behavior

4. **`src/resources/docs/troubleshooting.md`** (NEW)
   - Created troubleshooting guide for users
   - Available as MCP resource for AI assistants

## Testing

### Test Expired Token
```bash
# Manually set expires_at to past timestamp
echo '{
  "access_token": "fake_token",
  "refresh_token": "",
  "expires_at": 1
}' > ~/.cronicorn/credentials.json

# Run MCP server
pnpm run dev

# Expected: Credentials auto-deleted, device flow starts
```

### Test Invalid Token
```bash
# Set a fake token
echo '{
  "access_token": "invalid_token",
  "refresh_token": "",
  "expires_at": 9999999999999
}' > ~/.cronicorn/credentials.json

# Run MCP server and make any API call
# Expected: 401 detected, credentials auto-deleted, helpful error shown
```

## Future Enhancements

Potential improvements:
1. **Automatic token refresh**: Use refresh tokens to get new access tokens
2. **Retry logic**: Automatically retry failed requests after re-authentication
3. **Session restoration**: Persist pending operations across authentication cycles

For now, the manual restart requirement is acceptable because:
- Authentication failures are rare (tokens last ~30 days)
- Restart is simple (reload VS Code window)
- Automatic cleanup removes most user friction
