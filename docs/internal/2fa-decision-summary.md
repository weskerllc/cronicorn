# Two-Factor Authentication Decision Summary

**Date:** 2025-11-20  
**Decision:** Implement optional TOTP-based 2FA  
**Timeline:** Recommended for next sprint (1-2 day effort)

## Executive Summary

After comprehensive research of industry standards, competitor implementations, and Cronicorn's current authentication architecture, **we recommend implementing optional two-factor authentication (2FA) using Better Auth's `twoFactor` plugin**.

## Key Findings

### 1. Industry Standard
- **All major developer platforms** offer 2FA (GitHub, CircleCI, GitLab, Vercel, Netlify)
- **TOTP via authenticator apps** is the industry standard (not SMS)
- **Optional by default** is most common for developer tools
- **Backup codes** are universally provided

### 2. Enterprise Requirements
- Enterprise customers expect 2FA for security questionnaires
- SOC 2 and ISO 27001 compliance favor 2FA
- B2B procurement often requires 2FA checkbox
- Lack of 2FA can block enterprise deals

### 3. Current State
- Cronicorn has strong baseline auth (GitHub OAuth, API keys, device authorization)
- Already has "enterprise" tier in schema
- No 2FA currently = behind industry standard
- UI components already exist (InputOTP)

### 4. Implementation Complexity
- **Low effort:** Better Auth plugin makes this 1-2 days
- **Non-breaking:** Optional feature, existing auth unaffected
- **Low risk:** Well-tested plugin, clear rollback path

## Decision

**✅ Implement optional TOTP 2FA in Phase 1 (next sprint)**

**Why Now:**
- Low implementation cost (1-2 days)
- High strategic value (enterprise readiness)
- Matches industry baseline
- Existing UI components available
- Positions for future growth

**Why Not Wait:**
- Could block enterprise sales
- Reactive implementation is rushed/stressful
- Sets security foundation early
- Competitive disadvantage without it

## Implementation Phases

### Phase 1: Optional TOTP (Next Sprint - 1-2 days)
- Add Better Auth `twoFactor` plugin
- Database migration for 2FA tables
- Security settings page with QR code enrollment
- Login flow with 2FA verification
- Backup codes for recovery
- **Status:** Optional for all users

### Phase 2: Tier-Based Enforcement (3-6 months)
- Mandatory for enterprise tier
- Optional for free/pro tiers
- Grace period for existing enterprise users
- **Status:** Aligns with enterprise strategy

### Phase 3: Advanced Features (6-12 months)
- WebAuthn/passkeys (phishing-resistant)
- Organization-level enforcement
- Admin dashboard for compliance
- **Status:** Competitive differentiation

## Comparison with Competitors

| Platform | 2FA Status | Type | Enforcement |
|----------|-----------|------|-------------|
| **GitHub** | Mandatory | TOTP, WebAuthn | All users |
| **CircleCI** | Mixed | TOTP only | Optional users, mandatory admins |
| **GitLab** | Optional | TOTP, WebAuthn | Org-configurable |
| **Vercel** | Optional | TOTP, SMS | Team-configurable |
| **Netlify** | Optional | TOTP only | None |
| **Heroku** | Optional | TOTP, SMS | None |
| **Cronicorn** | ❌ None | - | - |

**Target State (Phase 1):** Match Netlify/Heroku baseline  
**Target State (Phase 2):** Match CircleCI model  
**Target State (Phase 3):** Match GitLab/GitHub advanced features

## Technical Approach

**Server:**
```typescript
// apps/api/src/auth/config.ts
import { twoFactor } from "better-auth/plugins";

plugins: [
  twoFactor({
    issuer: "Cronicorn",
    totpOptions: { enabled: true },
    otpOptions: { enabled: false }, // No SMS
  }),
]
```

**Client:**
```typescript
// apps/web/src/lib/auth-client.ts
import { twoFactorClient } from "better-auth/client/plugins";

plugins: [twoFactorClient()]
```

**UI:**
- New route: `/settings/security`
- Components: QR code display, OTP input (existing), backup codes
- Update: Login flow adds 2FA verification step

## Benefits

### Strategic
- ✅ Enterprise sales readiness
- ✅ Competitive positioning
- ✅ Compliance pathway (SOC 2, ISO 27001)
- ✅ Security questionnaire checkbox

### Technical
- ✅ Low implementation effort (plugin-based)
- ✅ Non-breaking change
- ✅ Clear upgrade path to advanced features
- ✅ Minimal ongoing maintenance

### User Experience
- ✅ Optional (no forced friction)
- ✅ Industry-standard flow (QR code)
- ✅ Backup codes for recovery
- ✅ Users who need security get it, others unaffected

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Development time | 1-2 days | Better Auth plugin reduces complexity |
| User friction | Low | Optional enrollment, clear UI |
| Support overhead | Low | Backup codes handle most issues |
| Maintenance | Low | Better Auth handles core logic |

## Cost-Benefit Analysis

**Cost:**
- 1-2 days developer time
- ~30 minutes per month maintenance
- Minor support overhead (backup code resets)

**Benefit:**
- Removes enterprise sales blocker
- Matches industry standard
- Improves security posture
- Foundation for advanced features
- Estimated value: **High** (strategic positioning)

**ROI:** Positive (low cost, high strategic value)

## What's NOT Being Implemented (Yet)

- ❌ Mandatory 2FA
- ❌ SMS/Email OTP (security concerns)
- ❌ WebAuthn/Passkeys (Phase 3)
- ❌ Organization-level enforcement (Phase 2)
- ❌ Admin reset capabilities (future support feature)

## Documentation Delivered

1. **ADR:** `.adr/0050-optional-two-factor-authentication-evaluation.md`
   - Complete technical decision record
   - Industry analysis and rationale
   - Implementation approach

2. **Competitor Analysis:** `docs/internal/2fa-competitor-analysis.md`
   - How GitHub, CircleCI, GitLab, etc. implement 2FA
   - Industry patterns and trends
   - Competitive positioning

3. **Implementation Guide:** `docs/internal/2fa-implementation-guide.md`
   - Step-by-step technical instructions
   - Code examples for server and client
   - Testing approach
   - Deployment checklist

4. **This Summary:** `docs/internal/2fa-decision-summary.md`
   - Executive overview
   - Key findings and recommendations
   - Quick reference

## Recommended Action

**✅ Approve Phase 1 implementation for next sprint**

**Rationale:**
1. Industry standard feature - we're behind baseline
2. Low implementation cost (1-2 days)
3. High strategic value (enterprise readiness)
4. No breaking changes or user friction
5. Clear upgrade path for future phases

**Alternative Actions:**
- ⚠️ Defer until enterprise customer demand (reactive, may block deals)
- ❌ Skip entirely (not recommended - competitive disadvantage)

## Next Steps

If approved:

1. **Week 1:** Server-side implementation
   - Add Better Auth plugin
   - Run database migration
   - Test API endpoints

2. **Week 1-2:** Client-side implementation
   - Create UI components
   - Update login flow
   - Write tests

3. **Week 2:** Documentation & deployment
   - User documentation
   - Deploy to staging
   - Monitor and validate

4. **Week 3:** Production rollout
   - Feature flag rollout
   - Monitor adoption
   - Support user questions

## Questions?

See detailed documentation:
- Technical details → `.adr/0050-optional-two-factor-authentication-evaluation.md`
- Competitor analysis → `docs/internal/2fa-competitor-analysis.md`
- Implementation guide → `docs/internal/2fa-implementation-guide.md`

## Approval

- [ ] Product Owner
- [ ] Engineering Lead
- [ ] Security Review (if required)

**Approved for implementation:** ___________  
**Target sprint:** ___________
