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
    question: "What's your refund policy?",
    answer: "We offer a 14-day money-back guarantee, no questions asked. If you're not satisfied with Premium for any reason, contact us within 14 days for a full refund.",
  },
  {
    question: "Can I change my plan at any time?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes will be prorated and reflected in your next billing cycle.",
  },
  {
    question: "What happens if I exceed my limits?",
    answer: "If you approach your plan limits, you'll be notified with plenty of time to upgrade. Your existing endpoints will continue working while you decide.",
  },
  {
    question: "Do you offer annual discounts?",
    answer: "Yes! Annual subscriptions receive a 20% discount (2 months free). Plus, early adopters get an additional 35% off Premium for life.",
  },
  {
    question: "What's the Early Adopter Offer?",
    answer: "Premium is normally $29/month, but early adopters get it for just $19/month (35% off) forever. This is a limited-time offer to thank our early supporters.",
  },
  {
    question: "Is there an SLA for Enterprise customers?",
    answer: "Yes, Enterprise customers receive a 99.9% uptime SLA with dedicated support and priority issue resolution.",
  },
  {
    question: "Can I cancel at any time?",
    answer: "Absolutely. You can cancel your subscription at any time. You'll retain access to paid features until the end of your current billing period.",
  },
  {
    question: "How are AI tokens calculated?",
    answer: "AI tokens measure the intelligence used for adaptive scheduling. Free tier includes 100k tokens/month (enough for ~5 endpoints with AI). Premium multiplies this 10× to 1M tokens.",
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
