/**
 * Quick Answers content for homepage
 * FAQ-style content optimized for SEO with structured data
 */

export type QuickAnswer = {
  question: string;
  powerSentence: string;
  seoText: string;
  format: "definition" | "rich" | "examples" | "comparison";
};

export const quickAnswers: QuickAnswer[] = [
  {
    question: "How does Cronicorn know when to run your code?",
    powerSentence: "AI adapts timing based on what's actually happening in your systems.",
    seoText: "It adapts HTTP request timing based on real conditions. Data pipelines run faster when processing backlogs, social media posts shift to peak engagement windows, web scrapers slow down when rate-limited, billing cycles accelerate near quota limits. AI adjusts intervals automatically with clear reasoning: 'Backlog detected—increasing ETL frequency to 2 minutes.'",
    format: "definition",
  },
  {
    question: "How does Cronicorn work across different use cases?",
    powerSentence: "One platform adapts to DevOps, e-commerce, content, data pipelines, and more.",
    seoText: "Set up HTTP endpoints with baseline schedules. Cronicorn executes and learns patterns. AI adapts timing based on traffic, failures, engagement, and quotas. Coordinate multi-tier workflows from Extract→Transform→Load to Health→Investigation→Recovery. Every adjustment explained in plain language.",
    format: "rich",
  },
  {
    question: "Real examples: How Cronicorn adapts across domains",
    powerSentence: "Watch intervals automatically adjust to real conditions.",
    seoText: "Data Pipeline: ETL runs every hour → backlog detected → increases to 15min → clears → back to hourly. Content Publishing: Posts scheduled for 9am → high engagement detected → AI suggests immediate follow-up. Web Scraping: Requests every 5sec → rate limit warning → slows to 30sec → recovers → resumes. E-commerce: Health checks every 5min → traffic surge → tightens to 30sec → stabilizes → relaxes",
    format: "examples",
  },
  {
    question: "What makes this different from regular cron jobs?",
    powerSentence: "Context-aware automation that understands what's happening now.",
    seoText: "Traditional cron runs on fixed schedules regardless of conditions—whether your pipeline has a massive backlog or your posts are going viral. Cronicorn adapts in real-time: 'Backlog growing—increasing to 2 minutes' or 'Engagement spiking—posting immediately' or 'Rate limit hit—slowing to 30 seconds.'",
    format: "comparison",
  },
] as const;
