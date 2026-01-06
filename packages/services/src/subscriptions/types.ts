import type { JobsRepo, Logger, PaymentProvider } from "@cronicorn/domain";

export type SubscriptionDeps = {
  jobsRepo: JobsRepo;
  paymentProvider: PaymentProvider;
  baseUrl: string;
  logger: Logger;
};

export type CreateCheckoutInput = {
  userId: string;
  tier: "pro" | "enterprise";
  billingPeriod?: "monthly" | "annual";
};

export type CreatePortalInput = {
  userId: string;
};

export type SubscriptionStatus = {
  tier: "free" | "pro" | "enterprise";
  status: string | null;
  endsAt: Date | null;
  refundEligibility?: {
    eligible: boolean;
    expiresAt: Date | null;
    status: string | null;
  };
};
