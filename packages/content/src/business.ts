/**
 * Business information for structured data (schema.org) and company details
 * Used for SEO, legal compliance, and contact information
 */

export const business = {
  name: "Wesker",
  legalName: "Wesker LLC",
  description: "Software development collective",
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
    "https://www.wesker.dev/",
    "https://github.com/weskerllc",
  ],
} as const;

export type Business = typeof business;
