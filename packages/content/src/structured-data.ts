/**
 * Structured data content
 * Descriptions and metadata for schema.org structured data
 */

export const structuredData = {
  /** Software application metadata */
  software: {
    releaseNotes: "Early access version with adaptive scheduling capabilities",
    featureList: [
      "Adaptive Intervals",
      "Multi-Tier Coordination",
      "AI Hints System",
      "Transparent AI Decisions",
      "Cloud-Native Architecture",
      "Real-Time Adaptation",
      "Workflow Orchestration",
      "Auto-Recovery",
      "Intelligent Monitoring",
      "Event-Driven Scheduling",
    ],
  },

  /** Login page metadata */
  login: {
    pageName: "Login - Cronicorn",
    description: "Sign in to your Cronicorn account to access AI-powered job scheduling tools",
    accountDescription: "Access to Cronicorn scheduling platform",
  },
} as const;
