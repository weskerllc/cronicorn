# ADR-0050: Optional Two-Factor Authentication (2FA) Evaluation and Implementation Plan

**Date:** 2025-11-20  
**Status:** Accepted

## Context

Cronicorn is an AI-powered job scheduler with a hosted platform and self-hosting options. The application currently implements robust authentication using Better Auth (v1.3.34) with multiple methods:

1. **GitHub OAuth** - For web UI users (session cookies)
2. **Email/Password** - For admin users (session cookies)
3. **Device Authorization** - For AI agents/CLI tools (Bearer tokens, OAuth RFC 8628)
4. **API Keys** - For service-to-service authentication

The question arose: **Should Cronicorn provide optional two-factor authentication (2FA)?**

### Current Authentication Landscape

**Existing Security Measures:**
- Session-based authentication with httpOnly, secure cookies
- Bearer token authentication for programmatic access
- API key rate limiting (100 requests/minute)
- Long-lived sessions with periodic refresh (30 days)
- Device authorization requiring explicit user approval
- Cross-origin authentication properly configured

**User Base:**
- Developer-focused SaaS platform
- Individual developers and teams
- Self-hosting option available
- Growing from MVP to enterprise-ready

### Industry Research: When B2B SaaS Needs 2FA

From industry standards and real-world examples:

**When 2FA is Critical:**
- Enterprise customers requiring vendor security assessments
- Compliance requirements (SOC 2, ISO 27001, PCI-DSS, HIPAA)
- Handling sensitive customer data or financial information
- Service accounts with privileged access
- Preventing account takeover attacks

**When 2FA Can Wait:**
- Early MVP stage with limited users
- Developer tools with non-sensitive data
- When existing auth mechanisms are strong (e.g., OAuth only)
- Limited enterprise customer demand

**Industry Best Practices:**
- Offer 2FA as **optional** for users who want it
- Make 2FA **mandatory** only for specific roles or enterprise plans
- Support TOTP (authenticator apps) over SMS for better security
- Provide backup codes for account recovery
- Consider phishing-resistant methods (WebAuthn/passkeys) for high-security scenarios

### Better Auth 2FA Capabilities

Better Auth provides a comprehensive `twoFactor` plugin with:

**Features:**
- **TOTP Support** - Time-based one-time passwords via authenticator apps (Google Authenticator, Authy, 1Password)
- **Backup Codes** - Generated during enrollment for account recovery
- **OTP Options** - Optional email/SMS-based codes
- **QR Code Generation** - Easy enrollment via QR code scanning
- **Trusted Devices** - Optional device management for improved UX
- **Configurable Issuer** - App branding in authenticator apps

**Implementation Pattern:**
```typescript
// Server-side (apps/api/src/auth/config.ts)
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    twoFactor({
      issuer: "Cronicorn",
      // Optional: Configure TOTP-only (no SMS/email)
      totpOptions: { 
        enabled: true,
      },
      otpOptions: {
        enabled: false, // Start with TOTP only
      },
    }),
  ],
});

// Client-side (apps/web/src/lib/auth-client.ts)
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});
```

**Database Schema:**
Better Auth automatically adds tables for 2FA (via migration):
- `twoFactor` - User's 2FA enrollment status and TOTP secrets
- `trustedDevice` - Optional trusted device management

**UI Components Available:**
The codebase already includes OTP input components from shadcn/ui:
- `packages/ui-library/src/components/input-otp.tsx`
- Ready for 6-digit TOTP code input

### Cronicorn-Specific Considerations

**Why 2FA Makes Sense:**
1. **Enterprise Readiness** - Tier system includes "enterprise" (already in schema), likely requires 2FA for procurement
2. **Sensitive Operations** - Job scheduling can trigger critical business processes
3. **API Key Management** - Users manage API keys that control their jobs
4. **Future Compliance** - SOC 2/ISO 27001 pathway easier with 2FA already built
5. **Competitive Positioning** - Similar tools (GitHub Actions, CircleCI, etc.) offer 2FA

**Why 2FA Can Wait:**
1. **Current User Base** - Primarily developers, not handling highly sensitive data yet
2. **Strong OAuth** - GitHub OAuth already provides good security baseline
3. **API Keys Available** - Service-to-service auth already separated from user accounts
4. **Development Velocity** - Focus may be better spent on core scheduling features

**Recommendation:**
Implement **optional 2FA** now with TOTP support for these reasons:
- Better Auth makes it trivial to add (plugin + migration)
- Positions Cronicorn as enterprise-ready
- Users who need it can enable it; others aren't forced
- Blocks enterprise deals less likely
- UI components already available
- Can be rolled out incrementally (optional → tier-based → mandatory for admins)

## Decision

**Implement optional two-factor authentication (2FA) using Better Auth's `twoFactor` plugin with the following approach:**

### Phase 1: Optional TOTP 2FA (Recommended Now)
1. **Server-side:** Add `twoFactor()` plugin to Better Auth configuration
2. **Database:** Run Better Auth migration to create 2FA tables
3. **API:** Expose 2FA endpoints (enable, verify, disable, generate backup codes)
4. **Client:** Add `twoFactorClient` plugin and integrate into auth-client
5. **UI:** Create 2FA enrollment flow in user settings
   - QR code display for initial setup
   - 6-digit code verification using existing `InputOTP` component
   - Backup codes display and download
   - 2FA status indicator
6. **Enforcement:** Keep 2FA optional for all users initially

### Phase 2: Tier-Based Enforcement (Future)
- Make 2FA mandatory for "enterprise" tier users
- Provide grace period for existing enterprise users to enroll
- Add UI indicator for required vs. optional 2FA

### Phase 3: Additional Methods (Future)
- WebAuthn/Passkeys for phishing-resistant authentication
- SMS/Email OTP as backup method (if customer demand exists)
- Trusted device management

### Implementation Guidelines

**Configuration:**
```typescript
// apps/api/src/auth/config.ts
twoFactor({
  issuer: "Cronicorn",
  totpOptions: {
    enabled: true,
    period: 30, // Standard 30-second TOTP window
  },
  otpOptions: {
    enabled: false, // Start with TOTP only
  },
  // Require verification before 2FA is active
  skipVerificationOnEnable: false,
})
```

**Migration:**
```bash
pnpm --filter @cronicorn/api auth:generate
# Review generated migration
pnpm db:migrate
```

**API Endpoints (automatically provided by Better Auth):**
- `POST /api/auth/two-factor/enable` - Generate QR code and backup codes
- `POST /api/auth/two-factor/verify-totp` - Verify and activate 2FA
- `POST /api/auth/two-factor/disable` - Disable 2FA (requires password)
- `POST /api/auth/two-factor/verify` - Verify TOTP code during login
- `GET /api/auth/two-factor/backup-codes` - Regenerate backup codes

**Client Integration:**
```typescript
// Enable 2FA
const { qrCodeUri, backupCodes } = await authClient.twoFactor.enable({
  password: userPassword,
});

// Verify setup
await authClient.twoFactor.verifyTotp({
  code: "123456",
});

// During login (if 2FA enabled)
await authClient.twoFactor.verify({
  code: "123456",
});
```

**UI Flow:**
1. User navigates to Settings → Security
2. Click "Enable Two-Factor Authentication"
3. Enter password to confirm
4. Display QR code and backup codes
5. User scans QR code with authenticator app
6. User enters 6-digit code to verify setup
7. Show success message with backup code download option
8. All future logins require TOTP code after password

### Security Considerations

**Best Practices:**
- TOTP secrets encrypted at rest (Better Auth handles this)
- Backup codes hashed (Better Auth handles this)
- Rate limiting on verification attempts (Better Auth provides this)
- Clear audit trail of 2FA events
- Password required to disable 2FA
- Backup codes can be regenerated
- 30-second TOTP time window (standard)

**User Experience:**
- Optional by default (no forced enrollment)
- Clear instructions during setup
- Backup codes prominently displayed
- Ability to disable if locked out (via backup codes or admin)
- "Trust this device" option for convenience (Phase 3)

## Consequences

### Positive

1. **Enterprise Readiness**: Cronicorn can check the "2FA support" box in security questionnaires
2. **Security Posture**: Users with sensitive deployments can protect their accounts
3. **Compliance Path**: Easier SOC 2/ISO 27001 certification when needed
4. **Competitive Positioning**: Matches security features of established platforms
5. **User Choice**: Optional approach respects developer autonomy
6. **Future-Proof**: Foundation for advanced auth features (passkeys, risk-based auth)
7. **Minimal Effort**: Better Auth plugin makes implementation straightforward

### Tradeoffs

1. **Development Time**: 
   - ~1-2 days for Phase 1 implementation
   - UI components, testing, documentation
   - **Mitigation**: Better Auth and existing OTP components reduce work
   
2. **User Friction**:
   - Additional step during login for enrolled users
   - **Mitigation**: Optional enrollment, "trust this device" in Phase 3
   
3. **Support Overhead**:
   - Users may lose access to authenticator app
   - **Mitigation**: Backup codes, clear recovery process
   
4. **Maintenance**:
   - Additional auth flows to test and maintain
   - **Mitigation**: Better Auth handles most logic, we test integration only

### Not Addressed (Future Work)

1. **Admin Override**: Admin ability to reset 2FA for locked-out users
2. **Audit Logging**: Detailed logs of 2FA events (enable, disable, verify success/fail)
3. **WebAuthn/Passkeys**: Phishing-resistant hardware key support
4. **Risk-Based Auth**: Adaptive 2FA based on login context
5. **SMS/Email Backup**: Alternative to TOTP (lower security but better accessibility)

### Code Affected

**New Files:**
- `apps/web/src/routes/_authed/settings/security.tsx` - 2FA settings page
- `apps/web/src/components/auth/two-factor-setup.tsx` - QR code and enrollment flow
- `apps/web/src/components/auth/two-factor-verify.tsx` - Code verification component
- `apps/web/src/lib/api-client/queries/two-factor.queries.ts` - React Query hooks

**Modified Files:**
- `apps/api/src/auth/config.ts` - Add `twoFactor()` plugin
- `apps/web/src/lib/auth-client.ts` - Add `twoFactorClient()` plugin
- `apps/web/src/routes/_public/login.tsx` - Add 2FA code input after password
- `packages/adapter-drizzle/src/schema.ts` - Add 2FA tables (via Better Auth migration)

**Database Schema:**
Better Auth will create these tables:
- `two_factor` - User enrollment status, TOTP secrets
- `backup_codes` - Hashed backup codes
- `trusted_devices` - Optional device management (Phase 3)

### Migration Path

**For Self-Hosted Users:**
- Migration adds new tables (non-breaking)
- 2FA is optional by default
- Existing auth methods continue working
- Update documentation with 2FA setup guide

**For Hosted Users:**
- Deploy 2FA feature flag initially disabled
- Enable for early adopters / beta testers
- Gradual rollout with monitoring
- Communicate new feature via changelog

## References

### Industry Standards
- [NIST Multi-Factor Authentication Guidelines](https://www.nist.gov/itl/smallbusinesscyber/guidance-topic/multi-factor-authentication)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [When to Implement Authentication in B2B SaaS](https://www.scalekit.com/blog/when-to-build-auth-b2b-saas)
- [Which Industries Require 2FA - Okta](https://www.okta.com/identity-101/which-industries-require-2fa/)

### Better Auth Documentation
- [Two-Factor Authentication Plugin](https://www.better-auth.com/docs/plugins/2fa)
- [Better Auth Client Plugins](https://www.better-auth.com/docs/client/plugins)
- [Database Migrations](https://www.better-auth.com/docs/concepts/database)

### Existing ADRs
- `.adr/0011-dual-auth-implementation.md` - Current authentication architecture
- `.adr/0043-conditional-login-ui-and-auth-config-endpoint.md` - Login UI patterns

### Related Files
- `apps/mcp-server/docs/AUTHENTICATION.md` - OAuth device flow documentation
- `packages/ui-library/src/components/input-otp.tsx` - Existing OTP input component

## Implementation Priority

**Recommendation: Implement Phase 1 (Optional TOTP 2FA) in the next sprint**

**Reasoning:**
1. Low implementation cost (1-2 days with Better Auth plugin)
2. High strategic value (enterprise readiness, competitive positioning)
3. Existing UI components available
4. Non-breaking change (optional feature)
5. Sets foundation for future security enhancements

**Alternative: Defer Until Enterprise Customer Demand**
If focusing on core scheduling features is more critical, 2FA can wait until:
- First enterprise customer explicitly requires it
- Preparing for SOC 2 audit
- Security questionnaires become blockers

However, implementing now is recommended to avoid rushed implementation later.
