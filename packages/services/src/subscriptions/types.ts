import type { JobsRepo, PaymentProvider, WebhookEventsRepo } from "@cronicorn/domain";

export type SubscriptionDeps = {
  jobsRepo: JobsRepo;
  paymentProvider: PaymentProvider;
  webhookEventsRepo: WebhookEventsRepo;
  baseUrl: string;
};

export type CreateCheckoutInput = {
  userId: string;
  tier: "pro" | "enterprise";
};

export type CreatePortalInput = {
  userId: string;
};

export type SubscriptionStatus = {
  tier: "free" | "pro" | "enterprise";
  status: string | null;
  endsAt: Date | null;
};
