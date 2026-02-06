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
    question: "How does Cronicorn know when to adjust scheduling?",
    powerSentence: "Endpoints read their own response bodies — the AI interprets the data and adapts.",
    seoText: "Cronicorn's AI reads the JSON response body from each HTTP endpoint execution. It compares field values against thresholds you define in a natural language description. When error_rate_pct exceeds 5%, the AI tightens polling to 30 seconds. When metrics normalize, it returns to baseline. No parsing code to write — describe the rules, and the AI handles the rest.",
    format: "definition",
  },
  {
    question: "How do endpoints coordinate with each other?",
    powerSentence: "Sibling endpoints read each other's responses and trigger actions automatically.",
    seoText: "Place related endpoints in the same job and they gain sibling visibility. A health-check endpoint detects errors, and the AI triggers a recovery endpoint via one-shot. An ETL extract stage sets ready_for_transform=true, and the transform stage picks it up. Coordinate pipelines, chain recovery actions, and cascade workflows — all through response body signals and descriptions.",
    format: "rich",
  },
  {
    question: "Real examples: How endpoints adapt from their own responses",
    powerSentence: "Response body fields drive scheduling decisions automatically.",
    seoText: "Health monitoring: status changes to degraded → AI tightens from 5min to 30sec → status returns to healthy → back to baseline. Data sync: records_pending hits 5000 → AI tightens to 30sec → backlog clears → relaxes to 10min. Error recovery: health-check detects failure → triggers recovery sibling → waits for cooldown → confirms recovery. Queue monitoring: queue_depth exceeds threshold → AI tightens to track drain rate.",
    format: "examples",
  },
  {
    question: "What makes this different from regular cron jobs?",
    powerSentence: "Endpoints understand their own responses and act on them — no code required.",
    seoText: "Traditional cron runs on fixed schedules regardless of what your endpoints return. Cronicorn reads response bodies: when error_rate_pct spikes, polling tightens. When a sibling endpoint reports failure, recovery triggers automatically. You describe the rules in plain English and set min/max guardrails — the AI handles interpretation, and hints auto-expire back to baseline.",
    format: "comparison",
  },
] as const;
