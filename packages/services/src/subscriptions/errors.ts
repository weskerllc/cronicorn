/**
 * Custom error classes for subscription refund operations.
 * These errors indicate business rule violations (400-level HTTP errors).
 */

export class RefundNotEligibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundNotEligibleError";
  }
}

export class RefundExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundExpiredError";
  }
}

export class RefundAlreadyProcessedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundAlreadyProcessedError";
  }
}

export class RefundConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundConcurrencyError";
  }
}
