import type { QuotaGuard } from "../domain/ports.js";

export class FakeQuota implements QuotaGuard {
  mode: "ok" | "retry" | "deny" = "ok";
  retryInMs = 10_000;
  async reserveAI(_tenantId: string, _model: string, _estPrompt: number, _maxCompletion: number) {
    return this.mode === "ok"
      ? { kind: "ok" as const, reservationId: "r1" }
      : this.mode === "retry"
        ? { kind: "retry" as const, retryInMs: this.retryInMs }
        : { kind: "deny" as const, reason: "cap" };
  }

  async commit() { /* no-op */ }
  async release() { /* no-op */ }
}
