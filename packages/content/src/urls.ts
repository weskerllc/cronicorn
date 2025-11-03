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
        dashboard: "/dashboard",
        login: "/login",
        signup: "/signup",
    },

    /** Documentation (on docs subdomain) */
    docs: {
        base: "https://docs.cronicorn.com",
        quickstart: "https://docs.cronicorn.com/getting-started/quickstart",
        useCases: "https://docs.cronicorn.com/guides/use-cases",
        architecture: "https://docs.cronicorn.com/technical/architecture",
        apiReference: "https://docs.cronicorn.com/api/reference",
    },

    /** GitHub repository links */
    github: {
        org: "weskerllc",
        repo: "https://github.com/weskerllc/cronicorn",
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
    social: {
        twitter: "https://twitter.com/cronicorn",
        linkedin: "https://linkedin.com/company/cronicorn",
    },
} as const;

/** Helper to get full docs URL */
export function getDocsUrl(path: string): string {
    return `${urls.docs.base}${path}`;
}
