import { type JobEndpoint, jobEndpointSchema, type RunsRepo } from "../domain/ports.js";

export class InMemoryJobsRepo {
    private map = new Map<string, JobEndpoint>();
    constructor(private now: () => Date) { } // <-- inject clock

    add(ep: JobEndpoint) { this.map.set(ep.id, ep); }

    async claimDueEndpoints(limit: number, lockTtlMs: number) {
        const nowMs = this.now().getTime(); // <-- use fake clock
        const due = [...this.map.values()]
            .filter(e =>
                e.nextRunAt.getTime() <= nowMs
                && (!e.pausedUntil || e.pausedUntil.getTime() <= nowMs)
                && (!e.lockedUntil || e.lockedUntil.getTime() <= nowMs),
            )
            .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())
            .slice(0, limit);

        const until = new Date(nowMs + lockTtlMs);
        due.forEach((d) => {
            d.lockedUntil = until;
        });
        return due.map(d => d.id);
    }

    async setNextRunAtIfEarlier(id: string, when: Date) {
        const e = this.map.get(id);
        if (!e)
            throw new Error(`setNextRunAtIfEarlier: not found: ${id}`);
        const now = this.now();

        if (e.pausedUntil && e.pausedUntil > now)
            return;

        const minAt = e.minIntervalMs ? new Date(now.getTime() + e.minIntervalMs) : undefined;
        const maxAt = e.maxIntervalMs ? new Date(now.getTime() + e.maxIntervalMs) : undefined;

        let candidate = when;
        if (minAt && candidate < minAt)
            candidate = minAt;
        if (maxAt && candidate > maxAt)
            candidate = maxAt;

        if (candidate < e.nextRunAt) {
            // (optional) debug:
            // console.log(`[nudge] ${id}: before=${e.nextRunAt.toISOString()} candidate=${candidate.toISOString()} now=${now.toISOString()}`);
            e.nextRunAt = candidate;
        }
        else {
            // (optional) debug:
            // console.log(`[nudge-skip] ${id}: before=${e.nextRunAt.toISOString()} candidate=${candidate.toISOString()} now=${now.toISOString()}`);
        }
    }

    async getEndpoint(id: string) {
        const e = this.map.get(id);
        if (!e)
            throw new Error(`JobsRepo.getEndpoint: not found: ${id}`);
        // structured clone if you want immutability:
        const clone = JSON.parse(JSON.stringify(e));
        const parsed = jobEndpointSchema.parse(clone);
        return parsed;
    }

    async setLock(id: string, until: Date) {
        const e = this.map.get(id);
        if (!e)
            throw new Error(`JobsRepo.setLock: not found: ${id}`);
        e.lockedUntil = until;
    }

    async clearLock(id: string) {
        const e = this.map.get(id);
        if (!e)
            throw new Error(`JobsRepo.clearLock: not found: ${id}`);
        e.lockedUntil = undefined;
    }

    async updateAfterRun(id: string, p: {
        lastRunAt: Date;
        nextRunAt: Date;
        status: any;
        failureCountDelta: number;
        clearExpiredHints: boolean;
    }) {
        const e = this.map.get(id);
        if (!e)
            throw new Error(`JobsRepo.updateAfterRun: not found: ${id}`);
        e.lastRunAt = p.lastRunAt;
        e.nextRunAt = p.nextRunAt;
        e.lastStatus = p.status;
        e.failureCount = Math.max(0, e.failureCount + p.failureCountDelta);
        e.lockedUntil = undefined;
        if (p.clearExpiredHints && e.aiHintExpiresAt && e.aiHintExpiresAt <= p.lastRunAt) {
            e.aiHintNextRunAt = undefined;
            e.aiHintIntervalMs = undefined;
            e.aiHintExpiresAt = undefined;
            e.aiHintReason = undefined;
        }
    }

    async writeAIHint(id: string, h: { nextRunAt?: Date; intervalMs?: number; expiresAt: Date; reason?: string }) {
        const e = this.map.get(id);
        if (!e)
            throw new Error(`JobsRepo.writeAIHint: not found: ${id}`);
        e.aiHintNextRunAt = h.nextRunAt;
        e.aiHintIntervalMs = h.intervalMs;
        e.aiHintExpiresAt = h.expiresAt;
        e.aiHintReason = h.reason;
    }

    async setPausedUntil(id: string, until: Date | null) {
        const e = this.map.get(id);
        if (!e)
            throw new Error(`JobsRepo.setPausedUntil: not found: ${id}`);
        e.pausedUntil = until ?? undefined;
    }
}

export class InMemoryRunsRepo implements RunsRepo {
    private seq = 0;
    runs: any[] = [];
    async create(r: any) { const id = `run_${this.seq++}`; this.runs.push({ id, ...r, startedAt: Date.now() }); return id; }
    async finish(id: string, patch: any) { Object.assign(this.runs.find(r => r.id === id)!, patch); }
}
