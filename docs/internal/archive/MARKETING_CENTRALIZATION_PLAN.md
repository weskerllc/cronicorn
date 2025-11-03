# Marketing Content Centralization Plan

**Created:** 2025-11-02  
**Status:** Proposal  
**Priority:** High  

---

## Executive Summary

**Problem:** Marketing content is scattered across 4+ locations with significant duplication, making updates error-prone and maintenance difficult.

**Solution:** Centralize all content in the docs app (Docusaurus), create a shared content package for consistency, and slim down the web app to focus solely on authentication and application functionality.

**Impact:** Single source of truth, easier maintenance, better SEO, clearer separation of concerns.

---

## Current State Analysis

### Content Locations Audit

#### 1. `/docs/seo/` (5 comprehensive strategy documents)
- `brand-voice.md` - Detailed voice guidelines, messaging framework
- `seo-strategy.md` - Keywords, meta tags, 6-month roadmap
- `marketing-overview.md` - Complete strategy and quick start
- `copy-cheatsheet.md` - Quick reference for messaging
- `landing-page.md` - Page-by-page blueprint with copy

**Status:** Comprehensive strategy docs, but disconnected from implementation

#### 2. `apps/web/src/site-config.ts` (central config)
```typescript
// Contains:
- headlines (hero, problem/solution, emotional)
- metaDescriptions (home, pricing, docs, faq, login)
- pageTitles
- urls (all site links)
- seo (keywords, OpenGraph, Twitter cards)
- faq (10 primary questions with answers)
- splash (section headings, CTAs)
- business (structured data for schema.org)
- pricing (3 tiers with features)
```

**Status:** Implementation config, but duplicates content from strategy docs

#### 3. `apps/web/src/components/sections/quick-answers-section.tsx`
- 4 FAQ-style cards with questions and rich answers
- Custom formatting (definition, rich, examples, comparison)
- Schema.org structured data

**Status:** Duplicate FAQ content, different format from site-config.ts

#### 4. `TECHNICAL_SYSTEM_EXPLANATION.md`
- Deep technical documentation
- Architecture explanations
- Not marketing content, but needs to be accessible

**Status:** Valuable content, needs to be linked from docs site

### Problems Identified

1. **Duplication**
   - FAQ exists in 3 places: site-config.ts, quick-answers-section.tsx, and seo/landing-page.md
   - Taglines/headlines differ across locations
   - Features described differently in different files

2. **Inconsistency**
   - Primary tagline in brand-voice.md: "Intelligent job scheduling that adapts to your reality"
   - Primary tagline in site-config.ts: "Intelligent job scheduling that adapts to your reality" ✓ (matches)
   - But quick-answers section has different power sentences

3. **No Single Source of Truth**
   - Want to update a tagline? Need to check 3+ files
   - Want to add an FAQ? Need to update 2+ locations
   - Want to change brand voice? Implementation might not reflect strategy

4. **Scattered Ownership**
   - Strategy docs in /docs/seo/ (for planning)
   - Implementation in apps/web (for execution)
   - No clear link between them

5. **Limited Scalability**
   - No blog infrastructure
   - No central place for use cases
   - Hard to add new marketing pages

---

## Proposed Architecture

### Three-Tier Structure (REVISED - Keeps Custom Homepage)

```
┌─────────────────────────────────────────────────────────┐
│  apps/web (TanStack Start)                              │
│  → Primary site: cronicorn.com                          │
│                                                         │
│  CONTAINS:                                              │
│  - Custom marketing homepage (KEEP AS IS)               │
│  - /pricing - Pricing page                              │
│  - /faq - FAQ page                                      │
│  - /login - Authentication                              │
│  - /signup - Registration                               │
│  - /dashboard/* or /app/* - Dashboard                   │
│                                                         │
│  PULLS FROM: @cronicorn/content package                 │
│  LINKS TO: docs.cronicorn.com for all documentation     │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │ imports
                         │
┌─────────────────────────────────────────────────────────┐
│  packages/content                                       │
│  → Shared content: @cronicorn/content                   │
│                                                         │
│  CONTAINS:                                              │
│  - brand.ts (taglines, descriptions, core messaging)    │
│  - faq.ts (FAQ data structure)                          │
│  - seo.ts (keywords, meta descriptions)                 │
│  - features.ts (feature descriptions)                   │
│  - use-cases.ts (use case summaries)                    │
│                                                         │
│  CONSUMED BY: Both apps/docs AND apps/web               │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │ imports
                         │
┌─────────────────────────────────────────────────────────┐
│  apps/docs (Docusaurus)                                 │
│  → Documentation site: docs.cronicorn.com               │
│                                                         │
│  CONTAINS:                                              │
│  - All user-facing documentation                        │
│  - Blog for content marketing                           │
│  - Internal strategy docs (/docs/internal/marketing/)   │
│  - Use case guides (detailed)                           │
│  - API reference                                        │
│  - Technical deep dives                                 │
│                                                         │
│  PULLS FROM: @cronicorn/content package                 │
└─────────────────────────────────────────────────────────┘
```

### Domain Strategy

**Recommended: Subdomain for Docs**

- `cronicorn.com` → apps/web (TanStack Start) - **KEEPS YOUR CUSTOM HOMEPAGE**
  - `/` - Custom marketing homepage (current implementation)
  - `/pricing` - Pricing page
  - `/faq` - FAQ page  
  - `/login` - Authentication
  - `/signup` - Registration
  - `/dashboard/*` or `/app/*` - Dashboard
  - Links to `docs.cronicorn.com` for documentation

- `docs.cronicorn.com` → apps/docs (Docusaurus)
  - `/` - Documentation homepage/intro
  - `/getting-started/*` - Quickstart guides
  - `/guides/*` - Use cases and tutorials
  - `/technical/*` - Architecture, deep dives
  - `/api/*` - API reference
  - `/blog/*` - Content marketing blog
  - `/internal/marketing/*` - Strategy docs (can be hidden/password-protected)

**Benefits:**
- ✅ **Keep your beautiful custom homepage** in the web app
- ✅ Clear separation: Marketing site vs Documentation site
- ✅ Industry standard (Stripe, Vercel, Next.js all do this)
- ✅ Less risky migration (homepage stays as is)
- ✅ Each site can be deployed independently
- ✅ SEO optimized (both sites contribute to domain authority)

**Alternative: Path-based routing**
- `cronicorn.com/*` → apps/web
- `cronicorn.com/docs/*` → apps/docs (proxied or reverse proxy)

**Recommendation:** Subdomain (docs.cronicorn.com) for cleaner separation, easier deployment

---

## Detailed File Structure

### packages/content/

```
packages/content/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # Main exports
    ├── brand.ts          # Core brand identity
    ├── faq.ts            # FAQ data
    ├── seo.ts            # SEO metadata
    ├── features.ts       # Feature descriptions
    ├── use-cases.ts      # Use case summaries
    └── types.ts          # Shared TypeScript types
```

**Example: packages/content/src/brand.ts**
```typescript
export const brand = {
  name: "Cronicorn",
  tagline: "Intelligent job scheduling that adapts to your reality",
  
  oneLiners: {
    primary: "Never Miss the Perfect Moment to Run Your Code",
    alternatives: [
      "Your Jobs Deserve a Smarter Scheduler",
      "Stop Fighting Your Scheduler",
      "Adaptive automation for modern operations"
    ]
  },
  
  elevatorPitch: "Cronicorn is an AI-powered job scheduler that automatically adapts to your system's reality. Instead of checking everything at the same pace regardless of what's happening, it tightens monitoring during incidents, activates investigation tools, attempts recovery, and only alerts when human intervention is truly needed. Teams reduce alert fatigue by 80% and resolve issues 10x faster.",
  
  description: "AI-powered HTTP job scheduler that automatically adapts to real-time conditions—tightening monitoring during incidents and relaxing during recovery. Reduce alert fatigue, speed up recovery, and sleep better.",
  
  valueProps: [
    {
      title: "Reduce Alert Fatigue 80%",
      description: "Smart escalation, not notification spam"
    },
    {
      title: "10x Faster Issue Resolution",
      description: "Detect earlier, recover automatically"
    },
    {
      title: "Zero Schedule Maintenance",
      description: "Set baselines once, AI handles adjustments"
    }
  ]
} as const;
```

**Example: packages/content/src/faq.ts**
```typescript
export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export const faq: FAQItem[] = [
  {
    question: "What types of jobs can I schedule with Cronicorn?",
    answer: "Cronicorn can schedule any job triggered by HTTP requests including API health checks, webhooks, data pipelines, notification workflows, batch processing, cache warming, and automated testing. Our platform supports diverse use cases from e-commerce monitoring to DevOps automation.",
    category: "capabilities"
  },
  {
    question: "How does AI make scheduling decisions?",
    answer: "Cronicorn's AI analyzes execution patterns including success rates, response times, and failure streaks. It applies proven strategies like increasing monitoring frequency when metrics deteriorate, pausing endpoints during persistent failures, activating investigation tools when health checks detect issues, and gradually relaxing monitoring as systems recover.",
    category: "ai-features"
  },
  // ... more items from site-config.ts faq
];
```

### apps/docs/

```
apps/docs/
├── docs/
│   ├── getting-started/
│   │   ├── intro.md
│   │   ├── quickstart.mdx
│   │   └── installation.mdx
│   │
│   ├── guides/
│   │   └── use-cases/
│   │       ├── devops-monitoring.mdx
│   │       ├── ecommerce-flash-sales.mdx
│   │       ├── data-pipelines.mdx
│   │       ├── web-scraping.mdx
│   │       └── saas-usage-tracking.mdx
│   │
│   ├── technical/
│   │   ├── architecture.mdx          # From /docs/architecture.md
│   │   ├── deep-dive.mdx             # From TECHNICAL_SYSTEM_EXPLANATION.md
│   │   └── authentication.mdx
│   │
│   ├── api/
│   │   └── reference.mdx
│   │
│   └── internal/                     # Internal strategy docs (not in sidebar by default)
│       ├── marketing/
│       │   ├── brand-voice.md        # From /docs/seo/brand-voice.md
│       │   ├── seo-strategy.md       # From /docs/seo/seo-strategy.md
│       │   ├── overview.md           # From /docs/seo/marketing-overview.md
│       │   ├── copy-cheatsheet.md    # From /docs/seo/copy-cheatsheet.md
│       │   └── page-blueprints.md    # From /docs/seo/landing-page.md
│       └── adr/                      # Link to /.adr/
│
├── blog/
│   ├── 2025-11-15-cron-jobs-are-dead.md
│   ├── 2025-11-22-reduce-alert-fatigue.md
│   └── ... (18+ posts from SEO strategy)
│
├── src/
│   ├── components/
│   │   ├── HomepageFeatures/
│   │   ├── FAQSection/
│   │   ├── PricingCards/
│   │   └── UseCaseCards/
│   │
│   ├── pages/
│   │   ├── index.tsx                 # Marketing homepage
│   │   ├── pricing.tsx               # Pricing page
│   │   └── faq.tsx                   # FAQ page
│   │
│   └── css/
│       └── custom.css
│
├── static/
│   ├── img/
│   └── og-images/
│
├── docusaurus.config.ts
├── sidebars.ts
└── package.json
```

### apps/web/ (REVISED - Keeps Homepage)

```
apps/web/
├── src/
│   ├── routes/
│   │   ├── index.tsx                 # Marketing homepage (KEEP AS IS)
│   │   ├── pricing.tsx               # Pricing page (KEEP)
│   │   ├── faq.tsx                   # FAQ page (KEEP)
│   │   ├── login.tsx                 # Authentication
│   │   ├── signup.tsx                # Registration
│   │   └── dashboard/                # Dashboard routes
│   │       ├── index.tsx
│   │       ├── jobs/
│   │       └── settings/
│   │
│   ├── components/
│   │   ├── sections/
│   │   │   ├── hero-section.tsx      # Homepage hero (KEEP)
│   │   │   ├── quick-answers-section.tsx  # FAQ section (KEEP, update to use @cronicorn/content)
│   │   │   └── ...other sections     # All homepage sections (KEEP)
│   │   └── dashboard/                # App components
│   │
│   ├── lib/
│   │   ├── auth.ts
│   │   └── config.ts                 # Minimal routing config (URLs, etc.)
│   │
│   └── site-config.ts                # DEPRECATED/REMOVED (move to packages/content)
│
└── package.json
```

**Key Changes:**
- Remove site-config.ts content (move to packages/content)
- Update components to import from @cronicorn/content instead
- Keep all existing homepage components and routes
- Add links to docs.cronicorn.com where appropriate
- **Homepage design/implementation stays exactly the same**

---

## Migration Plan

### Phase 1: Create Shared Content Package ✅ LOW RISK

**Goal:** Establish single source of truth for brand content

**Tasks:**
1. Create `packages/content` directory
2. Set up package.json with proper exports
3. Create TypeScript files:
   - `src/brand.ts` - Extract from site-config.ts headlines, tagline, description
   - `src/faq.ts` - Extract from site-config.ts faq array
   - `src/seo.ts` - Extract from site-config.ts seo object
   - `src/features.ts` - Extract from site-config.ts and quick-answers
   - `src/use-cases.ts` - Extract from site-config.ts
4. Update apps/web to import from @cronicorn/content
5. Test that web app still works
6. Commit and verify no regressions

**Deliverables:**
- [ ] packages/content created with all TS files
- [ ] apps/web updated to use shared package
- [ ] All tests pass
- [ ] No functionality broken

**Time Estimate:** 4-6 hours

**Rollback Plan:** Keep site-config.ts until fully migrated, then deprecate

---

### Phase 2: Migrate Strategy Docs to Docs App ✅ MEDIUM RISK

**Goal:** Centralize all strategy documentation in Docusaurus

**Tasks:**
1. Create `apps/docs/docs/internal/marketing/` directory
2. Move files from `/docs/seo/` to `apps/docs/docs/internal/marketing/`:
   - brand-voice.md
   - seo-strategy.md
   - marketing-overview.md → overview.md
   - copy-cheatsheet.md
   - landing-page.md → page-blueprints.md
3. Move technical docs:
   - `/docs/architecture.md` → `apps/docs/docs/technical/architecture.mdx`
   - `/docs/quickstart.md` → `apps/docs/docs/getting-started/quickstart.mdx`
   - `/docs/use-cases.md` → Split into multiple files in `apps/docs/docs/guides/use-cases/`
4. Update internal cross-references
5. Configure sidebars.ts to organize docs properly
6. Keep /docs/ folder temporarily with redirects/links

**Deliverables:**
- [ ] All strategy docs in apps/docs
- [ ] All user docs in apps/docs
- [ ] Sidebar navigation configured
- [ ] Cross-references updated
- [ ] README updated with new paths

**Time Estimate:** 6-8 hours

**Rollback Plan:** Files still exist in /docs/, can revert references

---

### Phase 3: Update Web App to Use Shared Package � LOW-MEDIUM EFFORT

**Goal:** Refactor web app components to consume from @cronicorn/content while keeping design identical

**Tasks:**

#### 3.1 Update Homepage Components
- [ ] Update hero section to import headline from `@cronicorn/content/brand`
- [ ] Update problem/solution sections to use shared content
- [ ] Update feature sections to import from `@cronicorn/content/features`
- [ ] Update CTAs to use shared URLs

#### 3.2 Update Quick Answers Section
- [ ] Refactor `quick-answers-section.tsx` to consume from `@cronicorn/content/faq`
- [ ] Map FAQ data to current display format (or simplify format)
- [ ] Ensure schema.org structured data still works
- [ ] Test that visuals look identical

#### 3.3 Update SEO/Meta Tags
- [ ] Import meta descriptions from `@cronicorn/content/seo`
- [ ] Import keywords from shared package
- [ ] Update OpenGraph/Twitter card data to use shared content
- [ ] Verify all pages have proper meta tags

#### 3.4 Update Pricing Page (if exists)
- [ ] Import pricing tiers from `@cronicorn/content`
- [ ] Keep existing design/layout
- [ ] Add link to docs site for detailed comparison

#### 3.5 Add Links to Docs Site
- [ ] Add navigation link to docs.cronicorn.com
- [ ] Add "Read the Docs" CTAs in appropriate sections
- [ ] Add "View Guides" links to use case sections
- [ ] Ensure consistent branding

**Deliverables:**
- [ ] Web app homepage looks identical but uses shared content
- [ ] All components import from @cronicorn/content
- [ ] site-config.ts content moved to packages/content
- [ ] Links to docs site added
- [ ] All tests pass
- [ ] No visual regressions

**Time Estimate:** 6-10 hours

**Rollback Plan:** Git branch before changes, can revert imports back to site-config.ts

---

### Phase 4: Build Out Docs App � MEDIUM-HIGH EFFORT

**Goal:** Create comprehensive documentation site with blog for content marketing

**Tasks:**

#### 4.1 Documentation Structure
- [ ] Create getting-started guides (quickstart, installation)
- [ ] Create detailed use case pages:
  - [ ] DevOps monitoring guide
  - [ ] E-commerce flash sales guide
  - [ ] Data pipeline orchestration guide
  - [ ] Web scraping guide
  - [ ] SaaS usage tracking guide
- [ ] Add code examples and diagrams to each
- [ ] Create API reference documentation
- [ ] Create technical deep-dive pages (architecture, etc.)

#### 4.2 Blog Setup (apps/docs/blog/)
- [ ] Configure blog in docusaurus.config.ts
- [ ] Create first 3 blog posts from SEO strategy:
  - [ ] "Cron Jobs Are Dead: The AI Way to Schedule Everything"
  - [ ] "How to Reduce Alert Fatigue by 80%"
  - [ ] "Building Self-Healing Systems: A Practical Guide"
- [ ] Set up RSS feed
- [ ] Add social sharing buttons
- [ ] Configure author profiles
- [ ] Set up blog sidebar/navigation

#### 4.3 Docs Homepage
- [ ] Create welcoming landing page for docs site
- [ ] Add quick navigation to popular sections
- [ ] Add search functionality
- [ ] Link back to cronicorn.com for marketing

#### 4.4 Internal Marketing Docs
- [ ] Ensure /internal/marketing/ section is properly hidden or password-protected
- [ ] Or keep it public as a transparency/DX play (optional)
- [ ] Add clear navigation for team members

**Deliverables:**
- [ ] 5+ detailed use case guides
- [ ] 3 blog posts published
- [ ] Complete getting-started documentation
- [ ] API reference
- [ ] Blog infrastructure ready for content marketing
- [ ] All pages SEO-optimized

**Time Estimate:** 15-25 hours (can be done incrementally over weeks)

**Rollback Plan:** Docs app is additive, doesn't affect web app

---

### Phase 5: Deploy & Configure Routing 🚀 DEPLOYMENT

**Goal:** Deploy both apps to production with proper domain routing

**Tasks:**

#### 5.1 Configure DNS
- [ ] Point cronicorn.com to web app deployment (KEEP AS IS)
- [ ] Point docs.cronicorn.com to docs app deployment (NEW)
- [ ] Set up SSL certificates for both domains

#### 5.2 Deploy Docs App
- [ ] Build apps/docs for production
- [ ] Deploy to hosting (Vercel/Netlify recommended)
- [ ] Test all pages load at docs.cronicorn.com
- [ ] Verify SEO meta tags
- [ ] Submit docs sitemap to Google Search Console

#### 5.3 Update Web App
- [ ] Ensure all links to docs point to docs.cronicorn.com
- [ ] Add "Documentation" link in navigation
- [ ] Verify shared package imports work in production
- [ ] Test full user flows (homepage → login → dashboard)

#### 5.4 SEO Configuration
- [ ] Submit both sitemaps (cronicorn.com and docs.cronicorn.com)
- [ ] Configure cross-domain tracking in Analytics (optional)
- [ ] Set up proper canonical tags
- [ ] Verify no duplicate content issues
- [ ] Monitor rankings for first 2 weeks

#### 5.5 Update External References
- [ ] Update GitHub README links
- [ ] Update any marketing materials
- [ ] Update email signatures
- [ ] Update social media profiles
- [ ] Add link to docs from web app footer

**Deliverables:**
- [ ] cronicorn.com serving web app with custom homepage
- [ ] docs.cronicorn.com serving docs app
- [ ] All links between sites working
- [ ] SEO not negatively impacted
- [ ] Analytics tracking both sites

**Time Estimate:** 6-10 hours

**Risk:** DNS propagation delays, CORS issues, SEO ranking drops (monitor)

**Rollback Plan:** Can switch DNS back, keep old deployment running temporarily

---

## Incremental Migration Timeline

### Week 1: Foundation
- Day 1-2: Phase 1 - Create shared content package
- Day 3-5: Phase 2 - Migrate strategy docs to apps/docs

**Milestone:** All docs centralized, shared content package working

### Week 2: Connect the Systems  
- Day 1-3: Phase 3 - Update web app to use @cronicorn/content
- Day 4-5: Test thoroughly, verify no visual regressions

**Milestone:** Web app using shared package, homepage looks identical

### Week 3-4: Build Docs App
- Week 3: Phase 4.1-4.2 - Documentation structure, first 3 blog posts
- Week 4: Phase 4.3-4.4 - Docs homepage, remaining guides

**Milestone:** Docs app fully functional and ready to deploy

### Week 5: Deploy
- Day 1-2: Phase 5 - Configure DNS and deploy docs app
- Day 3-4: Connect both sites, verify links and navigation
- Day 5: Monitor, fix issues, verify SEO

**Milestone:** Both sites live, marketing centralized, docs at docs.cronicorn.com

### Post-Migration: Content Creation
- Week 6+: Write additional blog posts from SEO strategy
- Ongoing: Monitor analytics and SEO rankings
- Ongoing: Iterate on messaging based on user feedback

**Total Timeline:** 5 weeks incremental (recommended) or 2-3 weeks aggressive

---

## Decision Points

### Decision 1: Domain Strategy
**Options:**
- A) Subdomain for docs (docs.cronicorn.com) ✅ RECOMMENDED
- B) Path-based routing (/docs/* on cronicorn.com)

**Recommendation:** Subdomain for cleaner separation, industry standard

**Your decision:** ___________

---

### Decision 2: Docs Site Location
**Options:**
- A) Subdomain (docs.cronicorn.com) ✅ RECOMMENDED
- B) Path-based (/docs/* on main site with routing)
- C) Separate domain (cronicorn-docs.com)

**Recommendation:** Subdomain for clean separation, easier deployment

**Your decision:** ___________

---

### Decision 3: Migration Speed
**Options:**
- A) All at once (2-3 weeks, higher risk)
- B) Incremental (5 weeks, lower risk) ✅ RECOMMENDED

**Recommendation:** Incremental with thorough testing at each phase

**Your decision:** ___________

---

### Decision 4: Blog Timing
**Options:**
- A) Set up blog infrastructure now, write posts later ✅ RECOMMENDED
- B) Wait until after migration to add blog
- C) Start writing posts immediately

**Recommendation:** Set up infrastructure now, 3 posts initially, scale to 2-4/month

**Your decision:** ___________

---

## Success Metrics

### Immediate (Post-Migration)
- [ ] All content accessible from one place
- [ ] Zero broken links
- [ ] Authentication still working
- [ ] No drop in SEO rankings
- [ ] Faster time to update content

### 30 Days
- [ ] 3 blog posts published
- [ ] SEO rankings stable or improved
- [ ] User feedback positive
- [ ] Analytics tracking both sites

### 90 Days
- [ ] 10+ blog posts published
- [ ] Ranking for Tier 2 keywords
- [ ] 500+ organic sessions/month
- [ ] Conversion rate >= current baseline

---

## Maintenance Workflow (Post-Migration)

### To Update Brand Messaging
1. Edit `packages/content/src/brand.ts`
2. Both apps automatically use new messaging
3. Commit and deploy

**Old way:** Edit 3+ files, hope you didn't miss any  
**New way:** Edit 1 file, guaranteed consistency

---

### To Add FAQ
1. Add to `packages/content/src/faq.ts`
2. Automatically appears on docs FAQ page
3. Can reference in blog posts

**Old way:** Update site-config.ts AND quick-answers-section.tsx  
**New way:** Edit 1 file, appears everywhere

---

### To Update Strategy Docs
1. Edit `apps/docs/docs/internal/marketing/*.md`
2. These are internal guides, don't affect live site
3. Guides inform content updates, but separate from implementation

**Old way:** Strategy docs separate, easy to get out of sync  
**New way:** Strategy docs integrated, linked to implementation

---

### To Add Blog Post
1. Create `apps/docs/blog/YYYY-MM-DD-slug.md`
2. Follow brand voice guidelines in /docs/internal/marketing/
3. Pull stats/features from @cronicorn/content
4. Publish and auto-generates RSS/sitemap

**Old way:** No blog infrastructure  
**New way:** Easy to publish, SEO-optimized

---

### To Add Use Case
1. Create `apps/docs/docs/guides/use-cases/new-case.mdx`
2. Use React components for rich formatting
3. Link from homepage features section
4. Auto-added to sitemap

**Old way:** No clear place for detailed use cases  
**New way:** Structured, discoverable, SEO-friendly

---

## SEO Considerations

### URL Preservation
With the revised approach, most URLs stay the same on cronicorn.com:

**URLs that stay the same:**
```
cronicorn.com/              → cronicorn.com/              (homepage - SAME)
cronicorn.com/pricing       → cronicorn.com/pricing       (pricing - SAME)
cronicorn.com/faq           → cronicorn.com/faq           (FAQ - SAME)
cronicorn.com/login         → cronicorn.com/login         (login - SAME)
cronicorn.com/signup        → cronicorn.com/signup        (signup - SAME)
cronicorn.com/dashboard/*   → cronicorn.com/dashboard/*   (dashboard - SAME)
```

**New URLs for documentation:**
```
NEW: docs.cronicorn.com/                    (docs homepage)
NEW: docs.cronicorn.com/getting-started     (quickstart)
NEW: docs.cronicorn.com/guides/use-cases    (use cases)
NEW: docs.cronicorn.com/technical           (architecture)
NEW: docs.cronicorn.com/blog                (blog)
```

**Redirects needed from web app:**
- Add navigation links to docs.cronicorn.com (not redirects, just links)
- No 301 redirects needed since URLs aren't changing

**SEO Impact:** Minimal - we're adding a new subdomain, not moving existing content

### Sitemap Updates
- Submit new sitemap from docs app to Google Search Console
- Include blog posts, use cases, all docs
- Set up automatic sitemap generation in Docusaurus

### Structured Data
- Implement schema.org on all pages
- FAQPage schema for FAQ page
- Article schema for blog posts
- Organization schema on homepage
- BreadcrumbList for navigation

---

## Rollback Plan

If migration causes critical issues:

### Phase 1-2 Rollback
- Keep original site-config.ts until confirmed working
- Revert imports if package issues
- Low risk, easy rollback

### Phase 3 Rollback
- Docs app is additive, doesn't affect production
- Can take time to build without pressure
- No rollback needed, just don't deploy

### Phase 4-5 Rollback
- Keep git branch before changes
- Can switch DNS back to old deployment
- Keep old deployment running for 1 week before decommissioning

**Maximum Downtime:** < 5 minutes (DNS switch)

---

## Open Questions

1. **Blog content velocity:** Can we commit to 2-4 posts/month?
2. **Design resources:** Who will create diagrams, screenshots, etc.?
3. **SEO monitoring:** Who will track rankings and analytics?
4. **Content approval:** What's the review process for blog posts?
5. **Video content:** Are video tutorials part of this migration?

---

## Next Steps

1. **Review this plan** and make decisions at decision points
2. **Assign ownership** for each phase
3. **Set timeline** based on team availability
4. **Start Phase 1** (lowest risk, highest value)
5. **Schedule check-ins** weekly during migration

---

## Resources

### Reference Documentation
- [Docusaurus Docs](https://docusaurus.io/)
- [Current SEO Strategy](/docs/seo/seo-strategy.md)
- [Brand Voice Guidelines](/docs/seo/brand-voice.md)
- [Landing Page Blueprint](/docs/seo/landing-page.md)

### Tools Needed
- Google Search Console (SEO monitoring)
- Google Analytics 4 (traffic tracking)
- Docusaurus (docs site generator)
- Git (version control)

### Support
- Questions? Check #marketing channel
- Technical issues? Check #engineering channel
- Strategy questions? Review /docs/internal/marketing/

---

**Status:** Ready for review and decision  
**Owner:** [TBD]  
**Timeline:** 4 weeks (incremental) or 2 weeks (aggressive)  
**Risk Level:** Medium (with incremental approach)
