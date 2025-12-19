/**
 * Pricing Tiers
 * Single source of truth for pricing information
 */

export type BillingPeriod = "monthly" | "annual";

export type PricingTier = {
  name: string;
  description: string;
  price: string;
  priceNumeric: number | null;
  annualPrice?: string;
  annualPriceNumeric?: number | null;
  currency: string;
  period: string;
  features: string[];
  popular: boolean;
  cta: string;
  earlyAdopterDiscount?: {
    originalPrice: string;
    discountPercent: number;
    badge: string;
  };
};

export const pricing: PricingTier[] = [
  {
    name: "Free",
    description: "Experience the power of AI-driven scheduling",
    price: "$0",
    priceNumeric: 0,
    currency: "USD",
    period: "forever",
    features: [
      "5 endpoints",
      "AI scheduling (100k tokens/month)",
      "1-minute minimum interval",
      "Community support",
    ],
    popular: false,
    cta: "Start Free",
  },
  {
    name: "Premium",
    description: "Multiply your scheduling power with AI intelligence",
    price: "$19",
    priceNumeric: 19,
    annualPrice: "$15.20",
    annualPriceNumeric: 15.20,
    currency: "USD",
    period: "month",
    features: [
      "100 endpoints (20× more)",
      "AI scheduling (1M tokens/month)",
      "10-second minimum interval",
    ],
    popular: true,
    cta: "Start Premium",
    earlyAdopterDiscount: {
      originalPrice: "$29",
      discountPercent: 35,
      badge: "Early Adopter: 35% OFF",
    },
  },
  {
    name: "Enterprise",
    description: "For organizations with mission-critical scheduling",
    price: "Custom",
    priceNumeric: null,
    currency: "USD",
    period: "month",
    features: [
      "Tell us about your workload — contact sales for a tailored plan",
    ],
    popular: false,
    cta: "Contact Sales",
  },
];
