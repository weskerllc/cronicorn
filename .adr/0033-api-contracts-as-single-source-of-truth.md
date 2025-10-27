# API Contracts as Single Source of Truth for Validation

**Date:** 2024-12-19
**Status:** Accepted

## Context

The web application had duplicate validation schemas scattered across multiple files, creating maintenance burden and potential for validation drift between frontend and backend. Specifically:

1. **Endpoint Forms**: Custom validation schemas in `apps/web/src/lib/endpoint-forms/schemas.ts` duplicated logic from API contracts
2. **Job Management**: Job edit forms defined separate validation rules from API contracts
3. **Query Parameters**: Search and filter schemas were independently defined without referencing API standards
4. **Cron Validation**: Custom lightweight regex validation in UI duplicated robust cronParser validation in API

This led to:
- **Validation Drift**: Changes to business rules required updates in multiple places
- **Inconsistent UX**: Different error messages between frontend validation and API responses  
- **Maintenance Overhead**: Schema changes needed to be synchronized across frontend and backend
- **Type Safety Gaps**: Transform functions used `any` types instead of proper API contract types

## Decision

**API contracts (`@cronicorn/api-contracts`) are now the single source of truth for all validation logic.**

### Implementation Strategy:

1. **Eliminate Duplicate Schemas**: Remove custom validation schemas in web app that duplicate API contract logic
2. **Minimal UI Schemas**: Keep only UI-specific presentation fields (e.g., `scheduleType` discriminator for form UX)
3. **Transform-time Validation**: Use API contract schemas in transform functions to validate before API calls
4. **Extend, Don't Duplicate**: When UI needs additional fields, extend API schemas rather than redefining

### Specific Changes:

**Endpoint Forms** (`apps/web/src/lib/endpoint-forms/`):
- Removed: Custom cron validation function
- Removed: Duplicate field validation (name, URL, method constraints)
- Kept: UI-specific `scheduleType` discriminator and `headers` array structure
- Added: API contract validation in `transformCreatePayload()` and `transformUpdatePayload()`

**Job Management**:
- `/jobs.$id.edit.tsx`: Now uses `UpdateJobRequestSchema` from API contracts
- `/jobs.new.tsx`: Already using `CreateJobRequestSchema` ✅

**Query Parameters**:
- `/endpoints.$id.runs.tsx`: Now extends `ListRunsQuerySchema` from API contracts

**Form Components**:
- Removed: `BasicEndpointFields`, `HeadersFields`, `ScheduleFields` components
- Replaced: Direct form implementation for better maintainability

## Consequences

### Benefits:
- **Validation Consistency**: Frontend and backend validation errors are identical
- **Single Source of Truth**: Business rule changes only need to happen in API contracts
- **Type Safety**: End-to-end type safety from API contracts to UI forms
- **Reduced Maintenance**: No need to synchronize validation logic across layers
- **Faster Development**: Forms automatically inherit new validation rules from API

### Code Changes:
- **Removed**: ~200 lines of duplicate validation code
- **Updated**: Transform functions now include `.parse()` calls using API contract schemas
- **Simplified**: UI schemas focus only on presentation concerns
- **Enhanced**: Proper TypeScript types throughout the form layer

### Potential Tradeoffs:
- **Dependency**: UI forms now depend on API contract package (acceptable - already existed)
- **Error Handling**: Need to handle API contract validation errors in transform functions
- **Bundle Size**: API contracts package included in frontend bundle (minimal impact - already included)

### Future Maintenance:
- **Adding Fields**: New fields should be added to API contracts first, then UI
- **Validation Rules**: All business validation logic lives in API contracts
- **UI-Specific Rules**: Only presentation-layer validation (like form field requirements) should exist in UI

## References

**Files Modified**:
- `apps/web/src/lib/endpoint-forms/schemas.ts` - Simplified to minimal UI-only schemas
- `apps/web/src/lib/endpoint-forms/utils.ts` - Added API contract validation
- `apps/web/src/routes/_authed/jobs.$id.edit.tsx` - Now uses `UpdateJobRequestSchema`
- `apps/web/src/routes/_authed/endpoints.$id.runs.tsx` - Now extends `ListRunsQuerySchema`

**Architecture Alignment**: This decision reinforces our hexagonal architecture by ensuring domain contracts (API schemas) remain authoritative while adapters (UI forms) handle only presentation concerns.