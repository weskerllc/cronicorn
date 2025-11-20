# Two-Factor Authentication Implementation Guide

**Date:** 2025-11-20  
**Status:** Implementation Plan  
**Effort:** ~1-2 days  
**Reference ADR:** `.adr/0050-optional-two-factor-authentication-evaluation.md`

## Overview

This guide provides step-by-step instructions for implementing optional TOTP-based two-factor authentication in Cronicorn using Better Auth's `twoFactor` plugin.

## Prerequisites

- Better Auth v1.3.34+ (already installed)
- Existing OTP input component (`packages/ui-library/src/components/input-otp.tsx`)
- Database migrations capability
- React Query for client-side state

## Phase 1: Server-Side Setup

### Step 1: Update Better Auth Configuration

**File:** `apps/api/src/auth/config.ts`

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { 
  apiKey, 
  bearer, 
  deviceAuthorization,
  twoFactor  // Add this import
} from "better-auth/plugins";

export function createAuth(config: Env, db: Database) {
  return betterAuth({
    // ... existing config
    plugins: [
      bearer({ /* ... */ }),
      apiKey({ /* ... */ }),
      deviceAuthorization({ /* ... */ }),
      
      // Add 2FA plugin
      twoFactor({
        issuer: "Cronicorn",
        totpOptions: {
          enabled: true,
          period: 30, // Standard TOTP 30-second window
          digits: 6,   // Standard 6-digit codes
        },
        otpOptions: {
          enabled: false, // Start with TOTP only, no SMS/email
        },
        skipVerificationOnEnable: false, // Require verification before activation
      }),
    ],
  });
}
```

### Step 2: Generate and Run Database Migration

```bash
# Generate Better Auth migration for 2FA tables
cd apps/api
pnpm auth:generate

# Review the generated migration file
# Should create tables: two_factor, backup_codes

# Run migration
cd ../..
pnpm db:migrate
```

**Expected Tables:**
- `two_factor` - Stores user's TOTP secrets and enrollment status
- `backup_codes` - Stores hashed backup recovery codes

### Step 3: Update TypeScript Types (Optional)

**File:** `apps/api/src/auth/types.ts`

```typescript
import type { Auth } from "./config";

export type AuthContext = {
  session: Awaited<ReturnType<Auth["api"]["getSession"]>>;
  userId: string;
  twoFactorEnabled?: boolean; // Add this field
};
```

### Step 4: Test Server-Side Endpoints

Better Auth automatically exposes these endpoints:

```bash
# Start API server
pnpm dev:api

# Test endpoints exist (should return 401 or method details)
curl http://localhost:3333/api/auth/two-factor/enable
curl http://localhost:3333/api/auth/two-factor/verify-totp
curl http://localhost:3333/api/auth/two-factor/disable
```

## Phase 2: Client-Side Setup

### Step 1: Update Auth Client

**File:** `apps/web/src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/client";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
  plugins: [
    twoFactorClient(), // Add 2FA client plugin
  ],
});

export type AuthClient = typeof authClient;
```

### Step 2: Create React Query Hooks

**File:** `apps/web/src/lib/api-client/queries/two-factor.queries.ts`

```typescript
import { useMutation, useQuery } from "@tanstack/react-query";
import { authClient } from "../../auth-client";

/**
 * Enable 2FA - generates QR code and backup codes
 */
export function useEnableTwoFactor() {
  return useMutation({
    mutationFn: async (password: string) => {
      return authClient.twoFactor.enable({ password });
    },
  });
}

/**
 * Verify TOTP code during setup
 */
export function useVerifyTotpSetup() {
  return useMutation({
    mutationFn: async (code: string) => {
      return authClient.twoFactor.verifyTotp({ code });
    },
  });
}

/**
 * Disable 2FA
 */
export function useDisableTwoFactor() {
  return useMutation({
    mutationFn: async (password: string) => {
      return authClient.twoFactor.disable({ password });
    },
  });
}

/**
 * Verify TOTP code during login
 */
export function useVerifyTotpLogin() {
  return useMutation({
    mutationFn: async (code: string) => {
      return authClient.twoFactor.verify({ code });
    },
  });
}

/**
 * Get current 2FA status
 */
export function useTwoFactorStatus() {
  return useQuery({
    queryKey: ["twoFactorStatus"],
    queryFn: async () => {
      // Better Auth includes 2FA status in session
      const session = await authClient.getSession();
      return {
        enabled: session?.user?.twoFactorEnabled || false,
      };
    },
  });
}
```

## Phase 3: UI Components

### Step 1: Two-Factor Setup Component

**File:** `apps/web/src/components/auth/two-factor-setup.tsx`

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@cronicorn/ui-library/components/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEnableTwoFactor, useVerifyTotpSetup } from "@/lib/api-client/queries/two-factor.queries";
import QRCode from "qrcode.react"; // Install: pnpm add qrcode.react

interface TwoFactorSetupProps {
  password: string;
  onComplete: () => void;
}

export function TwoFactorSetup({ password, onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"qr" | "verify" | "backup">("qr");
  const [qrCode, setQrCode] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");

  const enableMutation = useEnableTwoFactor();
  const verifyMutation = useVerifyTotpSetup();

  const handleEnable = async () => {
    try {
      const result = await enableMutation.mutateAsync(password);
      setQrCode(result.qrCodeUri);
      setBackupCodes(result.backupCodes);
      setStep("verify");
    } catch (error) {
      console.error("Failed to enable 2FA:", error);
    }
  };

  const handleVerify = async () => {
    try {
      await verifyMutation.mutateAsync(verifyCode);
      setStep("backup");
    } catch (error) {
      console.error("Invalid code:", error);
    }
  };

  if (step === "qr") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enable Two-Factor Authentication</CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleEnable} disabled={enableMutation.isPending}>
            {enableMutation.isPending ? "Generating..." : "Generate QR Code"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "verify") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Use Google Authenticator, Authy, or 1Password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <QRCode value={qrCode} size={200} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Enter verification code:</label>
            <InputOTP
              maxLength={6}
              value={verifyCode}
              onChange={setVerifyCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={verifyCode.length !== 6 || verifyMutation.isPending}
          >
            Verify and Enable
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Backup codes display
  return (
    <Card>
      <CardHeader>
        <CardTitle>Save Your Backup Codes</CardTitle>
        <CardDescription>
          Store these codes safely. Each can be used once if you lose access to your authenticator.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, i) => (
                <div key={i}>{code}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>

        <Button onClick={onComplete}>Done</Button>
      </CardContent>
    </Card>
  );
}
```

### Step 2: Security Settings Page

**File:** `apps/web/src/routes/_authed/settings/security.tsx`

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTwoFactorStatus, useDisableTwoFactor } from "@/lib/api-client/queries/two-factor.queries";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { useState } from "react";

export const Route = createFileRoute("/_authed/settings/security")({
  component: SecuritySettings,
});

function SecuritySettings() {
  const [showSetup, setShowSetup] = useState(false);
  const [password, setPassword] = useState("");
  
  const { data: status } = useTwoFactorStatus();
  const disableMutation = useDisableTwoFactor();

  const handleDisable = async () => {
    const password = prompt("Enter your password to disable 2FA:");
    if (password) {
      await disableMutation.mutateAsync(password);
    }
  };

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground">Manage your account security</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            {status?.enabled && (
              <Badge variant="success">Enabled</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.enabled && !showSetup && (
            <Button onClick={() => setShowSetup(true)}>
              Enable 2FA
            </Button>
          )}

          {showSetup && (
            <TwoFactorSetup
              password={password}
              onComplete={() => {
                setShowSetup(false);
                // Refresh status
              }}
            />
          )}

          {status?.enabled && (
            <Button variant="destructive" onClick={handleDisable}>
              Disable 2FA
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 3: Update Login Flow

**File:** `apps/web/src/routes/_public/login.tsx`

Add 2FA verification step after password:

```typescript
// Existing login logic
const handleLogin = async (email: string, password: string) => {
  try {
    const result = await authClient.signIn.email({ email, password });
    
    // Check if 2FA is required
    if (result.requiresTwoFactor) {
      setShowTwoFactorPrompt(true);
      return;
    }
    
    // Redirect on success
    navigate({ to: "/dashboard" });
  } catch (error) {
    console.error("Login failed:", error);
  }
};

// Add 2FA verification
const handleTwoFactorVerify = async (code: string) => {
  try {
    await authClient.twoFactor.verify({ code });
    navigate({ to: "/dashboard" });
  } catch (error) {
    console.error("Invalid 2FA code:", error);
  }
};
```

## Phase 4: Testing

### Unit Tests

```typescript
// apps/api/src/auth/__tests__/two-factor.test.ts
import { describe, expect, test } from "vitest";
import { createTestAuth } from "./fixtures";

describe("Two-Factor Authentication", () => {
  test("user can enable 2FA", async () => {
    const auth = createTestAuth();
    const result = await auth.api.twoFactor.enable({
      password: "test-password",
    });
    
    expect(result.qrCodeUri).toBeDefined();
    expect(result.backupCodes).toHaveLength(10);
  });

  test("2FA verification required after login when enabled", async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
// apps/web/src/components/auth/__tests__/two-factor-setup.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { TwoFactorSetup } from "../two-factor-setup";

test("displays QR code after enabling 2FA", async () => {
  render(<TwoFactorSetup password="test" onComplete={() => {}} />);
  
  fireEvent.click(screen.getByText("Generate QR Code"));
  
  await screen.findByRole("img"); // QR code image
  expect(screen.getByText("Scan QR Code")).toBeInTheDocument();
});
```

## Phase 5: Documentation

### User Documentation

Create user guide: `docs/public/features/two-factor-authentication.md`

Topics:
- What is 2FA?
- Why enable 2FA?
- How to enable 2FA
- How to disable 2FA
- Using backup codes
- Supported authenticator apps

### Admin Documentation

Update admin guide with:
- Future: How to enforce 2FA for enterprise tier
- Future: How to reset 2FA for locked-out users

## Dependencies

Install new npm packages:

```bash
# QR code generation library
pnpm add qrcode.react
pnpm add -D @types/qrcode.react
```

## Deployment Checklist

- [ ] Server-side config updated
- [ ] Database migration run in staging
- [ ] Client-side hooks implemented
- [ ] UI components created
- [ ] Login flow updated
- [ ] Tests passing
- [ ] Documentation written
- [ ] Feature flag enabled (if using feature flags)
- [ ] Monitor for errors in production

## Rollback Plan

If issues arise:

1. **Remove twoFactor plugin** from `apps/api/src/auth/config.ts`
2. **Revert database migration** (optional - tables can remain)
3. **Hide UI components** (feature flag or remove from routes)
4. **No data loss** - existing auth continues to work

## Future Enhancements

After Phase 1 is stable:

1. **Tier-Based Enforcement** - Require 2FA for enterprise users
2. **WebAuthn/Passkeys** - Add FIDO2 hardware key support
3. **Trusted Devices** - "Don't ask again on this device" option
4. **Admin Dashboard** - View 2FA enrollment status across users
5. **Audit Logging** - Track 2FA events (enable/disable/verify)

## Support Resources

- [Better Auth 2FA Docs](https://www.better-auth.com/docs/plugins/2fa)
- [TOTP RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238)
- [Google Authenticator](https://support.google.com/accounts/answer/1066447)
- [Authy App](https://authy.com/)
