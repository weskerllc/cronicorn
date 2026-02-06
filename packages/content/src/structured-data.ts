/**
 * Structured data content
 * Descriptions and metadata for schema.org structured data
 */

export const structuredData = {
  /** Software application metadata */
  software: {
    releaseNotes: "Early access version with response-driven adaptive scheduling",
    featureList: [
      "AI reads endpoint response bodies (JSON fields like status, error_rate_pct, queue_depth)",
      "Natural language descriptions control AI behavior — no code rules",
      "Min/max interval constraints the AI cannot exceed",
      "TTL-based scheduling hints that auto-expire to baseline",
      "Sibling endpoint coordination within the same job",
      "Exponential backoff on failure with automatic recovery",
      "Cron expressions and interval-based baseline scheduling",
      "MCP Server for AI assistant integration (Claude, Cursor, Copilot)",
      "REST API and Web UI for configuration and monitoring",
      "Graceful degradation — baseline continues if AI is unavailable",
    ],
  },

  /** Login page metadata */
  login: {
    pageName: "Login - Cronicorn",
    description: "Sign in to your Cronicorn account to manage adaptive HTTP job scheduling",
    accountDescription: "Access to Cronicorn scheduling platform",
  },
} as const;
