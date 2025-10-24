const siteConfig = {
  // Basic site information
  siteName: "Cronicorn",
  siteUrl: "https://cronicorn.com", // Update with your actual domain
  tagline: "AI-Powered Job Scheduling Made Simple",
  description: "Cronicorn is the modern solution for intelligent job scheduling. Harness the power of AI to optimize your cron jobs, webhooks, and scheduled tasks with advanced analytics and smart recommendations.",

  // SEO & Meta
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
    "smart scheduling"
  ],

  // Social & Open Graph
  author: "Cronicorn Team",
  twitter: "@cronicorn", // Update with actual Twitter handle
  twitterCard: "summary_large_image" as const,

  // Images (update with actual URLs when available)
  logo: "/logo512.png",
  ogImage: "/og-image.png", // 1200x630px recommended
  favicon: "/favicon.ico",

  // External links
  githubUrl: "https://github.com/bcanfield/cron-mvp",
  supportUrl: "https://github.com/bcanfield/cron-mvp/issues/new",

  // Business info
  company: "Cronicorn",
  foundedYear: 2024,

  // Pricing tiers for structured data
  pricingTiers: [
    {
      name: "Free",
      price: 0,
      currency: "USD",
      period: "month",
      features: ["5 jobs", "100 runs/month", "Basic features", "Community support"]
    },
    {
      name: "Pro",
      price: 29.99,
      currency: "USD",
      period: "month",
      features: ["50 jobs", "Unlimited runs", "AI-powered scheduling", "Priority support"]
    },
    {
      name: "Enterprise",
      price: 99.99,
      currency: "USD",
      period: "month",
      features: ["Unlimited jobs", "Advanced analytics", "Custom integrations", "Dedicated support", "SLA guarantee"]
    }
  ]
} as const;

export default siteConfig;