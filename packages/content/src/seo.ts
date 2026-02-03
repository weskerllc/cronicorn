/**
 * SEO Configuration
 * Keywords, meta descriptions, and SEO metadata
 */

/** Meta descriptions optimized for search engines (150-220 characters each) */
export const metaDescriptions = {
  home: "Cronicorn is an AI-powered adaptive job scheduler that intelligently manages HTTP endpoints with dynamic intervals. Automate monitoring, data pipelines, and workflows that respond to real-time conditions. Start free today.",
  pricing: "Choose the right plan for your AI scheduling needs. Start free with 5 jobs, upgrade to Pro for unlimited endpoints and priority support. Enterprise plans available. 14-day money-back guarantee.",
  docs: "Complete documentation for Cronicorn's adaptive scheduling platform. Quick start guides, API reference, use cases, and best practices for intelligent job automation.",
  faq: "Get answers to common questions about Cronicorn's AI-powered job scheduling. Learn how adaptive intervals work, understand pricing, and discover best practices for automation.",
  login: "Sign in to your Cronicorn account to manage AI-driven job scheduling, view analytics, configure adaptive monitoring, and access your automation dashboard.",
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
    "adaptive task scheduler",
    "intelligent cron",
    "AI job scheduler",
    "event-driven job scheduler",
    "smart cron jobs",
  ],

  /** Tier 2: Secondary keywords (Good Intent, Lower Competition) */
  tier2: [
    "cron alternative with AI",
    "adaptive monitoring scheduler",
    "intelligent http scheduler",
    "devops automation scheduler",
    "automatic job scheduling",
  ],

  /** Core authentic keywords based on real capabilities */
  core: [
    "adaptive job scheduling",
    "intelligent job scheduling",
    "AI hints system",
    "multi-tier coordination",
    "adaptive intervals",
    "cloud-native scheduler",
    "transparent AI scheduling",
    "workflow orchestration",
  ],

  /** Technical terms from documentation */
  technical: [
    "adaptive monitoring",
    "condition-based scheduling",
    "real-time job adaptation",
    "intelligent workflow coordination",
    "adaptive automation platform",
    "transparent scheduling decisions",
    "cloud job orchestration",
    "intelligent cron alternative",
    "adaptive task automation",
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
    "how to schedule jobs that adapt to conditions",
    "intelligent monitoring that adjusts automatically",
    "AI scheduler that explains decisions",
    "scheduler that learns from patterns",
    "adaptive intervals for monitoring",
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
      alt: "Cronicorn - Adaptive Job Scheduling Platform",
    },
    {
      url: "/og-image-square.png",
      width: 1200,
      height: 1200,
      alt: "Cronicorn - AI-Powered Job Scheduling",
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
  defaultTitle: "Cronicorn: AI-Powered HTTP Job Scheduler | Adaptive Cron Alternative",
  titleTemplate: "%s | Cronicorn - AI Job Scheduling",
} as const;
