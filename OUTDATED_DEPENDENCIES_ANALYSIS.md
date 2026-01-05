# Outdated Dependencies Analysis

**Generated:** 2026-01-05
**Project:** Cronicorn Monorepo
**Package Manager:** pnpm@10.17.1

## Executive Summary

This analysis identifies outdated dependencies across the Cronicorn monorepo. The project contains **multiple packages with significant version updates available**, including several major version updates that may introduce breaking changes.

**Critical Findings:**
- **6 major version updates** available with potential breaking changes (including vitest 3→4)
- **7 significant minor updates** that may add new features or deprecations
- **50+ patch and minor updates** for bug fixes and improvements
- **drizzle-orm** is 17 minor versions behind (0.38.3 → 0.45.1)

---

## 🔴 Critical: Major Version Updates (Breaking Changes Likely)

### 1. **zod**: 3.25.76 → **4.3.5**
- **Impact:** CRITICAL - Used across multiple packages for schema validation
- **Affected packages:** Multiple (api-contracts, api, domain, services, etc.)
- **Note:** Currently pinned to v3 in catalog to avoid TypeScript MCP issues
- **Recommendation:** Research Zod v4 breaking changes before upgrading. May require significant refactoring.

### 2. **drizzle-orm**: 0.38.4 → **0.45.1**
- **Impact:** HIGH - Core ORM used across the application
- **Catalog version:** ^0.38.3
- **Affected packages:** adapter-drizzle, api, scheduler-app, ai-planner-app, migrator
- **Recommendation:** Review Drizzle ORM changelog for versions 0.39-0.45. Test database migrations thoroughly.

### 3. **@hono/zod-openapi**: 0.19.10 → **1.2.0**
- **Impact:** HIGH - API schema validation and OpenAPI generation
- **Affected packages:** api, api-contracts
- **Recommendation:** Major version jump likely includes breaking changes to API contract definitions.

### 4. **@scalar/hono-api-reference**: 0.5.164 → **0.9.30**
- **Impact:** MEDIUM - API documentation UI
- **Affected packages:** api
- **Recommendation:** Test API documentation rendering after upgrade.

### 5. **@hono/swagger-ui**: 0.4.1 → **0.5.3**
- **Impact:** MEDIUM - Swagger UI integration
- **Affected packages:** api
- **Recommendation:** Coordinate with @scalar/hono-api-reference update.

### 6. **vitest**: 3.2.4 → **4.0.16** (Catalog)
- **Impact:** CRITICAL - Testing framework used across entire monorepo
- **Catalog version:** ~3.2.4
- **Affected packages:** All packages with tests
- **Recommendation:** Major version update - review Vitest v4 migration guide. Test suite changes likely required.

---

## 🟡 Important: Significant Minor Updates

### Database & ORM
- **drizzle-kit** (dev): 0.31.7 → **0.31.8**
  - Patch update, likely bug fixes

### UI & React Components
- **lucide-react**: 0.554.0 → **0.562.0**
  - Minor update, may include new icons
  - Affected: ui-library, web

- **@tanstack/react-devtools**: 0.7.11 → **0.9.0**
  - Significant minor version jump
  - Affected: web

- **@tanstack/devtools-vite**: 0.3.11 → **0.4.0**
  - Minor version update
  - Affected: web

### Development Tools
- **eslint-plugin-format** (dev): 0.1.3 → **1.1.0**
  - Major version update for linting
  - Affected: ui-library, root

- **@tanstack/eslint-config** (dev): 0.3.3 → **0.3.4**
  - Patch update
  - Affected: web, root

### Testing
- **@playwright/test** (dev): 1.57.0 → **1.57.0**
  - Already at latest version (missing from node_modules)

### MCP Server
- **@modelcontextprotocol/inspector** (dev): 0.17.2 → **0.18.0**
  - Minor update
  - Affected: mcp-server

---

## ✅ Low Risk: Patch Updates

These updates are generally safe and include bug fixes:

- **@types/node** (dev): Various versions → Depends on package
- **clsx**: Minor patches
- **date-fns**: Patch updates
- **react-hook-form**: Patch updates
- **tailwind-merge**: Patch updates
- **@tanstack/react-router**: Patch updates
- **hono**: Patch updates across multiple packages

---

## 📋 Missing Dependencies

The following dependencies show as "missing" (likely not installed in node_modules):
- All Docusaurus packages (@cronicorn/docs)
- All Radix UI components
- Most runtime dependencies

**Action Required:** Run `pnpm install` to install missing dependencies.

---

## 🎯 Recommended Upgrade Strategy

### Phase 1: Low-Hanging Fruit (Low Risk)
1. Install missing dependencies: `pnpm install`
2. Update patch versions and minor updates
3. Run full test suite to verify stability

### Phase 2: Research & Planning (Medium Risk)
1. **drizzle-orm** 0.38.4 → 0.45.1
   - Review changelog for versions 0.39 through 0.45
   - Test with development database
   - Update drizzle-kit simultaneously

2. **@scalar/hono-api-reference** & **@hono/swagger-ui**
   - Test API documentation rendering
   - Verify OpenAPI schema generation

### Phase 3: Major Updates (High Risk)
1. **@hono/zod-openapi** 0.19.10 → 1.2.0
   - Review migration guide
   - Update API contracts
   - Extensive API testing required

2. **zod** 3.25.76 → 4.3.5 (HOLD)
   - **DO NOT UPGRADE YET** - Currently pinned due to TypeScript MCP compatibility
   - Monitor Zod v4 adoption and TypeScript MCP updates
   - Plan comprehensive schema validation testing when ready

### Phase 4: Development Tooling
1. **eslint-plugin-format** 0.1.3 → 1.1.0
   - Update linting configuration
   - Fix any new linting errors

---

## 🛠️ Catalog Dependencies Status

Current catalog versions in `pnpm-workspace.yaml`:

```yaml
drizzle-orm: ^0.38.3     # Latest: 0.45.1 (OUTDATED - 17 minor versions behind)
react: ^19.2.0            # Latest: 19.2.3 (Patch update available)
react-dom: ^19.2.0        # Latest: 19.2.3 (Patch update available)
typescript: ~5.7.3        # Latest: 5.9.3 (Minor update available)
vitest: ~3.2.4            # Latest: 4.0.16 (MAJOR update available - BREAKING CHANGES)
zod: ^3.25.76             # Latest: 4.3.5 (PINNED - Do not upgrade due to TypeScript MCP)
```

### Catalog Update Recommendations:

**Safe to update immediately:**
- ✅ react: ^19.2.0 → ^19.2.3 (patch)
- ✅ react-dom: ^19.2.0 → ^19.2.3 (patch)

**Requires testing:**
- ⚠️ typescript: ~5.7.3 → ~5.9.3 (minor - may affect type checking)
- ⚠️ drizzle-orm: ^0.38.3 → ^0.45.1 (significant - test database operations)

**Requires careful planning:**
- 🔴 vitest: ~3.2.4 → ~4.0.16 (MAJOR - review breaking changes before upgrading)

**Do not upgrade:**
- 🚫 zod: Keep at ^3.25.76 (pinned for TypeScript MCP compatibility)

---

## ⚠️ Risks & Considerations

1. **Breaking Changes**: Major version updates (especially Zod, drizzle-orm, @hono/zod-openapi) likely contain breaking changes
2. **TypeScript Compatibility**: Ensure updated packages are compatible with TypeScript ~5.7.3
3. **React 19**: Verify all UI libraries are compatible with React 19.2.0
4. **Database Migrations**: drizzle-orm updates may affect existing migrations
5. **API Contracts**: Updates to Hono and OpenAPI packages may require API contract updates

---

## 📊 Statistics

- **Total packages analyzed:** 25+ packages across monorepo
- **Packages with outdated deps:** ~80% of packages
- **Major version updates available:** 5
- **Minor version updates available:** 7
- **Patch updates available:** 50+

---

## 🚀 Next Steps

1. **Immediate:** Run `pnpm install` to install missing dependencies
2. **Short-term:** Apply patch updates and low-risk minor updates
3. **Medium-term:** Test and upgrade drizzle-orm and API documentation tools
4. **Long-term:** Plan migration to Zod v4 when TypeScript MCP compatibility is confirmed

---

**Note:** This analysis is based on `pnpm outdated -r` output. Always review changelogs and migration guides before upgrading major versions.
