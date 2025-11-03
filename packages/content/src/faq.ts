/**
 * FAQ Content
 * Single source of truth for all FAQ items across web app and docs site
 */

export type FAQItem = {
  question: string;
  answer: string;
  category: string;
};

export const faq: FAQItem[] = [
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
];

/** Group FAQs by category for organized display */
export function getFAQsByCategory(): Record<string, FAQItem[]> {
  const grouped: Record<string, FAQItem[]> = {};
  for (const item of faq) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }
  return grouped;
}

/** Get FAQ categories in a display-friendly format */
export const faqCategories = [
  { id: "capabilities", label: "Capabilities" },
  { id: "ai-features", label: "AI Features" },
  { id: "flexibility", label: "Flexibility" },
  { id: "safety", label: "Safety" },
  { id: "reliability", label: "Reliability" },
  { id: "deployment", label: "Deployment" },
  { id: "adaptive-features", label: "Adaptive Features" },
  { id: "differentiation", label: "Differentiation" },
  { id: "comparison", label: "Comparison" },
  { id: "ai-benefits", label: "AI Benefits" }
] as const;
