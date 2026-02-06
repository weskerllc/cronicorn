/**
 * Structured data content
 * Descriptions and metadata for schema.org structured data
 */

export const structuredData = {
  /** Software application metadata */
  software: {
    releaseNotes: "Early access version with response-driven adaptive scheduling",
    featureList: [
      "Response Body Parsing",
      "Adaptive Intervals",
      "Natural Language Descriptions",
      "Sibling Endpoint Coordination",
      "AI Scheduling Hints with TTL",
      "Min/Max Constraint Guardrails",
      "Automated Error Recovery",
      "Multi-Endpoint Pipelines",
      "Exponential Backoff",
      "MCP Server Integration",
    ],
  },

  /** Login page metadata */
  login: {
    pageName: "Login - Cronicorn",
    description: "Sign in to your Cronicorn account to manage adaptive HTTP job scheduling",
    accountDescription: "Access to Cronicorn scheduling platform",
  },
} as const;
