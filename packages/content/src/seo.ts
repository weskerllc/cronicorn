/**
 * SEO Configuration
 * Keywords, meta descriptions, and SEO metadata
 */

/** Meta descriptions optimized for search engines */
export const metaDescriptions = {
  home: "AI-powered job scheduler that adapts to your reality. Reduce alert fatigue 80%, resolve issues 10x faster. Automatic recovery without waking your team at 3 AM. Try free.",
  pricing: "Flexible pricing for adaptive monitoring. Start with early access. Enterprise features for intelligent HTTP scheduler and workflow orchestration.",
  docs: "Complete documentation for adaptive scheduling with AI hints. Quick start guides, API reference. Get started with intelligent cron alternatives.",
  faq: "Get answers to common questions about Cronicorn's AI-powered job scheduling. Learn about adaptive intervals, workflow orchestration, and intelligent automation.",
  login: "Sign in to your Cronicorn account to access powerful AI-driven job scheduling, analytics, and automation tools.",
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
  defaultTitle: "Cronicorn: AI-Powered HTTP Job Scheduler That Adapts",
  titleTemplate: "%s | Cronicorn",
} as const;
