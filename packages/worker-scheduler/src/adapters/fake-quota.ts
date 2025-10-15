import type { QuotaGuard } from "@cronicorn/domain";

/**
 * Simple fake quota implementation for testing.
 *
 * Configure `mode` to control behavior:
 * - "allow": All quota checks pass
 * - "deny": All quota checks fail
 */
export class FakeQuota implements QuotaGuard {
  mode: "allow" | "deny" = "allow";

  async canProceed(_tenantId: string): Promise<boolean> {
    return this.mode === "allow";
  }

  async recordUsage(_tenantId: string, _tokens: number): Promise<void> {
    // no-op in test fake
  }
}
