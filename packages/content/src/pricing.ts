/**
 * Pricing Tiers
 * Single source of truth for pricing information
 */

export type PricingTier = {
  name: string;
  description: string;
  price: string;
  priceNumeric: number | null;
  currency: string;
  period: string;
  features: string[];
  popular: boolean;
  cta: string;
};

export const pricing: PricingTier[] = [
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
      "Community support",
    ],
    popular: false,
    cta: "Get Started Free",
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
      "Custom integrations",
    ],
    popular: true,
    cta: "Start Professional Trial",
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
      "Custom integrations",
    ],
    popular: false,
    cta: "Contact Sales",
  },
];
