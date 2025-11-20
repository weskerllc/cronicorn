# Secure Header Storage with Encryption

**Date:** 2025-11-20
**Status:** Accepted

## Context

Users configure HTTP headers on endpoints to authenticate with external APIs. These headers commonly contain sensitive credentials like:
- Bearer tokens (`Authorization: Bearer sk-...`)
- API keys (`X-API-Key: secret...`)
- Basic auth passwords
- OAuth tokens

Previously, these were stored in plaintext in the `headers_json` JSONB column in PostgreSQL. While database access is restricted, this poses unnecessary risk:
- Database backups contain plaintext credentials
- Database administrators can view sensitive tokens
- Compliance frameworks (SOC2, HIPAA) require encryption at rest for sensitive data
- Users need confidence their tokens are secure

## Decision

We implemented end-to-end encryption for sensitive request headers using AES-256-GCM:

### Backend Infrastructure
1. **Encryption Utility** (`packages/adapter-drizzle/src/crypto.ts`)
   - AES-256-GCM authenticated encryption
   - Key derivation via SHA-256 from `BETTER_AUTH_SECRET`
   - Format: `iv:authTag:encryptedData` (base64-encoded)
   - 16-byte random IV per encryption (prevents pattern analysis)

2. **Database Schema** 
   - Added `headers_encrypted` TEXT column to `job_endpoints` table
   - Kept existing `headersJson` JSONB column for backward compatibility
   - Migration allows gradual rollout without breaking existing data

3. **Repository Layer** (`DrizzleJobsRepo`)
   - Automatically encrypts headers on write if encryption secret is provided
   - Automatically decrypts on read
   - Falls back to plaintext if decryption fails (backward compatibility)
   - Clears plaintext column after encrypting

4. **Application Wiring**
   - Added optional `encryptionSecret` parameter to `DrizzleJobsRepo` constructor
   - Wired `BETTER_AUTH_SECRET` through composition roots in API, scheduler, and AI planner apps
   - Zero code changes required in business logic layer

### Frontend Security
1. **Secure Input Component** (`apps/web/src/components/composed/secure-header-input.tsx`)
   - Automatically detects sensitive headers (Authorization, API-Key, Token, etc.)
   - Masks values by default with password input type
   - Show/hide toggle with eye icon for user control
   - Applied to both endpoint creation and edit forms

## Consequences

### Positive
- ✅ **Production-ready security**: Industry-standard encryption protects sensitive credentials
- ✅ **Zero operational burden**: Uses existing `BETTER_AUTH_SECRET` (already required in production)
- ✅ **Backward compatible**: Existing plaintext headers still work, encrypted on next write
- ✅ **User confidence**: Masked UI inputs signal secure handling
- ✅ **Compliance-friendly**: Meets encryption-at-rest requirements
- ✅ **Minimal implementation**: ~200 LOC, no external dependencies beyond Node.js crypto

### Negative
- ⚠️ **Key management**: Encryption security depends on `BETTER_AUTH_SECRET` remaining secure
- ⚠️ **No key rotation**: Changing secret requires re-encrypting all headers (future enhancement)
- ⚠️ **Performance**: Encryption/decryption adds ~1ms per operation (negligible for our use case)
- ⚠️ **Zero-knowledge limitation**: Headers must be decrypted server-side to send to endpoints

### Neutral
- 📝 **Migration path**: Plaintext data encrypted on first write after deployment
- 📝 **Backward compatibility**: Old code without secret still reads plaintext from `headersJson`
- 📝 **UI masking only**: Frontend receives already-decrypted values (standard practice)

## Code Affected

### New Files
- `packages/adapter-drizzle/src/crypto.ts` (encryption utility)
- `packages/adapter-drizzle/src/__tests__/crypto.test.ts` (unit tests)
- `packages/adapter-drizzle/migrations/0017_magical_nick_fury.sql` (schema migration)
- `apps/web/src/components/composed/secure-header-input.tsx` (UI component)

### Modified Files
- `packages/adapter-drizzle/src/schema.ts` (added `headers_encrypted` column)
- `packages/adapter-drizzle/src/jobs-repo.ts` (encrypt/decrypt logic)
- `apps/api/src/lib/create-jobs-manager.ts` (wire encryption secret)
- `apps/api/src/lib/create-dashboard-manager.ts` (wire encryption secret)
- `apps/api/src/app.ts` (pass secret to factories)
- `apps/scheduler/src/index.ts` (wire encryption secret)
- `apps/ai-planner/src/index.ts` (wire encryption secret)
- `apps/web/src/routes/_authed/jobs.$jobId.endpoints.new.tsx` (use secure input)
- `apps/web/src/routes/_authed/endpoints.$id.edit.tsx` (use secure input)

## Alternatives Considered

1. **Database-level encryption (PostgreSQL pgcrypto)**
   - Rejected: Requires column-level encryption keys in application code anyway
   - Our approach is simpler and gives more control

2. **Secrets management service (AWS Secrets Manager, HashiCorp Vault)**
   - Rejected: Over-engineering for MVP, adds operational complexity
   - Can add later if needed for enterprise features

3. **Client-side encryption (zero-knowledge)**
   - Rejected: Can't send encrypted headers to external APIs
   - Would require decryption in browser (defeats purpose)

4. **No encryption, rely on database access controls**
   - Rejected: Doesn't meet compliance requirements
   - Unnecessary risk for credentials

## Future Enhancements

If needed, we can add:
- Key rotation mechanism (re-encrypt with new key)
- Per-tenant encryption keys (requires secrets management service)
- Audit log for header access (compliance requirement)
- Encrypted backups separate from main database

## References

- Related Issue/Task: Secure header storage implementation
- Encryption Standard: [NIST SP 800-38D (GCM)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- Node.js Crypto: [crypto.createCipheriv()](https://nodejs.org/api/crypto.html)
