/**
 * Pricing page content
 * Features and FAQs specific to pricing/plans page
 */

export type PricingFeature = {
  title: string;
  description: string;
};

export type PricingFAQ = {
  question: string;
  answer: string;
};

/** Feature highlights for pricing page */
export const pricingFeatures: PricingFeature[] = [
  {
    title: "AI-powered scheduling",
    description: "Adaptive scheduling with soft token limits per tier",
  },
  {
    title: "Built-in guardrails",
    description: "Tier-based caps on endpoints and minimum intervals",
  },
  {
    title: "Start free, upgrade later",
    description: "Begin with core features and scale when ready",
  },
];

/** FAQs specific to pricing and billing */
export const pricingFAQs: PricingFAQ[] = [
  {
    question: "What's your refund policy?",
    answer: "We offer a 14-day money-back guarantee, no questions asked. If you're not satisfied with Premium for any reason, contact us within 14 days for a full refund.",
  },
  {
    question: "Can I change my plan at any time?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes will be prorated and reflected in your next billing cycle.",
  },
  {
    question: "What happens if I exceed my limits?",
    answer: "If you reach your plan limits, execution defers to the next month. Your existing endpoints continue working unchanged. You can upgrade anytime to increase your limits and resume execution.",
  },
  {
    question: "Do you offer annual discounts?",
    answer: "Yes! Annual subscriptions receive a 20% discount (2 months free). Early Adopters lock Premium at $24/mo or $228/year (~$19/mo effective) for life.",
  },
  {
    question: "What's the Early Adopter Offer?",
    answer: "Premium is normally $39/month, but early adopters lock $24/month (about 38% off) forever — or $228 billed annually (~$19/mo effective). Limited-time while in early access.",
  },
  {
    question: "Is there an SLA for Enterprise customers?",
    answer: "Enterprise is tailored. Tell us about your workload and we’ll discuss the right availability and support options—no blanket SLA promises here.",
  },
  {
    question: "Can I cancel at any time?",
    answer: "Absolutely. You can cancel your subscription at any time. You'll retain access to paid features until the end of your current billing period.",
  },
  {
    question: "How are AI tokens calculated?",
    answer: "AI tokens measure the intelligence used for adaptive scheduling. Limits are soft: Free includes 100k tokens/month and Premium 1M/month, with usage counted after each AI analysis session.",
  },
];

/** Marketing text used on pricing page */
export const pricingText = {
  hero: {
    subtitle: "Start free and scale with your needs. All plans include our core AI scheduling features.",
  },
  testimonials: {
    heading: "Trusted by Developers Worldwide",
  },
  cta: {
    subtitle: "Sign in with GitHub to start scheduling with AI intelligence",
  },
} as const;
