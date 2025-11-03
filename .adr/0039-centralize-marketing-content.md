# Centralize All Marketing Content in Shared Package

**Date:** 2025-11-02
**Status:** Accepted

## Context

Marketing and brand content was scattered across multiple locations in the web app:
- 370-line `site-config.ts` file mixing content with runtime configuration
- Hardcoded content in components (`quick-answers-section.tsx`, `pricing.tsx`, `login.tsx`, `SEO.tsx`)
- Duplicate content across different files (taglines, descriptions, feature lists)
- No single source of truth for brand messaging

This made content updates difficult and error-prone, requiring changes in multiple files. It also created maintainability issues as the web app and docs site needed to share consistent brand messaging.

## Decision

We created a centralized `@cronicorn/content` shared package as the single source of truth for all marketing, brand, and SEO content. The package is organized into focused modules:

### Content Package Structure

```
packages/content/src/
├── brand.ts              - Core brand identity, taglines, headlines, value props
├── business.ts           - Company info for schema.org structured data
├── faq.ts                - FAQ items with categories
├── pricing.ts            - Pricing tiers data
├── pricing-content.ts    - Pricing page-specific features, FAQs, and marketing text
├── quick-answers.ts      - Homepage Q&A items
├── sections.ts           - Section headings used across pages
├── seo.ts                - Keywords, meta descriptions, OpenGraph, Twitter config
├── structured-data.ts    - Schema.org metadata (software features, login metadata)
├── urls.ts               - All URLs organized by category
└── index.ts              - Central export point
```

### Key Principles

1. **Content vs. Configuration**: Separated runtime configuration (`config.ts` with only `APP_URL`) from marketing content
2. **Type Safety**: All content exports are `as const` for maximum type safety
3. **Semantic Organization**: Content grouped by purpose (brand, SEO, pricing, etc.) not by page
4. **No Duplicates**: Eliminated redundant content (e.g., tagline appearing in multiple places)
5. **Shared Access**: Package imported by both web app and docs site via `@cronicorn/content`

### Migration Strategy

1. **Created content modules** for each category of content
2. **Updated components** to import from `@cronicorn/content` instead of local files
3. **Used icon maps** where components needed visual elements (icons dynamically selected based on content properties)
4. **Deleted redundant files** (`site-config.ts`, `headlines.ts`, `features.ts`)
5. **Removed duplicates** from content package itself

## Consequences

### Positive

- ✅ **Single source of truth**: All marketing content managed from one location
- ✅ **Easy updates**: Change brand messaging once, reflects everywhere
- ✅ **Type safety**: TypeScript ensures correct usage across apps
- ✅ **Consistency**: Web app and docs use identical brand messaging
- ✅ **Better organization**: Content grouped semantically, not by page
- ✅ **No duplication**: Zero redundant content across codebase
- ✅ **Smaller components**: Components focused on presentation, not content storage

### Neutral

- Components need to import content (but this is explicit and type-safe)
- Icon maps needed in components that pair icons with content (acceptable trade-off)

### Negative

- Initial migration effort (already completed)
- Need to maintain content package (but this is simpler than scattered content)

## Implementation Details

### What Moved to Content Package

- Brand identity (name, tagline, descriptions, value propositions)
- Headlines and messaging
- Meta descriptions and page titles
- SEO keywords (organized by tier: primary, secondary, technical, use-case)
- OpenGraph and Twitter Card configurations
- FAQ content (10 items with categories)
- Pricing tiers (3 tiers with features)
- Pricing page marketing text
- Quick answers for homepage
- Section headings
- Structured data for schema.org
- All URLs

### What Stayed in Components

- UI-specific text (form labels, placeholders, error messages)
- Dashboard/application text
- Aria labels for accessibility
- Icon map keys (these reference content package data)
- Page-specific keyword arrays (passed to SEO component)

### Files Deleted

- `apps/web/src/site-config.ts` (370 lines)
- `packages/content/src/headlines.ts` (redundant with brand.ts)
- `packages/content/src/features.ts` (unused)

### Files Updated

**Content Package:**
- Added `pricing-content.ts` with `pricingText` for marketing copy
- Added `structured-data.ts` with `software.featureList` for schema.org

**Web App:**
- Updated `SEO.tsx` to use `contentStructuredData.software.featureList`
- Updated `pricing.tsx` to use `pricingText.hero.subtitle`, `pricingText.cta.subtitle`, `pricingText.testimonials.heading`
- Updated `login.tsx` to use `structuredData.login.*`
- Updated `quick-answers-section.tsx` to use `quickAnswers` array
- Created minimal `config.ts` (6 lines, only `APP_URL`)

## Verification

- ✅ All builds passing (web app: 5.62s)
- ✅ No TypeScript errors
- ✅ No ESLint warnings
- ✅ Zero hardcoded marketing content in web app
- ✅ Zero duplicates in content package
- ✅ All components properly importing from `@cronicorn/content`

## References

This decision affects content management across the entire marketing surface area and establishes the pattern for future content additions.
