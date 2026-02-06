/**
 * SEO Configuration
 * Keywords, meta descriptions, and SEO metadata
 */

/** Meta descriptions optimized for search engines (150-220 characters each) */
export const metaDescriptions = {
  home: "Cronicorn schedules HTTP endpoints that read their own response data, adapt their timing, and trigger each other automatically. Describe behavior in natural language — no code required. Start free.",
  pricing: "Choose the right plan for your AI scheduling needs. Start free with 5 jobs, upgrade to Pro for unlimited endpoints and priority support. Enterprise plans available. 14-day money-back guarantee.",
  docs: "Complete documentation for Cronicorn. Quick start guides, API reference, recipes, and best practices for HTTP endpoints that adapt their own scheduling.",
  faq: "Get answers to common questions about Cronicorn. Learn how endpoints adapt from their own responses, how descriptions control behavior, and discover best practices.",
  login: "Sign in to your Cronicorn account to manage scheduled HTTP endpoints, view run history, configure adaptive behavior, and access your dashboard.",
} as const;

/** Page titles for SEO (used with titleTemplate) */
export const pageTitles = {
  pricing: "Pricing Plans - Choose Your AI Scheduling Solution",
  login: "Login - Access Your AI Scheduling Dashboard",
  faq: "Frequently Asked Questions",
} as const;

/** SEO Keywords - Organized by priority tier */
export const keywords = {
  /** Tier 1: Primary keywords (High Intent, High Competition) */
  tier1: [
    "adaptive HTTP job scheduler",
    "AI cron alternative",
    "AI job scheduler",
    "self-adapting cron jobs",
    "response-aware scheduler",
  ],

  /** Tier 2: Secondary keywords (Good Intent, Lower Competition) */
  tier2: [
    "cron alternative with AI",
    "adaptive monitoring scheduler",
    "HTTP endpoint scheduler",
    "natural language job scheduling",
    "response-body-driven scheduling",
  ],

  /** Core authentic keywords based on real capabilities */
  core: [
    "adaptive job scheduling",
    "response body parsing scheduler",
    "endpoint coordination",
    "sibling endpoint triggers",
    "adaptive intervals",
    "description-controlled scheduling",
    "AI scheduling hints",
    "multi-endpoint orchestration",
  ],

  /** Technical terms from documentation */
  technical: [
    "adaptive monitoring",
    "condition-based scheduling",
    "response-driven frequency adjustment",
    "endpoint cascading coordination",
    "natural language scheduling rules",
    "degraded state detection scheduler",
    "HTTP response adaptive scheduling",
    "cron job with AI adaptation",
    "automated error recovery scheduler",
  ],

  /** Use case specific */
  useCase: [
    "e-commerce monitoring automation",
    "data pipeline scheduling",
    "devops automation scheduler",
    "microservices monitoring",
    "flash sale infrastructure",
    "traffic surge automation",
  ],

  /** Long-tail conversational queries */
  longTail: [
    "schedule HTTP jobs that adapt based on response data",
    "cron jobs that read their own responses",
    "endpoints that trigger each other automatically",
    "natural language controlled job scheduling",
    "adaptive intervals based on response body fields",
  ],
} as const;

/** All keywords flattened for meta tag */
export const allKeywords = [
  ...keywords.tier1,
  ...keywords.tier2,
  ...keywords.core,
  ...keywords.technical,
  ...keywords.useCase,
  ...keywords.longTail,
] as const;

/** OpenGraph configuration */
export const openGraph = {
  type: "website",
  locale: "en_US",
  siteName: "Cronicorn",
  images: [
    {
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "Cronicorn - HTTP Jobs That Understand Their Own Responses",
    },
    {
      url: "/og-image-square.png",
      width: 1200,
      height: 1200,
      alt: "Cronicorn - Adaptive HTTP Job Scheduler",
    },
  ],
} as const;

/** Twitter Card configuration */
export const twitter = {
  handle: "@cronicorn",
  site: "@cronicorn",
  cardType: "summary_large_image",
  image: "/twitter-image.png",
} as const;

/** SEO defaults */
export const seoDefaults = {
  defaultTitle: "Cronicorn: HTTP Jobs That Understand Their Own Responses",
  titleTemplate: "%s | Cronicorn - Adaptive Job Scheduling",
} as const;
