# Debugging MCP Server in VS Code

## Problem: Device Flow Not Triggering After Deleting Credentials

If you delete `~/.cronicorn/credentials.json` and reload VS Code but the device flow doesn't start, here's how to debug:

## Step 1: Verify the Build

The MCP server needs to be rebuilt after code changes:

```bash
cd /Users/bcanfield/Documents/Git/cronnew/cronicorn/apps/mcp-server
pnpm run build
```

Verify the build output exists:
```bash
ls -la dist/index.js
# Should show a recent timestamp
```

## Step 2: Check VS Code MCP Configuration

VS Code needs to know where to find your MCP server. Check your VS Code settings:

**Option A: User Settings (JSON)**
- Open Command Palette: `Cmd+Shift+P`
- Type: "Preferences: Open User Settings (JSON)"
- Look for MCP server configuration:

```json
{
  "mcp.servers": {
    "cronicorn": {
      "command": "node",
      "args": ["/Users/bcanfield/Documents/Git/cronnew/cronicorn/apps/mcp-server/dist/index.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

**Option B: Workspace Settings**
- Check `.vscode/settings.json` in your workspace

## Step 3: View MCP Server Logs

VS Code captures stderr output from MCP servers. To see the logs:

1. **Open Output Panel**: `Cmd+Shift+U` or View → Output
2. **Select MCP Server**: In the dropdown, look for "MCP" or "Cronicorn"
3. **Look for errors or authentication messages**

You should see:
```
🔧 Config loaded: {...}
No credentials found. Starting OAuth device authorization...
🔐 Cronicorn Device Authorization
```

## Step 4: Manual Test (Bypass VS Code)

Test the MCP server directly using the inspector:

```bash
cd /Users/bcanfield/Documents/Git/cronnew/cronicorn/apps/mcp-server
pnpm run inspect
```

This should:
1. Start the MCP Inspector in your browser
2. Show "No credentials found" in the terminal
3. Open a browser tab for device authorization

If this works but VS Code doesn't, the issue is with VS Code's MCP configuration.

## Step 5: Check MCP Server is Actually Running

After reloading VS Code:

```bash
# Check if node process is running the MCP server
ps aux | grep "mcp-server/dist/index.js"
```

If no process is found, VS Code isn't starting the server.

## Step 6: Force Restart MCP Server

In VS Code:
1. Open Command Palette: `Cmd+Shift+P`
2. Type: "MCP: Restart Server"
3. Select the Cronicorn server

Or completely restart VS Code:
1. `Cmd+Q` to quit
2. Reopen VS Code

## Common Issues

### Issue: VS Code is using old built version
**Solution**: 
```bash
cd apps/mcp-server
pnpm run build
# Then fully quit and restart VS Code (Cmd+Q)
```

### Issue: MCP server path is wrong in settings
**Solution**: Verify the path in settings.json points to the built dist/index.js

### Issue: Multiple VS Code windows open
**Solution**: Close all VS Code windows, then reopen. Each window may have its own MCP server instance.

### Issue: MCP extension not installed or enabled
**Solution**: 
- Check Extensions: Look for "Model Context Protocol" extension
- Enable if disabled
- Install if missing

### Issue: Environment variables not set
**Solution**: The MCP server auto-detects environment:
- Development: Uses `http://localhost:3333` and `http://localhost:5173`
- Production: Uses `https://cronicorn.com`

Make sure your local API server is running if testing in development.

## Expected Behavior After Fix

After deleting credentials and reloading:
1. **Terminal shows**: "No credentials found. Starting OAuth device authorization..."
2. **Browser opens**: Device authorization page
3. **Terminal shows**: User code and verification URL
4. **After approval**: "✅ Authentication successful!"
5. **Server starts**: "✅ Cronicorn MCP Server running"

## Still Not Working?

1. **Check MCP server logs** in VS Code Output panel
2. **Run manual test** with `pnpm run inspect`
3. **Verify API server** is running (development only)
4. **Check GitHub Issues**: https://github.com/weskerllc/cronicorn/issues
5. **Ask in Discussions**: https://github.com/weskerllc/cronicorn/discussions
