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
    category: "capabilities",
  },
  {
    question: "How does AI make scheduling decisions?",
    answer: "The AI reads each endpoint's HTTP response body (up to 500 characters of JSON) and compares field values against thresholds you define in the endpoint's description. For example, if your description says 'tighten when error_rate_pct > 5%' and the response contains error_rate_pct: 8.5, the AI calls propose_interval to tighten polling. It also reads sibling endpoint responses to coordinate actions like triggering recovery. All decisions are constrained by your min/max interval guardrails.",
    category: "ai-features",
  },
  {
    question: "Can I disable AI and use fixed schedules?",
    answer: "Yes. You can use Cronicorn as a traditional scheduler with fixed intervals, enable AI only for specific endpoints, set strict min/max bounds that AI respects, or review all AI suggestions before they apply. You maintain full control over your scheduling decisions.",
    category: "flexibility",
  },
  {
    question: "What happens if AI makes a bad decision?",
    answer: "All AI hints have TTL (time-to-live) and automatically expire back to your baseline schedule. Your min/max interval constraints are hard guardrails the AI cannot violate. Manual overrides always take priority. Every decision includes clear reasoning showing which response body fields were read and why the AI acted, making the system predictable and debuggable.",
    category: "safety",
  },
  {
    question: "How reliable is the scheduler?",
    answer: "Cronicorn uses distributed architecture with idempotent execution, graceful degradation, and transaction guarantees. AI failure doesn't stop job execution. The platform maintains high availability through automatic failover and distributed job execution.",
    category: "reliability",
  },
  {
    question: "Can I self-host Cronicorn?",
    answer: "Self-hosting is on our roadmap for enterprise customers. Currently, Cronicorn operates as a fully managed cloud service. Join our early access program to influence priorities and be notified when self-hosting options become available.",
    category: "deployment",
  },
  {
    question: "How does adaptive scheduling work during traffic spikes?",
    answer: "When your endpoint's response body shows degraded metrics (e.g., error_rate_pct > 5% or status: degraded), the AI tightens polling frequency — from 5 minutes to 30 seconds, for example. If you have a recovery sibling endpoint, the AI triggers it automatically. When metrics normalize, hints expire and the endpoint returns to its baseline schedule. Your min/max constraints guarantee the AI stays within bounds throughout.",
    category: "adaptive-features",
  },
  {
    question: "What's different about Cronicorn's AI compared to other tools?",
    answer: "Cronicorn's AI reads actual response body data from your endpoints — it doesn't just monitor success/failure. You control behavior through natural language descriptions (not code or config), and min/max constraints act as hard guardrails. Every AI hint has a TTL and auto-expires to baseline. Every decision includes reasoning showing which fields were read and what thresholds were triggered.",
    category: "differentiation",
  },
  {
    question: "Is this an intelligent cron replacement?",
    answer: "Yes. Cronicorn replaces fixed-schedule cron with HTTP endpoints that understand their own responses. Your endpoints return JSON data, the AI reads the response body fields, and scheduling adapts based on rules you write in plain English descriptions. Endpoints can also trigger each other — a health-check can automatically trigger a recovery action. Traditional cron can't do any of this.",
    category: "comparison",
  },
  {
    question: "How does Cronicorn reduce alert fatigue?",
    answer: "Sibling endpoints coordinate automatically. A health-check endpoint detects errors in its response body, the AI triggers a recovery sibling endpoint, waits for a cooldown period, and checks again. Only if recovery fails after multiple attempts does the system escalate. This replaces manual runbooks with description-driven coordination — no webhooks or glue code required.",
    category: "ai-benefits",
  },
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
  { id: "ai-benefits", label: "AI Benefits" },
] as const;
