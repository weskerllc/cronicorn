# ADR-0035: Endpoint Description Field for AI Context

**Date:** 2025-10-30  
**Status:** Accepted

## Context

Endpoints needed a way to provide additional context to the AI planner beyond just the endpoint name. Users want to specify:
- What the endpoint does (business purpose)
- Expected response schema structure
- Success/failure thresholds specific to this endpoint
- Any other contextual information that helps the AI make better scheduling decisions

The AI planner currently only has access to endpoint name, URL, and historical run data. Adding a description field allows users to provide semantic context that improves AI analysis quality.

## Decision

**Added optional `description` field to JobEndpoint entity** with these characteristics:

1. **Domain Entity** (`packages/domain/src/entities/endpoint.ts`):
   - Field: `description?: string`
   - Already existed from previous work
   - No changes needed

2. **Database Schema** (`packages/adapter-drizzle/src/schema.ts`):
   - Column: `description: text("description")`
   - Already existed from previous work
   - No migration needed

3. **API Contracts** (`packages/api-contracts/src/jobs/schemas.ts`):
   - Field in `EndpointFieldsBaseSchema`: `description: z.string().max(2000).optional()`
   - Max length of 2000 characters to allow detailed context while preventing abuse
   - Already existed from previous work

4. **UI Forms** (this ADR's implementation):
   - Added to both create and edit endpoint forms
   - Placed after name field for logical flow
   - Includes helpful placeholder text
   - Form schemas: `createEndpointSchema` and `updateEndpointSchema`
   - Transform functions: `transformCreatePayload`, `transformUpdatePayload`, `endpointToFormData`

5. **API Mapper** (`apps/api/src/routes/jobs/jobs.mappers.ts`):
   - Fixed `mapEndpointToResponse` to include description field
   - Was missing despite backend infrastructure existing

## Implementation Details

### UI Form Schema Changes

```typescript
// Both interval and cron variants updated
z.object({
  scheduleType: z.literal("interval"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(), // NEW
  url: z.string().min(1, "URL is required"),
  // ... other fields
})
```

### Transform Function Changes

```typescript
export function transformCreatePayload(data: CreateEndpointForm) {
  const payload: Partial<AddEndpointRequest> = {
    name: data.name,
    description: data.description, // NEW
    url: data.url,
    method: data.method,
  };
  // ... rest of function
}
```

### Form Field UI

```tsx
<FormField
  control={form.control}
  name="description"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Description (Optional)</FormLabel>
      <FormControl>
        <Input
          placeholder="e.g., Fetches user data for analytics dashboard"
          {...field}
          disabled={isPending}
        />
      </FormControl>
      <FormDescription>
        Endpoint-specific context: what it does, response schema, thresholds
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Consequences

### Positive

1. **Improved AI Context**: AI planner receives richer semantic information about endpoints
2. **User Documentation**: Description serves as inline documentation for endpoint purpose
3. **Optional Field**: No breaking changes - existing endpoints continue working without descriptions
4. **Reasonable Limits**: 2000 character max prevents database bloat while allowing detailed context
5. **Minimal Implementation**: Most infrastructure already existed; only needed UI and mapper updates

### Negative

1. **User Education**: Users need guidance on what makes a good description for AI context
2. **Potential Misuse**: Users might put sensitive data in descriptions (mitigated by documentation)
3. **No Validation**: Currently no AI-specific validation of description quality

### Affected Code

**Modified Files:**
- `apps/web/src/lib/endpoint-forms/schemas.ts` - Added description to form schemas
- `apps/web/src/lib/endpoint-forms/utils.ts` - Added description to transform functions
- `apps/web/src/routes/_authed/jobs.$jobId.endpoints.new.tsx` - Added description FormField
- `apps/web/src/routes/_authed/endpoints.$id.index.tsx` - Added description FormField
- `apps/api/src/routes/jobs/jobs.mappers.ts` - Fixed mapper to include description

**No Changes Needed** (infrastructure already existed):
- Domain entity
- Database schema
- API contracts

### Testing

- **Unit Tests**: Pass (230/231, same as before)
- **TypeScript**: All type errors resolved
- **Form Validation**: Zod schema ensures optional string type
- **API Contract**: Single source of truth enforced through API contracts

### Future Considerations

1. **Textarea Instead of Input**: For longer descriptions, consider upgrading to textarea component
2. **AI Prompt Engineering**: Document best practices for writing AI-friendly descriptions
3. **Markdown Support**: Consider allowing markdown formatting in descriptions
4. **Description Templates**: Provide examples/templates for common endpoint types
5. **AI Validation**: Potentially use AI to suggest description improvements

## References

- Related Tasks: TASK-12 through TASK-17, TASK-21
- Related ADRs:
  - ADR-0033: API Contracts as Single Source of Truth
  - ADR-0022: Hexagonal Architecture Enforcement
- Commit: `de41bfd` - feat(endpoints): add description field to UI forms
- Tests: 230/231 passing
