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
    title: "AI-Powered Intelligence",
    description: "Smart scheduling that learns from your patterns",
  },
  {
    title: "Enterprise Security",
    description: "Bank-grade encryption and compliance ready",
  },
  {
    title: "99.9% Uptime",
    description: "Reliable infrastructure you can depend on",
  },
];

/** FAQs specific to pricing and billing */
export const pricingFAQs: PricingFAQ[] = [
  {
    question: "Can I change my plan at any time?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes will be prorated and reflected in your next billing cycle.",
  },
  {
    question: "What happens if I exceed my job limits?",
    answer: "If you exceed your plan limits, you'll be notified and given the option to upgrade. Your existing jobs will continue to work while you decide.",
  },
  {
    question: "Do you offer annual discounts?",
    answer: "Yes! Annual subscriptions receive a 20% discount. Contact our support team to set up annual billing.",
  },
  {
    question: "Is there an SLA for Enterprise customers?",
    answer: "Yes, Enterprise customers receive a 99.9% uptime SLA with dedicated support and priority issue resolution.",
  },
  {
    question: "Can I cancel at any time?",
    answer: "Absolutely. You can cancel your subscription at any time. You'll retain access to paid features until the end of your current billing period.",
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
