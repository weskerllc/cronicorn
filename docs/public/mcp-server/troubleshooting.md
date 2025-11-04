---
title: Troubleshooting Authentication
description: How to resolve authentication issues with the Cronicorn MCP Server
mcp:
  uri: "cronicorn://troubleshooting/authentication"
  priority: 10
tags: [user, assistant]
---

# Troubleshooting Authentication

## Authentication Failed (401 Unauthorized)

If you see this error:
```
Authentication failed. Invalid or expired token. Please restart the MCP server to re-authenticate.
```

**What happened:**
- Your authentication token is no longer valid
- The MCP server has automatically cleared the invalid credentials

**How to fix:**

1. **Restart your editor/IDE:**
   - **VS Code**: Reload the window (`Cmd+Shift+P` → "Developer: Reload Window")
   - **Other editors**: Restart the application

2. **Complete the device flow:**
   - A browser window will automatically open
   - Sign in with your GitHub account
   - Approve the device authorization request
   - The MCP server will save the new credentials

3. **Try your operation again**

## Token Expired

If you see messages about an expired token during startup, don't worry! The MCP server automatically:
1. Detects the expired token
2. Deletes the invalid credentials
3. Starts a new device authorization flow

Just complete the browser-based approval and you're good to go.

## Manual Credential Reset

If you need to manually reset your credentials:

```bash
# Delete the credentials file
rm ~/.cronicorn/credentials.json

# Restart your editor/IDE
```

## Where Are Credentials Stored?

Credentials are stored in: `~/.cronicorn/credentials.json`

This file contains:
- `access_token`: Your authentication token
- `refresh_token`: Token for refreshing (currently not used)
- `expires_at`: Unix timestamp when the token expires

The file has restricted permissions (0600) so only you can read it.

## Common Issues

### Browser Doesn't Open Automatically
- Manually navigate to the verification URL shown in the server logs
- Enter the user code displayed

### Device Code Expired
- You have 30 minutes to approve the device
- If it expires, just restart the MCP server to get a new code

### Still Having Issues?
- Check that the Cronicorn API is accessible
- Verify your internet connection
- Look for error messages in the MCP server logs (stderr)
- Report issues on [GitHub Discussions](https://github.com/weskerllc/cronicorn/discussions)
