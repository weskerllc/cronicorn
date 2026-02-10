# Easy Button UX Specification

**Goal:** Provide a frictionless way for users to connect their AI agents (Claude Desktop, VS Code Copilot, Cursor) to Cronicorn without maintaining agent-specific documentation.

---

## User Journey

### Entry Points

1. **Dashboard Homepage** - Prominent "🤖 Connect AI Agent" button in hero section
2. **Jobs Empty State** - "Set up an AI agent to create jobs automatically"
3. **API Keys Page** - "Or use MCP for zero-config AI integration"
4. **Settings → Integrations** - List item with setup button

### Modal Flow

```
User clicks "Connect AI Agent" 
  ↓
Modal opens with 3-step guide
  ↓
User copies NPX command
  ↓
User copies JSON config
  ↓
User finds their agent's config file (via their agent's docs)
  ↓
User pastes config & restarts agent
  ↓
MCP server runs → OAuth device flow triggers
  ↓
Browser opens to /device/approve
  ↓
User approves
  ↓
✅ AI agent connected!
```

---

## Component Specification

### ConnectAIAgentModal.tsx

**Location:** `apps/web/src/components/modals/ConnectAIAgentModal.tsx`

**State:**
- `isOpen: boolean`
- `copiedCommand: boolean`
- `copiedConfig: boolean`

**Props:**
```typescript
interface ConnectAIAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**UI Structure:**

```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        🤖 Connect AI Agent
      </DialogTitle>
      <DialogDescription>
        Set up your AI assistant to create and manage Cronicorn jobs automatically
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-6">
      {/* Step 1: Install MCP Server */}
      <StepCard number={1} title="Install the MCP Server">
        <p className="text-sm text-muted-foreground mb-3">
          Run this command in your terminal (no installation needed):
        </p>
        <CodeBlock 
          code="npx -y @cronicorn/mcp-server"
          language="bash"
          onCopy={() => setCopiedCommand(true)}
          copied={copiedCommand}
        />
        <Alert className="mt-3">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            This will start the authentication flow automatically
          </AlertDescription>
        </Alert>
      </StepCard>

      {/* Step 2: Add Configuration */}
      <StepCard number={2} title="Add to Your AI Agent">
        <p className="text-sm text-muted-foreground mb-3">
          Copy this configuration:
        </p>
        <CodeBlock 
          code={mcpConfigJson}
          language="json"
          onCopy={() => setCopiedConfig(true)}
          copied={copiedConfig}
        />
        <Accordion type="single" collapsible className="mt-3">
          <AccordionItem value="customization">
            <AccordionTrigger>
              Need to customize the config?
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <p><strong>For self-hosted:</strong></p>
                <CodeBlock 
                  code={selfHostedConfigJson}
                  language="json"
                />
                <p className="text-muted-foreground mt-2">
                  Change <code>CRONICORN_API_URL</code> to your instance URL
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </StepCard>

      {/* Step 3: Find Config File */}
      <StepCard number={3} title="Find Your Config File">
        <p className="text-sm text-muted-foreground mb-3">
          Your AI agent's documentation will tell you where to paste this.
        </p>
        
        <div className="space-y-3">
          <Card className="p-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <FileJsonIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Common Locations</p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                  <li>• <strong>Claude Desktop:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                  <li>• <strong>VS Code/Copilot:</strong> <code>.vscode/settings.json</code> → <code>"mcp.servers"</code></li>
                  <li>• <strong>Cursor:</strong> Check Cursor's MCP setup guide</li>
                </ul>
              </div>
            </div>
          </Card>

          {isMac && (
            <Alert>
              <LightbulbIcon className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>macOS Tip:</strong> Press <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> in Finder 
                to navigate to hidden folders like <code>~/Library</code>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://modelcontextprotocol.io/quickstart/user" 
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon className="mr-2 h-4 w-4" />
                Official MCP Setup Guide
              </a>
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleWatchVideo}>
              <PlayIcon className="mr-2 h-4 w-4" />
              Watch 30s Tutorial
            </Button>
          </div>
        </div>
      </StepCard>

      {/* Step 4: Authorize */}
      <StepCard number={4} title="Authorize">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            After restarting your AI agent:
          </p>
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>Your AI agent will run the MCP server automatically</li>
            <li>A browser window will open for authorization</li>
            <li>Approve the connection</li>
            <li>✅ You're connected! Try asking your AI to create a job</li>
          </ol>

          <Alert>
            <ShieldCheckIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              The authorization uses OAuth 2.0 Device Flow - the same secure method 
              used by GitHub CLI and AWS CLI. You can revoke access anytime in Settings.
            </AlertDescription>
          </Alert>
        </div>
      </StepCard>
    </div>

    <DialogFooter className="sm:justify-between">
      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <a href="/docs/ai-integration" target="_blank">
            Full Documentation
          </a>
        </Button>
        <Button onClick={handleViewConnectedDevices}>
          View Connected Devices
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Configuration Values

### Production Config

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"],
      "env": {
        "CRONICORN_API_URL": "https://cronicorn.com"
      }
    }
  }
}
```

### Self-Hosted Config

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"],
      "env": {
        "CRONICORN_API_URL": "https://your-instance.com"
      }
    }
  }
}
```

### Local Development Config

```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "node",
      "args": ["/absolute/path/to/cronicorn/apps/mcp-server/dist/index.js"],
      "env": {
        "CRONICORN_API_URL": "http://localhost:3333"
      }
    }
  }
}
```

---

## Reusable Components

### StepCard

```tsx
interface StepCardProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function StepCard({ number, title, children }: StepCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
            {number}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
```

### CodeBlock

```tsx
interface CodeBlockProps {
  code: string;
  language: string;
  onCopy?: () => void;
  copied?: boolean;
}

function CodeBlock({ code, language, onCopy, copied }: CodeBlockProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    onCopy?.();
    setTimeout(() => onCopy?.(), 2000); // Reset after 2s
  };

  return (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-md overflow-x-auto">
        <code className={`language-${language} text-sm`}>
          {code}
        </code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <CheckIcon className="mr-2 h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <CopyIcon className="mr-2 h-4 w-4" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
```

---

## Analytics Events

Track these events for funnel analysis:

```typescript
// When modal opens
analytics.track("AI Agent Modal Opened", {
  source: "dashboard_hero" | "jobs_empty_state" | "api_keys_page" | "settings"
});

// When user copies
analytics.track("AI Agent Config Copied", {
  type: "npx_command" | "json_config"
});

// When user clicks external links
analytics.track("AI Agent Help Clicked", {
  destination: "mcp_docs" | "video_tutorial"
});

// When device authorization succeeds
analytics.track("AI Agent Connected", {
  client_id: "cronicorn-cli", // or whatever client they used
  source: "device_flow"
});
```

---

## Error States

### NPM Package Not Published Yet

If `@cronicorn/mcp-server` doesn't exist on npm yet:

```tsx
<Alert variant="destructive">
  <AlertTriangle className="h-4 w-4" />
  <AlertDescription>
    <strong>Coming Soon!</strong> The MCP server will be available on npm shortly.
    For now, you can use API keys for programmatic access.
  </AlertDescription>
</Alert>
```

### User Already Has Connected Device

Show current connections:

```tsx
<Alert>
  <InfoIcon className="h-4 w-4" />
  <AlertDescription>
    You have 2 AI agents already connected. View them in{" "}
    <Button variant="link" className="p-0 h-auto" onClick={handleViewDevices}>
      Connected Devices
    </Button>
  </AlertDescription>
</Alert>
```

---

## Accessibility

- All steps keyboard navigable
- Copy buttons announce "Copied" to screen readers
- Code blocks have proper ARIA labels
- Modal can be closed with Escape key
- Focus trap within modal
- Focus returns to trigger button on close

---

## Mobile Considerations

- Modal is full-screen on mobile
- Code blocks scroll horizontally
- Copy buttons are touch-friendly (min 44x44px)
- Steps stack vertically
- Accordion for additional context on small screens

---

## Future Enhancements

### Phase 2: Smart Detection

Detect which AI agent the user likely has:

```tsx
// Detect based on user agent or OS
const detectedAgent = detectAIAgent();

<Alert>
  <SparklesIcon className="h-4 w-4" />
  <AlertDescription>
    Looks like you're using {detectedAgent}! Here's the config file location...
  </AlertDescription>
</Alert>
```

### Phase 3: One-Click Setup Script

Offer downloadable setup script for power users:

```bash
#!/bin/bash
# setup-cronicorn-mcp.sh

echo "🤖 Cronicorn MCP Setup"
echo "===================="

# Detect AI agent
if [ -d "$HOME/Library/Application Support/Claude" ]; then
  echo "✓ Detected Claude Desktop"
  CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
  # Auto-inject config...
fi

# Run npx to trigger auth
npx -y @cronicorn/mcp-server
```

---

## Success Metrics

- **Modal Open Rate**: % of users who open the modal
- **Config Copy Rate**: % who copy both command and config
- **Connection Success Rate**: % who successfully authorize a device
- **Time to First Connection**: Median time from modal open to device authorized
- **Drop-off Points**: Which step users abandon most

Target: **>70% of users who open modal should successfully connect**
