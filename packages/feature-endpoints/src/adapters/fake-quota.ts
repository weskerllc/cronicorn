import type { QuotaGuard } from "../domain/ports.js";

export class FakeQuota implements QuotaGuard {
    mode: "ok" | "retry" | "deny" = "ok";
    retryInMs = 10_000;
    async reserveAI() {
        return this.mode === "ok"
            ? { kind: "ok", reservationId: "r1" as const }
            : this.mode === "retry"
                ? { kind: "retry", retryInMs: this.retryInMs }
                : { kind: "deny", reason: "cap" as const };
    }

    async commit() { /* no-op */ }
    async release() { /* no-op */ }
}
