/**
 * Business information for structured data (schema.org) and company details
 * Used for SEO, legal compliance, and contact information
 */

export const business = {
  name: "Cronicorn",
  legalName: "Cronicorn Technologies Inc.",
  description: "Adaptive job scheduling and automation platform",
  foundingDate: "2024",
  industry: "Software Technology",
  address: {
    streetAddress: "",
    addressLocality: "",
    addressRegion: "",
    postalCode: "",
    addressCountry: "US",
  },
  contactPoint: {
    telephone: "",
    contactType: "customer service",
    email: "support@cronicorn.com",
  },
  sameAs: [
    "https://twitter.com/cronicorn",
    "https://linkedin.com/company/cronicorn",
    "https://github.com/weskerllc/cronicorn",
  ],
} as const;

export type Business = typeof business;
