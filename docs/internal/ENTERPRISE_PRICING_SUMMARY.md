# Enterprise Custom Pricing - Research Summary

**Status**: Research Complete - Ready for Implementation Decision  
**Date**: 2024-12-18  
**Documents**: [ADR-0054](../../.adr/0054-enterprise-custom-pricing-management.md) | [Implementation Guide](./enterprise-pricing-implementation-guide.md)

---

## Executive Summary

We have completed comprehensive research on how to manage custom enterprise pricing for Cronicorn. This document summarizes the findings and proposed solution.

### Current Problem

We have enterprise customers who need custom rates and monthly pricing beyond the standard plans, but we lack a systematic way to:
- Set customer-specific pricing (e.g., $199/month for Acme Corp)
- Track negotiated deals in our system
- Apply custom quota limits per customer
- Create Stripe subscriptions at custom prices
- Audit pricing changes over time

**Impact**: Sales team must contact engineering for every enterprise deal, causing delays and operational friction.

### Proposed Solution

Implement an **industry-standard database-backed custom pricing system** that gives sales/ops teams self-service control over enterprise pricing.

## How Major SaaS Companies Do This

After researching GitHub, Slack, Notion, and Stripe's own documentation, we found they all use the same pattern:

**Two-System Architecture:**
1. **Application Database** → Stores pricing logic, contract terms, custom limits
2. **Stripe** → Handles billing, payments, invoicing only

**Why this works:**
- ✅ Sales can negotiate any pricing without engineering
- ✅ Custom limits per customer (endpoints, tokens, etc.)
- ✅ Full audit trail of all pricing changes
- ✅ Scalable to thousands of custom deals
- ✅ Stripe remains payment orchestration layer

## What We'll Build

### 1. Database Tables (3 new tables)

**`custom_plans`** - Store negotiated plans
```
Example: "Acme Corp - Custom Plan"
- Price: $199/month
- Max Endpoints: 500
- Max Tokens: 5M/month
- Effective: 2024-01-01 to 2025-01-01
```

**`plan_audit_log`** - Track all changes
```
"Admin John assigned Acme Corp to Custom Plan on 2024-01-15"
Reason: "Negotiated in Q4 enterprise deal"
```

**`user.custom_plan_id`** - Link users to plans
```
If custom plan exists → use custom pricing/limits
If not → use standard tier (free/pro/enterprise)
```

### 2. Admin API & UI

Sales/ops teams get a self-service admin portal:

**Create Custom Plans:**
- Set monthly price, quota limits, effective dates
- Optionally create Stripe Price object
- Add description/notes about contract terms

**Assign Plans to Users:**
- Select user, select plan, add reason
- Creates audit log entry automatically
- Updates quotas immediately

**View Audit History:**
- See all pricing changes for any customer
- Filter by date, admin, action type
- Export for compliance/reporting

### 3. Updated Quota Enforcement

All quota checks will now respect custom plans:
- Token usage limit: Custom plan > Tier default
- Endpoint count: Custom plan > Tier default
- Min interval: Custom plan > Tier default
- Runs per month: Custom plan > Tier default

### 4. Stripe Integration

When creating a custom plan:
1. Admin creates plan in our database ($199/month, 500 endpoints)
2. Optionally creates Stripe Price object via API
3. Links Stripe price ID to our plan
4. When user checks out, uses custom price
5. Webhooks keep both systems in sync

## Implementation Timeline

**6-Week Rollout Plan:**
- Week 1: Database schema & migrations
- Week 2: Service layer & business logic
- Week 3: Admin API endpoints
- Week 4: Stripe integration & testing
- Week 5: Admin UI portal
- Week 6: Production deployment & docs

**Estimated Effort**: 1 senior engineer, 6 weeks

## Benefits

### For Sales Team
- ✅ No engineering needed for custom deals
- ✅ Assign plans immediately (no deploy wait)
- ✅ Track which customers have custom pricing
- ✅ View pricing history for renewals

### For Ops/Support
- ✅ See customer's exact plan and limits
- ✅ Audit trail for compliance questions
- ✅ Troubleshoot quota issues quickly

### For Engineering
- ✅ No code changes per custom deal
- ✅ Clean separation of concerns
- ✅ Maintainable and testable
- ✅ Industry-standard architecture

### For Business
- ✅ Close enterprise deals faster
- ✅ Flexible pricing negotiations
- ✅ Scale to hundreds of custom plans
- ✅ Full audit trail for compliance

## Cost/Risk Analysis

### Implementation Cost
- **Engineering Time**: 6 weeks (1 engineer)
- **Complexity**: Moderate (3 new tables, admin UI)
- **Database**: Minimal storage (~1KB per plan)

### Ongoing Cost
- **Stripe**: No additional fees (uses existing API)
- **Maintenance**: Low (self-service reduces support)
- **Operations**: Sales team training (1 day)

### Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Database/Stripe sync issues | Medium | Robust webhooks + manual sync tool |
| Admin permissions misuse | Low | Audit logs + role-based access |
| Complex pricing logic bugs | Medium | Comprehensive test coverage |
| Migration breaks existing users | High | Backward compatible design |

## Alternatives Considered

### ❌ Option 1: Use Only Stripe Products
- Create separate Stripe Product for each customer
- **Rejected**: Clutters Stripe dashboard, lacks flexibility

### ❌ Option 2: Hardcode Custom Tiers
- Add "enterprise_acme", "enterprise_foo" to code
- **Rejected**: Requires deploy per customer, not scalable

### ❌ Option 3: Custom Stripe Metadata Only
- Store pricing in Stripe metadata fields
- **Rejected**: Limited querying, no audit trail, hard to manage

### ✅ Option 4: Database-Backed (Chosen)
- Store plans in our database, use Stripe for billing
- **Accepted**: Industry standard, flexible, scalable

## Security & Compliance

### Access Control
- Admin endpoints require authentication + role check
- Manual admin role assignment only (no self-service)
- All actions logged with user ID and reason

### Audit Trail
- Every plan change logged immutably
- Includes before/after snapshots (JSONB)
- Retained indefinitely for compliance

### Data Privacy
- No PII in custom plans (only user IDs)
- GDPR: Audit logs retained with user consent
- Can export logs for customer requests

## What Happens Next?

### If Approved
1. Review implementation guide
2. Allocate engineering resources
3. Create Jira tickets from rollout plan
4. Begin Week 1 (database schema)

### If Changes Needed
1. Schedule review meeting
2. Discuss concerns/modifications
3. Update ADR and implementation guide
4. Re-submit for approval

### If Delayed
- Documents remain as reference design
- Can implement in phases if needed
- Standard tiers continue working as-is

## Questions & Answers

**Q: Can we start with manual Stripe Price creation?**  
A: Yes! Implementation guide includes option to skip auto-creation initially.

**Q: What if we want usage-based pricing later?**  
A: Architecture supports it. Add `usage_based` flag and metering logic.

**Q: How do existing enterprise customers migrate?**  
A: Create custom plan matching their current tier, then assign. Zero disruption.

**Q: Can we test this without affecting production?**  
A: Yes. Use Stripe test mode and test database. Full isolation.

**Q: What about annual billing?**  
A: Out of scope for MVP. Easy to add later (just another `interval` field).

## Resources

### Documentation
- **[ADR-0054](../../.adr/0054-enterprise-custom-pricing-management.md)** - Full architectural decision record with research
- **[Implementation Guide](./enterprise-pricing-implementation-guide.md)** - Complete code examples and step-by-step instructions

### Research References
- [Stripe Custom Pricing Best Practices](https://schematichq.com/use-cases/unified-pricing-model-stripe)
- [Enterprise Pricing Guide](https://www.withorb.com/blog/enterprise-pricing)
- [Multi-Tenant Database Design](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)

### Code References
- Existing: `packages/domain/src/quota/tier-limits.ts`
- Existing: `packages/services/src/subscriptions/manager.ts`
- Existing: `packages/adapter-stripe/src/stripe-client.ts`

## Contact

For questions or to schedule a review:
- Create GitHub issue with label `enterprise-pricing`
- Tag @engineering-team in Slack
- Email: engineering@cronicorn.com

---

**Ready to implement?** Start with the [Implementation Guide](./enterprise-pricing-implementation-guide.md) →
