# Phase 2 Complete: Documentation Centralization

**Date:** November 2, 2025  
**Status:** ✅ Complete  

---

## Summary

Phase 2 of the marketing centralization plan is complete. The Docusaurus documentation app is now properly configured to use the `docs-v2` folder as its source of truth for all documentation.

---

## What Was Done

### 1. Docusaurus Configuration
- ✅ Configured `apps/docs/docusaurus.config.ts` to use `../../docs-v2` as the docs path
- ✅ Updated sidebar configuration to match the docs-v2 structure
- ✅ Fixed document ID references (Docusaurus transforms filenames)
- ✅ Updated navbar to use `docsSidebar` instead of deprecated `tutorialSidebar`
- ✅ Updated footer link to point to `/docs/introduction`

### 2. Sidebar Structure
The sidebar now correctly reflects the docs-v2 structure:

```typescript
docsSidebar: [
  'introduction',           // docs-v2/introduction.md
  'quick-start',           // docs-v2/quick-start.md
  'core-concepts',         // docs-v2/core-concepts.md
  {
    type: 'category',
    label: 'Technical',
    items: [
      'technical/system-architecture',                // docs-v2/technical/system-architecture.md
      'technical/how-scheduling-works',              // docs-v2/technical/how-scheduling-works.md
      'technical/how-ai-adaptation-works',           // docs-v2/technical/how-ai-adaptation-works.md
      'technical/configuration-constraints',         // docs-v2/technical/configuration-and-constraints.md
      'technical/coordinating-endpoints',            // docs-v2/technical/coordinating-multiple-endpoints.md
      'technical/technical-reference',               // docs-v2/technical/reference.md
    ],
  },
]
```

**Note:** Docusaurus transforms filenames:
- `configuration-and-constraints.md` → `configuration-constraints`
- `coordinating-multiple-endpoints.md` → `coordinating-endpoints`
- `reference.md` → `technical-reference`

### 3. Build Verification
- ✅ `pnpm -F @cronicorn/docs build` succeeds
- ✅ All documents properly loaded
- ✅ No broken links in the documentation
- ✅ Static files generated in `build/` directory

---

## File Structure

```
docs-v2/                                    # SOURCE OF TRUTH for docs
├── introduction.md
├── quick-start.md
├── core-concepts.md
├── README.md
└── technical/
    ├── _category_.yml
    ├── configuration-and-constraints.md
    ├── coordinating-multiple-endpoints.md
    ├── how-ai-adaptation-works.md
    ├── how-scheduling-works.md
    ├── reference.md
    └── system-architecture.md

apps/docs/                                  # Docusaurus app
├── docusaurus.config.ts                    # Points to ../../docs-v2
├── sidebars.ts                             # Sidebar structure
└── build/                                  # Generated static site
```

---

## Important Notes

### docs-v2 is the Source of Truth
- **Do NOT create a separate `apps/docs/docs/` folder**
- All documentation edits should be made in `/docs-v2/`
- The Docusaurus app reads directly from `docs-v2/`
- This keeps documentation in one place and avoids duplication

### Marketing Strategy Docs
The original plan included moving marketing strategy docs from `/docs/seo/` to the docs app. However, since we're using `docs-v2` as the source of truth, you have two options:

**Option A:** Keep marketing strategy docs in `/docs/seo/` (current state)
- Pros: Keeps internal strategy separate from public docs
- Cons: Not integrated with documentation site

**Option B:** Move marketing strategy docs to `docs-v2/internal/marketing/`
- Pros: All content in one place
- Cons: Need to configure Docusaurus to hide these from public sidebar
- Requires additional work to exclude from public navigation

**Recommendation:** Proceed with Option A for now (keep `/docs/seo/` as is), can migrate later if needed.

---

## Next Steps (Phase 3)

Now that the docs app is working, Phase 3 is to update the web app to use the `@cronicorn/content` package:

### 3.1 Update Homepage Components
- [ ] Update hero section to import from `@cronicorn/content/brand`
- [ ] Update feature sections to import from `@cronicorn/content/features`
- [ ] Update quick-answers section to use `@cronicorn/content/faq`

### 3.2 Update SEO/Meta Tags
- [ ] Import meta descriptions from `@cronicorn/content/seo`
- [ ] Import keywords from shared package
- [ ] Update OpenGraph/Twitter card data

### 3.3 Add Links to Docs
- [ ] Add "Documentation" link in navigation pointing to docs app
- [ ] Add "Read the Docs" CTAs in appropriate sections
- [ ] Ensure consistent branding between web app and docs app

### 3.4 Testing
- [ ] Verify web app looks identical after changes
- [ ] Test all components import correctly
- [ ] Verify no visual regressions
- [ ] Test that all links work

---

## Testing the Docs App

To test the documentation site locally:

```bash
# Start development server
pnpm -F @cronicorn/docs start

# Build for production
pnpm -F @cronicorn/docs build

# Serve production build
pnpm -F @cronicorn/docs serve
```

The docs site will be available at `http://localhost:3000`

---

## Deployment Notes

When ready to deploy:

1. **Build the docs app:** `pnpm -F @cronicorn/docs build`
2. **Deploy the `apps/docs/build` folder** to your hosting provider (Vercel, Netlify, etc.)
3. **Configure DNS:** Point `docs.cronicorn.com` to the deployed docs app
4. **Update web app:** Add navigation links to `docs.cronicorn.com`

---

## Success Criteria ✅

- [x] Docs app builds successfully
- [x] All documentation files from docs-v2 are accessible
- [x] Sidebar navigation is properly structured
- [x] No broken links
- [x] Ready for local development and testing

---

## Related Documents

- [Marketing Centralization Plan](/docs/MARKETING_CENTRALIZATION_PLAN.md) - Complete migration strategy
- [Phase 1 Complete](/docs/PHASE_1_COMPLETE.md) - Shared content package creation
- [docs-v2 README](/docs-v2/README.md) - Documentation structure guide
