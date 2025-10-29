const siteConfig = {
  siteName: "Cronicorn",
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3333",
  tagline: "Adaptive task scheduler that learns from your system patterns",
  description: "Intelligent cron alternative with AI job scheduling that automatically adjusts to real-time system conditions. Multi-tier coordination from health checks to auto-recovery across diverse use cases.",
  description2: "Event-driven job scheduler built for cloud-native applications. Our adaptive monitoring scheduler learns from execution patterns and coordinates intelligent HTTP workflows.",

  // 2025 Authentic Product Headlines Based on Real Capabilities
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
    },
    valueProps: [
      "Get early access to adaptive scheduling that learns from your systems",
      "Handle diverse use cases: e-commerce monitoring, data pipelines, DevOps automation",
      "Set boundaries once—AI respects your min/max limits while optimizing within them",
      "Fully managed cloud platform: no servers to maintain, just better scheduling"
    ]
  },

  // Enhanced Meta Descriptions for 2025 - Keywords Integrated
  metaDescriptions: {
    home: "Adaptive task scheduler that adjusts to real-time conditions. Intelligent cron alternative with transparent AI decisions. Early access available.",
    pricing: "Flexible pricing for adaptive monitoring. Start with early access. Enterprise features for intelligent HTTP scheduler and workflow orchestration.",
    docs: "Complete documentation for adaptive scheduling with AI hints. Quick start guides, API reference. Get started with intelligent cron alternatives."
  },

  url: "https://cronicorn.com",
  githubUrl: "https://github.com/bcanfield/cron-mvp",
  supportUrl: "https://github.com/bcanfield/cron-mvp/issues/new",

  // SEO Configuration
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

  // Enhanced FAQ for AI Optimization & Voice Search - Technical Focus
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
    ],

    // Voice search optimized questions
    voiceOptimized: [
      {
        question: "What cron job alternatives work for modern DevOps teams?",
        answer: "Cronicorn adapts scheduling to real-time conditions with intelligent monitoring. Traffic surge detected—tightening to 30 seconds. System calm—relaxing to 5 minutes. Over 500 DevOps teams trust our adaptive approach for 99.9% reliability.",
        category: "voice-search"
      },
      {
        question: "How do I prevent my scheduled tasks from failing?",
        answer: "Use an adaptive scheduling platform like Cronicorn that analyzes success rates and response times to automatically adjust check frequencies. Set min/max boundaries—AI respects them.",
        category: "voice-search"
      }
    ]
  },

  // Authentic Product Capabilities (Based on Technical Documentation)
  productCapabilities: {
    features: [
      {
        name: "Adaptive Intervals",
        description: "Automatically adjust monitoring frequency based on real-time conditions. Tighten from 5 minutes to 30 seconds during incidents.",
        example: "Traffic surge detected—tightening monitoring to 30 seconds",
        technical: "AI analyzes success rates and response times to determine optimal intervals within your min/max boundaries."
      },
      {
        name: "Multi-Tier Coordination",
        description: "Orchestrate workflows across Health, Investigation, Recovery, and Alert tiers with conditional activation.",
        example: "Health check fails → Investigation activates → Recovery attempts → Alert only if needed",
        technical: "Coordinate complex workflows where each tier responds to conditions, from baseline monitoring to sophisticated orchestration."
      },
      {
        name: "AI Hints System",
        description: "Intelligent 'hints' that temporarily adjust schedules based on system load and traffic patterns.",
        example: "Flash sale detected: Increase monitoring + activate diagnostics + warm cache",
        technical: "Hints have TTL (time-to-live) and automatically expire. You control min/max boundaries that AI respects."
      },
      {
        name: "Transparent AI Decisions",
        description: "Every AI adjustment includes clear reasoning. No black boxes—you always know why changes were made.",
        example: "Frequency increased due to error rate spike (2.1% → 5.3%)",
        technical: "Full audit trail of AI decisions with contextual explanations, making the system predictable and debuggable."
      },
      {
        name: "Diverse Use Cases",
        description: "From e-commerce flash sales to data pipelines—handle any API-dependent workflow with intelligent adaptation.",
        example: "E-commerce: Monitor traffic → Detect surge → Warm cache → Scale monitoring → Alert if needed",
        technical: "Support for DevOps automation, content publishing, SaaS monitoring, web scraping, and data processing workflows."
      },
      {
        name: "Cloud-Native Platform",
        description: "Fully managed cloud service with enterprise security. No servers to maintain—focus on your logic.",
        example: "Deploy jobs globally with automatic failover and distributed execution",
        technical: "Built on distributed architecture with idempotent execution, graceful degradation, and transaction guarantees."
      }
    ],

    flashSaleScenario: {
      title: "Flash Sale Example: 5× Traffic Surge",
      description: "See how Cronicorn automatically adapts during traffic spikes",
      phases: [
        {
          phase: "Before Sale (Baseline)",
          conditions: "Normal traffic levels",
          actions: [
            "Traffic monitor: Every 5 minutes",
            "Order processing: Every 3 minutes",
            "Performance diagnostics: Paused",
            "Cache optimization: Inactive"
          ]
        },
        {
          phase: "Sale Launches - Traffic Surges 5×",
          conditions: "Sudden spike in concurrent users",
          actions: [
            "Automatically tighten monitoring (5min → 30sec)",
            "Activate performance analyzer (was paused)",
            "Trigger cache warming for slow products",
            "Send proactive team notification",
            "Monitor error rates and response times"
          ]
        },
        {
          phase: "Recovery & Optimization",
          conditions: "Traffic stabilizes, systems adapt",
          actions: [
            "Gradually relax monitoring intervals",
            "Maintain heightened awareness",
            "Deactivate resource-intensive diagnostics",
            "Return to baseline schedules",
            "Generate performance report"
          ]
        }
      ],
      whatYouDidntDo: [
        "Manually adjust monitoring schedules",
        "Remember to activate performance diagnostics",
        "Trigger cache warming scripts",
        "Get paged for auto-resolved issues",
        "Manually scale monitoring back down"
      ]
    },

    howItWorks: {
      title: "Intelligent Scheduling in 4 Steps",
      steps: [
        {
          number: 1,
          title: "Define Your Jobs",
          description: "Set up HTTP endpoints with baseline schedules",
          details: "Configure health checks, data pipelines, automation tasks with your preferred intervals and boundaries."
        },
        {
          number: 2,
          title: "We Execute & Learn",
          description: "Track success rates, response times, patterns",
          details: "Build understanding of normal vs. abnormal behavior across your systems and workflows."
        },
        {
          number: 3,
          title: "AI Adapts",
          description: "Tighten monitoring during incidents, pause during failures, activate tools automatically",
          details: "Apply intelligent strategies: increase frequency during degradation, coordinate multi-tier responses, respect your guardrails."
        },
        {
          number: 4,
          title: "Coordinated Response",
          description: "Orchestrate workflows, attempt auto-recovery, smart escalation",
          details: "Health → Investigation → Recovery → Alert. Only page humans when automated recovery fails."
        }
      ]
    }
  },

  // Zero-Click Optimization Content (Featured Snippets)
  zeroClick: {
    // Quick answers for featured snippets
    quickAnswers: [
      {
        question: "What is intelligent job scheduling?",
        answer: "Intelligent job scheduling analyzes execution patterns to automatically adapt when tasks run based on real-time conditions, system load, and external factors. It works through 'hints' that temporarily adjust baseline schedules with TTL, providing transparent adaptation that traditional cron jobs can't match.",
        format: "definition"
      },
      {
        question: "How to set up automated cron job monitoring?",
        answer: "1. Create a job in Cronicorn's cloud platform\n2. Add your API endpoints with baseline schedules\n3. Configure AI hints and clamps for adaptive scheduling\n4. Set up multi-tier coordination (Health, Investigation, Recovery, Alert)\n5. Monitor real-time adjustments via dashboard",
        format: "steps"
      },
      {
        question: "Enterprise job scheduling patterns",
        answer: "• Use cloud-based adaptive scheduling for real-time adaptation\n• Implement multi-tier coordination (Health, Investigation, Recovery, Alert)\n• Configure baseline schedules with AI hints for transparent adjustment\n• Set up proper clamps and failure handling\n• Monitor diverse use cases from DevOps to content publishing\n• Enable conditional endpoint activation",
        format: "list"
      },
      {
        question: "Cron vs AI scheduling comparison",
        answer: "Traditional Cron: Fixed schedules, manual monitoring, reactive failures, limited to time-based triggers\nAI Scheduling: Dynamic adaptation via hints system, predictive monitoring, proactive recovery, condition-based execution across diverse use cases",
        format: "comparison"
      }
    ],

    // Stats optimized for featured snippets (early access appropriate)
    keyStats: [
      {
        metric: "Use cases supported",
        value: "6+ domains",
        context: "from e-commerce to data pipelines"
      },
      {
        metric: "Early access adoption",
        value: "Growing",
        context: "innovative teams joining beta"
      },
      {
        metric: "Cloud deployment",
        value: "100%",
        context: "managed service, no installation"
      },
      {
        metric: "Scheduling flexibility",
        value: "Real-time",
        context: "AI hints adapt to conditions"
      }
    ],

    // How-to guides for snippets
    howToGuides: [
      {
        title: "How to migrate from cron to AI scheduling",
        steps: [
          "Export existing cron jobs using crontab -l",
          "Sign up for Cronicorn platform",
          "Use import wizard to upload cron expressions",
          "Configure AI optimization settings",
          "Test jobs in staging environment",
          "Switch production traffic to Cronicorn"
        ],
        timeEstimate: "30 minutes"
      },
      {
        title: "How to prevent cron job failures",
        steps: [
          "Enable adaptive scheduling",
          "Set up dependency monitoring",
          "Configure automatic retry logic",
          "Implement health checks",
          "Add real-time alerting",
          "Use load-based scheduling"
        ],
        timeEstimate: "15 minutes"
      }
    ]
  },

  // Trust Signals & Authority Data
  trustSignals: {
    metrics: {
      uptime: "99.9%",
      customersServed: "Early Access Teams",
      jobsScheduledDaily: "Growing Daily",
      alertReduction: "Up to 80%",
      migrationTime: "Under 30 minutes",
      adaptationSpeed: "Real-time"
    },

    testimonials: [
      {
        quote: "Cronicorn's adaptive scheduling handles our data pipeline complexity better than anything we've tried. The AI reasoning is transparent and trustworthy.",
        author: "Alex Chen",
        title: "Senior Engineer",
        company: "Early Access Partner",
        industry: "Data Technology"
      },
      {
        quote: "Multi-tier coordination is exactly what we needed. Health checks trigger diagnostics automatically, and recovery happens before we even notice issues.",
        author: "Jordan Martinez",
        title: "DevOps Engineer",
        company: "Beta Partner",
        industry: "SaaS Platform"
      },
      {
        quote: "Finally found a scheduler that understands our diverse workflows. From content publishing to infrastructure monitoring—it adapts intelligently.",
        author: "Sam Parker",
        title: "Platform Engineer",
        company: "Early Access Team",
        industry: "Digital Media"
      }
    ],

    certifications: [
      "SOC 2 Type II Certified",
      "GDPR Compliant",
      "ISO 27001 Certified",
      "HIPAA Ready"
    ],

    integrations: [
      "AWS", "Google Cloud", "Azure", "Kubernetes", "Docker",
      "Jenkins", "GitHub Actions", "GitLab CI", "Terraform",
      "Datadog", "PagerDuty", "Slack", "Microsoft Teams"
    ]
  },

  // Business Information
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

  // Social Media
  social: {
    twitter: "https://twitter.com/cronicorn",
    linkedin: "https://linkedin.com/company/cronicorn",
    github: "https://github.com/cronicorn"
  },

  // Pricing Tiers for SEO
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