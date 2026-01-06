/**
 * URL Configuration
 * Central source for all internal and external URLs
 */

export const urls = {
  /** Main website URL */
  website: "https://cronicorn.com",

  /** Product pages */
  product: {
    home: "/",
    pricing: "/pricing",
    faq: "/faq",
    demo: "/demo",
    dashboard: "/dashboard",
    login: "/login",
  },

  /** Documentation (on docs subdomain) */
  docs: {
    base: "https://docs.cronicorn.com",
    quickStart: "https://docs.cronicorn.com/quick-start",
    quickstart: "https://docs.cronicorn.com/quick-start",
    useCases: "https://docs.cronicorn.com/use-cases",
    architecture: "https://docs.cronicorn.com/technical/system-architecture",
    apiReference: "https://cronicorn.com/api/reference",
    mcpServer: "https://docs.cronicorn.com/mcp-server",
  },

  /** GitHub repository links */
  github: {
    org: "weskerllc",
    repo: "https://github.com/weskerllc/cronicorn",
    discussions: "https://github.com/weskerllc/cronicorn/discussions",
    repoName: "cronicorn",
    readme: "https://github.com/weskerllc/cronicorn#readme",
    issues: "https://github.com/weskerllc/cronicorn/issues/new",
    contributing: "https://github.com/weskerllc/cronicorn/blob/main/docs/contributing.md",
    changelog: "https://github.com/weskerllc/cronicorn/blob/main/CHANGELOG.md",
  },
  /** Legal pages */
  legal: {
    privacy: "/privacy",
    terms: "/terms",
    contact: "mailto:support@cronicorn.com",
  },

  /** Social media */
  // social: {
  //     twitter: "https://twitter.com/cronicorn",
  //     linkedin: "https://linkedin.com/company/cronicorn",
  // },
} as const;

/** Helper to get full docs URL */
export function getDocsUrl(path: string): string {
  return `${urls.docs.base}${path}`;
}
