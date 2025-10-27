const siteConfig = {
  siteName: "Cronicorn",
  tagline: "AI-Powered Job Scheduling Platform",
  description: "Transform your cron jobs and scheduled tasks with Cronicorn's intelligent AI scheduling. Get smart recommendations, advanced analytics, and reliable job orchestration.",
  url: "https://cronicorn.com",
  githubUrl: "https://github.com/bcanfield/cron-mvp",
  supportUrl: "https://github.com/bcanfield/cron-mvp/issues/new",

  // SEO Configuration
  seo: {
    defaultTitle: "Cronicorn - AI-Powered Job Scheduling Platform",
    titleTemplate: "%s | Cronicorn",
    keywords: [
      "cron jobs",
      "job scheduling",
      "AI scheduling",
      "webhook management",
      "task automation",
      "scheduled tasks",
      "cron management",
      "job orchestration",
      "automation platform",
      "intelligent scheduling",
      "cron alternative",
      "job monitoring"
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
          alt: "Cronicorn - AI-Powered Job Scheduling Platform"
        }
      ]
    },
    twitter: {
      handle: "@cronicorn",
      site: "@cronicorn",
      cardType: "summary_large_image"
    }
  },

  // Business Information
  business: {
    name: "Cronicorn",
    legalName: "Cronicorn Technologies Inc.",
    description: "AI-powered job scheduling and automation platform",
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
        "AI-powered scheduling",
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