/**
 * Site Configuration
 * 
 * Central configuration for all site content, metadata, and settings.
 * Organized by purpose for easy maintenance and updates.
 * 
 * @see https://cronicorn.com
 */
const siteConfig = {
  /** Core site information */
  siteName: "Cronicorn",
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3333",
  tagline: "Adaptive task scheduler that learns from your system patterns",
  description: "Intelligent cron alternative with AI job scheduling that automatically adjusts to real-time system conditions. Multi-tier coordination from health checks to auto-recovery across diverse use cases.",
  description2: "Event-driven job scheduler built for cloud-native applications. Our adaptive monitoring scheduler learns from execution patterns and coordinates intelligent HTTP workflows.",

  /** Headlines and messaging used throughout marketing pages */
  headlines: {
    hero: {
      primary: "Never Miss the Perfect Moment to Run Your Code",
      secondary: "Adaptive job scheduling that automatically adjusts to real-time system conditions",
      emotional: "Stop getting paged at 3 AM for issues that fix themselves"
    },
    problemSolution: {
      problem: "Your Systems Don't Run in a Vacuum",
      solution: "Intelligent Scheduling in 4 Steps",
      benefit: "Adaptive automation for modern operations"
    }
  },

  /** Meta descriptions optimized for search engines */
  metaDescriptions: {
    home: "Adaptive task scheduler that adjusts to real-time conditions. Intelligent cron alternative with transparent AI decisions. Early access available.",
    pricing: "Flexible pricing for adaptive monitoring. Start with early access. Enterprise features for intelligent HTTP scheduler and workflow orchestration.",
    docs: "Complete documentation for adaptive scheduling with AI hints. Quick start guides, API reference. Get started with intelligent cron alternatives."
  },

  url: "https://cronicorn.com",
  githubUrl: "https://github.com/weskerllc/cronicorn",
  supportUrl: "https://github.com/weskerllc/cronicorn/issues/new",

  /** Documentation and resource URLs */
  urls: {
    // Product pages
    home: "/",
    pricing: "/pricing",
    faq: "/faq",
    dashboard: "/dashboard",
    login: "/login",
    register: "/register",

    // Documentation
    documentation: "https://github.com/weskerllc/cronicorn#readme",
    quickstart: "https://github.com/weskerllc/cronicorn/blob/main/docs/quickstart.md",
    useCases: "https://github.com/weskerllc/cronicorn/blob/main/docs/use-cases.md",
    architecture: "https://github.com/weskerllc/cronicorn/blob/main/docs/architecture.md",
    apiReference: "https://github.com/weskerllc/cronicorn/blob/main/docs/api-reference.md",

    // Community
    github: "https://github.com/weskerllc/cronicorn",
    support: "https://github.com/weskerllc/cronicorn/issues/new",
    contributing: "https://github.com/weskerllc/cronicorn/blob/main/docs/contributing.md",
    changelog: "https://github.com/weskerllc/cronicorn/blob/main/CHANGELOG.md",

    // Legal
    privacy: "/privacy",
    terms: "/terms",
    contact: "mailto:support@cronicorn.com",
  },

  /**
   * SEO Configuration
   * Includes keywords, OpenGraph, and Twitter Card settings
   */
  seo: {
    defaultTitle: "Cronicorn - AI Job Scheduler | Intelligent Cron Alternative",
    titleTemplate: "%s | Cronicorn",
    keywords: [
      // Tier 1 primary keywords
      "adaptive task scheduler",
      "intelligent cron",
      "AI job scheduler",
      "event-driven job scheduler",
      "smart cron jobs",

      // Tier 2 secondary keywords
      "cron alternative with AI",
      "adaptive monitoring scheduler",
      "intelligent http scheduler",
      "devops automation scheduler",
      "automatic job scheduling",

      // Core authentic keywords based on real capabilities
      "adaptive job scheduling",
      "intelligent job scheduling",
      "AI hints system",
      "multi-tier coordination",
      "adaptive intervals",
      "cloud-native scheduler",
      "transparent AI scheduling",
      "workflow orchestration",

      // Technical terms from documentation
      "adaptive monitoring",
      "condition-based scheduling",
      "real-time job adaptation",
      "intelligent workflow coordination",
      "adaptive automation platform",
      "transparent scheduling decisions",
      "cloud job orchestration",
      "intelligent cron alternative",
      "adaptive task automation",

      // Use case specific
      "e-commerce monitoring automation",
      "data pipeline scheduling",
      "devops automation scheduler",
      "microservices monitoring",
      "flash sale infrastructure",
      "traffic surge automation",

      // Long-tail conversational queries  
      "how to schedule jobs that adapt to conditions",
      "intelligent monitoring that adjusts automatically",
      "AI scheduler that explains decisions",
      "scheduler that learns from patterns",
      "adaptive intervals for monitoring"
    ],
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Cronicorn",
      images: [
        {
          url: "https://cronicorn.com/og-image.png",
          width: 1200,
          height: 630,
          alt: "Cronicorn - Adaptive Job Scheduling Platform"
        }
      ]
    },
    twitter: {
      handle: "@cronicorn",
      site: "@cronicorn",
      cardType: "summary_large_image"
    }
  },

  /**
   * FAQ Content
   * Primary FAQs used for SEO structured data and FAQ page
   */
  faq: {
    primary: [
      {
        question: "What types of jobs can I schedule with Cronicorn?",
        answer: "Cronicorn can schedule any job triggered by HTTP requests including API health checks, webhooks, data pipelines, notification workflows, batch processing, cache warming, and automated testing. Our platform supports diverse use cases from e-commerce monitoring to DevOps automation.",
        category: "capabilities"
      },
      {
        question: "How does AI make scheduling decisions?",
        answer: "Cronicorn's AI analyzes execution patterns including success rates, response times, and failure streaks. It applies proven strategies like increasing monitoring frequency when metrics deteriorate, pausing endpoints during persistent failures, activating investigation tools when health checks detect issues, and gradually relaxing monitoring as systems recover.",
        category: "ai-features"
      },
      {
        question: "Can I disable AI and use fixed schedules?",
        answer: "Yes. You can use Cronicorn as a traditional scheduler with fixed intervals, enable AI only for specific endpoints, set strict min/max bounds that AI respects, or review all AI suggestions before they apply. You maintain full control over your scheduling decisions.",
        category: "flexibility"
      },
      {
        question: "What happens if AI makes a bad decision?",
        answer: "AI hints have TTL (time-to-live) and automatically expire. You set min/max intervals that AI cannot violate. Manual overrides always take priority. Every decision includes clear reasoning, making the system predictable and debuggable.",
        category: "safety"
      },
      {
        question: "How reliable is the scheduler?",
        answer: "Cronicorn uses distributed architecture with idempotent execution, graceful degradation, and transaction guarantees. AI failure doesn't stop job execution. The platform maintains high availability through automatic failover and distributed job execution.",
        category: "reliability"
      },
      {
        question: "Can I self-host Cronicorn?",
        answer: "Self-hosting is on our roadmap for enterprise customers. Currently, Cronicorn operates as a fully managed cloud service. Join our early access program to influence priorities and be notified when self-hosting options become available.",
        category: "deployment"
      },
      {
        question: "How does adaptive scheduling work during traffic spikes?",
        answer: "During traffic surges, Cronicorn automatically tightens monitoring intervals (e.g., 5min → 30sec), activates diagnostic tools, attempts proactive optimizations like cache warming, and coordinates multi-tier responses to prevent system overload while maintaining visibility.",
        category: "adaptive-features"
      },
      {
        question: "What's different about Cronicorn's AI compared to other tools?",
        answer: "Unlike black-box AI systems, Cronicorn provides transparent reasoning for every decision. Our AI hints system uses TTL, respects your boundaries, and explains adjustments like 'Traffic surge detected—tightening monitoring to 30 seconds.' You always know why the system made a change.",
        category: "differentiation"
      },
      {
        question: "Is this an intelligent cron replacement?",
        answer: "Yes, Cronicorn is designed as an intelligent cron alternative that goes beyond fixed schedules. Our adaptive task scheduler learns from your system patterns, adjusts to real-time conditions, and provides event-driven job scheduling that traditional cron cannot match.",
        category: "comparison"
      },
      {
        question: "How does your AI job scheduler reduce alert fatigue?",
        answer: "Our AI analyzes failure patterns and attempts auto-recovery before alerting humans. Example: Health check fails → AI activates diagnostics → Attempts cache warming → Only alerts if recovery fails. This reduces unnecessary pages by 80%.",
        category: "ai-benefits"
      }
    ]
  },

  /**
   * Splash Page Content
   * Configuration for splash page sections, CTAs, and headings
   */
  splash: {
    sections: {
      quickAnswers: {
        heading: "Quick Answers",
        description: "Everything you need to know about intelligent job scheduling"
      }
    },
    cta: {
      primary: {
        text: "Join Early Access",
        href: "/login"
      },
      secondary: {
        text: "View Documentation",
        href: "/docs"
      },
      github: {
        text: "View us on Github",
        href: "https://github.com/bcanfield/cron-mvp"
      }
    }
  },

  /**
   * Business Information
   * Used for structured data (schema.org) and contact information
   */
  business: {
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
      addressCountry: "US"
    },
    contactPoint: {
      telephone: "",
      contactType: "customer service",
      email: "support@cronicorn.com"
    },
    sameAs: [
      "https://twitter.com/cronicorn",
      "https://linkedin.com/company/cronicorn",
      "https://github.com/cronicorn"
    ]
  },

  /**
   * Pricing Tiers
   * Used for pricing page and SEO structured data (Product schema)
   */
  pricing: [
    {
      name: "Starter",
      description: "Perfect for individual developers and small projects",
      price: "$0",
      priceNumeric: 0,
      currency: "USD",
      period: "month",
      features: [
        "Up to 100 jobs",
        "Basic scheduling",
        "Email notifications",
        "Community support"
      ],
      popular: false,
      cta: "Get Started Free"
    },
    {
      name: "Professional",
      description: "Ideal for growing teams and production workloads",
      price: "$29",
      priceNumeric: 29,
      currency: "USD",
      period: "month",
      features: [
        "Unlimited jobs",
        "Adaptive scheduling",
        "Advanced analytics",
        "Priority support",
        "Team collaboration",
        "Custom integrations"
      ],
      popular: true,
      cta: "Start Professional Trial"
    },
    {
      name: "Enterprise",
      description: "For large organizations with complex scheduling needs",
      price: "Custom",
      priceNumeric: null,
      currency: "USD",
      period: "month",
      features: [
        "Everything in Professional",
        "Custom AI models",
        "Dedicated support",
        "SLA guarantees",
        "On-premise deployment",
        "Custom integrations"
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ]
} as const;

export default siteConfig;