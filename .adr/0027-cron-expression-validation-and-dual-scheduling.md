# Cron Expression Validation and Dual Scheduling Modes

**Date:** 2025-10-23
**Status:** Accepted

## Context

The system previously only supported fixed-interval scheduling for endpoints (`baselineIntervalMs`). Users needed more flexible scheduling options, particularly cron-based schedules for complex timing patterns (e.g., "run every Monday at 9am"). Additionally, when cron expressions were added as an alternative (`baselineCron`), there was no validation to ensure the expressions were syntactically correct, leading to potential runtime errors.

Key requirements:
1. **Cron validation**: Ensure `baselineCron` strings are valid cron expressions before accepting them
2. **Mutually exclusive scheduling**: Enforce that endpoints use either cron OR interval, never both
3. **User-friendly UI**: Provide a clear interface for users to choose their preferred scheduling method

## Decision

We implemented a dual scheduling mode system with proper validation:

### Backend (API Contracts)

1. **Cron Validation Function**: Added `validateCronExpression()` using `cron-parser` library
   - Validates 5-field cron format (minute hour day month weekday)
   - Returns boolean for use in Zod refinement
   - Already available as dependency via `@cronicorn/adapter-cron`

2. **Schema Validation**: Enhanced `EndpointFieldsSchema` with:
   - Refined `baselineCron` field with validation error message
   - XOR constraint via `AddEndpointRequestSchema.refine()` ensuring exactly one scheduling method
   - Clear error messages for invalid cron expressions

```typescript
baselineCron: z
  .string()
  .optional()
  .refine(
    (val) => !val || validateCronExpression(val),
    { message: "Invalid cron expression. Use standard 5-field format..." },
  )
```

3. **Added Dependency**: Added `cron-parser` to `@cronicorn/api-contracts/package.json`

### Frontend (Web UI)

1. **Discriminated Union Schema**: Replaced simple optional fields with discriminated union:
   - `scheduleType: "interval"` → requires `baselineIntervalMinutes`
   - `scheduleType: "cron"` → requires `baselineCron`
   - TypeScript enforces correct field combinations at compile time

2. **Radio Group UI**: Added schedule type selector with two options:
   - "Fixed Interval" - displays minutes input
   - "Cron Expression" - displays cron input with 5-field format hint
   - Conditional rendering shows only relevant input field

3. **Client-Side Validation**: Added basic cron validation regex for immediate feedback
   - Validates 5-field structure
   - Checks for valid characters and month/day names
   - Server-side validation provides authoritative check

## Consequences

### Positive
- **Type Safety**: Discriminated unions prevent impossible states (both cron and interval set)
- **Early Validation**: Invalid cron expressions rejected at API boundary, not during execution
- **Better UX**: Clear choice between scheduling modes with contextual help text
- **Consistency**: Uses same `cron-parser` library as domain scheduling logic
- **Extensibility**: Easy to add more scheduling modes (e.g., one-time, custom intervals)

### Negative
- **Breaking Change**: Form schema changed from optional fields to discriminated union
  - Requires updating any existing form code
  - Default values must specify `scheduleType`
- **Dependency Added**: `cron-parser` now in API contracts (previously only in adapter-cron)
  - Acceptable: contracts are internal package, not published externally
  - Benefit: Validation happens at API boundary, not deep in domain

### Code Affected
- `packages/api-contracts/src/jobs/schemas.ts`: Added validation, refined schemas
- `packages/api-contracts/package.json`: Added `cron-parser` dependency
- `apps/web/src/routes/_authed/jobs.$jobId.endpoints.new.tsx`: Complete form rewrite
  - Discriminated union schema
  - Radio button schedule type selector
  - Conditional field rendering
  - Type-safe mutation payload construction

### Migration Notes

To revert or modify:
1. Remove `cron-parser` import and `validateCronExpression` from schemas.ts
2. Revert to simple optional fields instead of discriminated union
3. Update form to handle optional fields without type selector
4. Consider adding runtime checks if removing validation

## References

- Architecture: `.github/instructions/architecture.instructions.md` (Ports & Adapters)
- Related: ADR-0026 (AI hints override baseline scheduling)
- Library: `cron-parser` v4.9.0 documentation
- Existing Usage: `packages/adapter-cron/src/cron-parser-adapter.ts`
