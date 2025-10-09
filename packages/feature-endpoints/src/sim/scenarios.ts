// packages/feature-endpoints/src/sim/scenarios.ts

import { FakeClock } from "../adapters/fake-clock.js";
import { FakeDispatcher } from "../adapters/fake-dispatcher.js";
import { InMemoryJobsRepo, InMemoryRunsRepo } from "../adapters/memory-store.js";
import { callTool, type Cron, type Tool } from "../domain/ports.js";
import { Scheduler } from "../domain/scheduler.js";

/* =========================
   In-memory metrics (CPU)
   ========================= */
export type MetricSample = { at: Date; cpu: number; mem: number; disk: number };

export class InMemoryMetricsRepo {
    private map = new Map<string, MetricSample[]>();

    push(endpointId: string, s: MetricSample) {
        const arr = this.map.get(endpointId) ?? [];
        arr.push(s);
        this.map.set(endpointId, arr);
    }

    latest(endpointId: string): MetricSample | undefined {
        const arr = this.map.get(endpointId) ?? [];
        return arr[arr.length - 1];
    }

    consecutiveHighMinutes(endpointId: string, threshold = 80): number {
        const arr = (this.map.get(endpointId) ?? []).slice().reverse();
        let mins = 0;
        for (const s of arr) {
            if (s.cpu >= threshold)
                mins++;
            else break;
        }
        return mins;
    }

    all(endpointId: string): MetricSample[] {
        return this.map.get(endpointId) ?? [];
    }
}

/* =========================
   Flash Sale Metrics
   ========================= */
export type FlashSaleMetricSample = {
    at: Date;
    traffic: number; // visitors per minute
    ordersPerMin: number;
    pageLoadMs: number;
    inventoryLagMs: number;
    dbQueryMs: number;
};

export type FlashSalePhase = "baseline" | "surge" | "strain" | "critical" | "recovery";

export type FlashSaleTimeline = {
    phase: FlashSalePhase;
    minutes: number[];
    traffic: number;
    ordersPerMin: number;
    pageLoadMs: number;
    inventoryLagMs: number;
    dbQueryMs: number;
};

// 40-minute flash sale timeline with 5 distinct phases
export const FLASH_SALE_TIMELINE: FlashSaleTimeline[] = [
    {
        phase: "baseline",
        minutes: [0, 1, 2, 3, 4],
        traffic: 1000,
        ordersPerMin: 40,
        pageLoadMs: 800,
        inventoryLagMs: 100,
        dbQueryMs: 120,
    },
    {
        phase: "surge",
        minutes: [5, 6, 7, 8],
        traffic: 5000,
        ordersPerMin: 180,
        pageLoadMs: 1800,
        inventoryLagMs: 250,
        dbQueryMs: 280,
    },
    {
        phase: "strain",
        minutes: [9, 10, 11, 12],
        traffic: 5500,
        ordersPerMin: 160,
        pageLoadMs: 3200,
        inventoryLagMs: 450,
        dbQueryMs: 850,
    },
    {
        phase: "critical",
        minutes: [13, 14, 15, 16, 17, 18, 19, 20],
        traffic: 6000,
        ordersPerMin: 120,
        pageLoadMs: 4500,
        inventoryLagMs: 600,
        dbQueryMs: 1200,
    },
    {
        phase: "recovery",
        minutes: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
        traffic: 1500,
        ordersPerMin: 50,
        pageLoadMs: 1100,
        inventoryLagMs: 150,
        dbQueryMs: 180,
    },
];

export function getFlashSaleMetricsForMinute(minute: number): FlashSaleMetricSample {
    const timeline = FLASH_SALE_TIMELINE.find(t => t.minutes.includes(minute));
    if (!timeline) {
        // Default to recovery phase for any minutes beyond 40
        const recovery = FLASH_SALE_TIMELINE.find(t => t.phase === "recovery")!;
        return {
            at: new Date(),
            traffic: recovery.traffic,
            ordersPerMin: recovery.ordersPerMin,
            pageLoadMs: recovery.pageLoadMs,
            inventoryLagMs: recovery.inventoryLagMs,
            dbQueryMs: recovery.dbQueryMs,
        };
    }

    return {
        at: new Date(),
        traffic: timeline.traffic,
        ordersPerMin: timeline.ordersPerMin,
        pageLoadMs: timeline.pageLoadMs,
        inventoryLagMs: timeline.inventoryLagMs,
        dbQueryMs: timeline.dbQueryMs,
    };
}

export class FlashSaleMetricsRepo {
    private map = new Map<string, FlashSaleMetricSample[]>();

    push(endpointId: string, sample: FlashSaleMetricSample) {
        const arr = this.map.get(endpointId) ?? [];
        arr.push(sample);
        this.map.set(endpointId, arr);
    }

    latest(endpointId: string): FlashSaleMetricSample | undefined {
        const arr = this.map.get(endpointId) ?? [];
        return arr[arr.length - 1];
    }

    all(endpointId: string): FlashSaleMetricSample[] {
        return this.map.get(endpointId) ?? [];
    }

    /**
     * Count consecutive minutes where traffic exceeded threshold
     */
    consecutiveHighTraffic(endpointId: string, threshold: number): number {
        const arr = (this.map.get(endpointId) ?? []).slice().reverse();
        let count = 0;
        for (const s of arr) {
            if (s.traffic >= threshold) count++;
            else break;
        }
        return count;
    }

    /**
     * Count consecutive minutes where orders per minute fell below threshold
     */
    consecutiveSlowOrders(endpointId: string, threshold: number): number {
        const arr = (this.map.get(endpointId) ?? []).slice().reverse();
        let count = 0;
        for (const s of arr) {
            if (s.ordersPerMin < threshold) count++;
            else break;
        }
        return count;
    }

    /**
     * Average page load time over last N minutes
     */
    averagePageLoadLast(endpointId: string, n: number): number {
        const arr = this.map.get(endpointId) ?? [];
        const recent = arr.slice(-n);
        if (recent.length === 0) return 0;
        const sum = recent.reduce((acc, s) => acc + s.pageLoadMs, 0);
        return sum / recent.length;
    }

    /**
     * Check if inventory lag exceeds threshold in latest sample
     */
    isInventoryLagging(endpointId: string, thresholdMs: number): boolean {
        const latest = this.latest(endpointId);
        return latest ? latest.inventoryLagMs >= thresholdMs : false;
    }

    /**
     * Check if database queries are slow in latest sample
     */
    isDatabaseSlow(endpointId: string, thresholdMs: number): boolean {
        const latest = this.latest(endpointId);
        return latest ? latest.dbQueryMs >= thresholdMs : false;
    }
}

export type ScenarioSnapshot = {
    minute: number;
    timestamp: Date;
    cpu: number;
    nextCpuAt: Date;
    discordPaused: boolean;
};

/* =========================
   Endpoint-bound tool bag
   (object-shaped, SDK-compatible)
   ========================= */
function makeToolsForEndpoint(
    endpointId: string,
    deps: { jobs: InMemoryJobsRepo; now: () => Date },
): Record<string, Tool<unknown, unknown>> {
    const tools = {
        propose_interval: {
            description: "Suggest a temporary interval",
            async execute(p: { intervalMs: number; ttlMinutes?: number; reason?: string }) {
                const nowMs = deps.now().getTime();
                const next = new Date(nowMs + p.intervalMs);

                await deps.jobs.writeAIHint(endpointId, {
                    intervalMs: p.intervalMs,
                    nextRunAt: undefined,
                    expiresAt: new Date(nowMs + (p.ttlMinutes ?? 60) * 60_000),
                    reason: p.reason,
                });

                // Immediate reschedule so scheduler can pick it up
                await deps.jobs.setNextRunAtIfEarlier(endpointId, next);
                // console.log(`[tool] propose_interval ${endpointId} -> ${next.toISOString()}`);
                return { ok: true as const };
            },
        },
        propose_next_time: {
            description: "Schedule a one-off next run time",
            async execute(p: { nextRunInMs?: number; nextRunAtIso?: string; ttlMinutes?: number; reason?: string }) {
                const nowMs = deps.now().getTime();
                const ts = p.nextRunAtIso ? new Date(p.nextRunAtIso) : new Date(nowMs + (p.nextRunInMs ?? 0));

                await deps.jobs.writeAIHint(endpointId, {
                    nextRunAt: ts,
                    intervalMs: undefined,
                    expiresAt: new Date(nowMs + (p.ttlMinutes ?? 30) * 60_000),
                    reason: p.reason,
                });

                await deps.jobs.setNextRunAtIfEarlier(endpointId, ts);
                // console.log(`[tool] propose_next_time ${endpointId} -> ${ts.toISOString()}`);
                return { ok: true as const, nextRunAtIso: ts.toISOString() };
            },
        },
        pause_until: {
            description: "Pause/unpause this endpoint",
            async execute(p: { untilIso: string | null; reason?: string }) {
                await deps.jobs.setPausedUntil(endpointId, p.untilIso ? new Date(p.untilIso) : null);
                // If unpausing, make it runnable soon
                if (p.untilIso === null) {
                    const soon = new Date(deps.now().getTime() + 5_000);
                    await deps.jobs.setNextRunAtIfEarlier(endpointId, soon);
                }
                // console.log(`[tool] pause_until ${endpointId} -> ${p.untilIso}`);
                return { ok: true as const };
            },
        },
    };
    // eslint-disable-next-line ts/consistent-type-assertions
    return tools as Record<string, Tool<unknown, unknown>>;
}

/* =========================
   Planning helpers (sim-only)
   ========================= */

// Effective interval the governor will honor *right now*
function effectiveIntervalMs(ep: {
    aiHintIntervalMs?: number;
    aiHintExpiresAt?: Date;
    baselineIntervalMs?: number;
}, now: Date): number {
    const fresh = ep.aiHintExpiresAt && ep.aiHintExpiresAt > now;
    if (fresh && ep.aiHintIntervalMs)
        return ep.aiHintIntervalMs;
    return ep.baselineIntervalMs ?? 300_000;
}

async function maybeProposeInterval(
    tools: ReturnType<typeof makeToolsForEndpoint>,
    ep: { aiHintIntervalMs?: number; aiHintExpiresAt?: Date; baselineIntervalMs?: number },
    targetMs: number,
    now: Date,
    reason: string,
) {
    const current = effectiveIntervalMs(ep, now);
    if (current !== targetMs) {
        await callTool(tools, "propose_interval", { intervalMs: targetMs, ttlMinutes: 60, reason });
    }
}

function consecutiveLowMinutes(samples: MetricSample[], threshold = 65): number {
    let mins = 0;
    for (let i = samples.length - 1; i >= 0; i--) {
        if (samples[i].cpu < threshold)
            mins++;
        else break;
    }
    return mins;
}

/* =========================
   Scenario: System Resources (CPU + Discord)
   ========================= */
export async function scenario_system_resources() {
    const clock = new FakeClock("2025-01-01T00:00:00Z");

    const jobs = new InMemoryJobsRepo(() => clock.now()); // uses fake clock
    const runs = new InMemoryRunsRepo();
    const metrics = new InMemoryMetricsRepo();
    const cron: Cron = {
        next() {
            throw new Error("Cron expressions are not supported in this simulation; use baselineIntervalMs.");
        },
    };

    const cpuEndpointId = "cpu_check#hostA";
    const discordEndpointId = "discord_notify#hostA";

    // Seed CPU endpoint (baseline: 5m, min: 20s, max: 15m)
    jobs.add({
        id: cpuEndpointId,
        jobId: "job#hostA",
        tenantId: "tenant#1",
        name: "cpu_check hostA",
        baselineIntervalMs: 5 * 60_000,
        minIntervalMs: 20_000,
        maxIntervalMs: 15 * 60_000,
        nextRunAt: clock.now(),
        failureCount: 0,
    });

    // Seed Discord endpoint "off" by long pause
    jobs.add({
        id: discordEndpointId,
        jobId: "job#hostA",
        tenantId: "tenant#1",
        name: "discord_notify hostA",
        baselineIntervalMs: 60 * 60_000, // effectively off unless unpaused
        minIntervalMs: 10_000,
        pausedUntil: new Date("2099-01-01T00:00:00Z"),
        nextRunAt: new Date(clock.now().getTime() + 60 * 60_000),
        failureCount: 0,
    });

    // CPU timeline: 0–4m normal (40%), 5–19m high (90%), 20–39m recover (50%)
    const cpuTimeline: number[] = [
        ...Array.from({ length: 5 }, () => 40),
        ...Array.from({ length: 15 }, () => 90),
        ...Array.from({ length: 20 }, () => 50),
    ];

    // Sim-only: Discord cooldown state
    // Dispatcher: CPU endpoint records a metric when it runs
    const dispatcher = new FakeDispatcher((ep) => {
        if (ep.id === cpuEndpointId) {
            // Minute index ~ current timeline position (approx via wall clock delta from start)
            // In this sim we append one metric per CPU run; that’s enough to drive planning.
            const elapsedMin
                = Math.floor((clock.now().getTime() - new Date("2025-01-01T00:00:00Z").getTime()) / 60_000);
            const idx = Math.min(elapsedMin, cpuTimeline.length - 1);
            const cpu = cpuTimeline[idx] ?? 40;
            metrics.push(cpuEndpointId, { at: clock.now(), cpu, mem: 60, disk: 40 });
        }
        // Discord "runs" just succeed (pretend we posted)
        return { status: "success", durationMs: 200 };
    });

    const scheduler = new Scheduler({ clock, jobs, runs, dispatcher, cron });

    const snapshots: ScenarioSnapshot[] = [];

    const planCpu = async (now: Date) => {
        const latest = metrics.latest(cpuEndpointId);
        const highForMins = metrics.consecutiveHighMinutes(cpuEndpointId, 80);
        const lowForMins = consecutiveLowMinutes(metrics.all(cpuEndpointId), 65);

        const cpuEp = await jobs.getEndpoint(cpuEndpointId);
        const cpuTools = makeToolsForEndpoint(cpuEndpointId, { jobs, now: () => clock.now() });

        if (latest && latest.cpu >= 80) {
            await maybeProposeInterval(cpuTools, cpuEp, 30_000, now, `High CPU ${latest.cpu}%`);
            if (highForMins === 1) {
                await callTool(cpuTools, "propose_next_time", {
                    nextRunInMs: 5_000,
                    ttlMinutes: 10,
                    reason: "Spike start",
                });
            }
            return { latest, highForMins, lowForMins };
        }

        if (latest && lowForMins >= 5) {
            await maybeProposeInterval(cpuTools, cpuEp, 180_000, now, "Recovered < 65% (5m)");
        }

        return { latest, highForMins, lowForMins };
    };

    // Sim-only: track cooldown so Discord alerts do not chatter
    const discordState: { cooldownUntil: Date | undefined } = { cooldownUntil: undefined };

    const planDiscord = async (now: Date, summary: { latest?: MetricSample | undefined; highForMins: number; lowForMins: number }) => {
        const { latest, highForMins } = summary;
        const discTools = makeToolsForEndpoint(discordEndpointId, { jobs, now: () => clock.now() });
        const discEp = await jobs.getEndpoint(discordEndpointId);

        const onCooldown = discordState.cooldownUntil && discordState.cooldownUntil > now;
        const isPaused = !!(discEp.pausedUntil && discEp.pausedUntil > now);

        if (!onCooldown && latest && latest.cpu >= 80 && isPaused) {
            await callTool(discTools, "pause_until", { untilIso: null, reason: "Unpause for alert" });
            await callTool(discTools, "propose_next_time", {
                nextRunInMs: 5_000,
                ttlMinutes: 2,
                reason: highForMins >= 5 ? "High CPU sustained" : "High CPU start",
            });

            const rePauseAt = new Date(now.getTime() + 15_000);
            await callTool(discTools, "pause_until", {
                untilIso: rePauseAt.toISOString(),
                reason: "Post-alert short pause window",
            });

            discordState.cooldownUntil = new Date(now.getTime() + 10 * 60_000);
            return;
        }

        if (latest && latest.cpu < 65 && isPaused === false) {
            await callTool(discTools, "pause_until", {
                untilIso: new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
                reason: "Recovered",
            });
            discordState.cooldownUntil = undefined;
        }
    };

    for (let minute = 0; minute < 40; minute++) {
        // 1) MEASURE once for this minute (collects a fresh CPU metric if due)
        await scheduler.tick(50, 10_000);

        // 2) PLAN (CPU + Discord) based on latest metrics
        const now = clock.now();
        const cpuSummary = await planCpu(now);
        await planDiscord(now, cpuSummary);

        // 3) DRAIN: run everything due right now (no time advance)
        while (true) {
            const due = await jobs.claimDueEndpoints(50, 10_000);
            if (due.length === 0)
                break;
            for (const _id of due) {
                await scheduler.tick(50, 10_000);
            }
        }

        // Then advance inside the minute in small steps so 30s cadences can fire
        const minuteEnd = new Date(clock.now().getTime() + 60_000);
        while (clock.now() < minuteEnd) {
            await clock.sleep(5_000);
            await scheduler.tick(50, 10_000);
        }

        // 4) Snapshot (ISO for clarity)
        const cpuEpSnap = await jobs.getEndpoint(cpuEndpointId);
        const discEpSnap = await jobs.getEndpoint(discordEndpointId);
        const latest = metrics.latest(cpuEndpointId);
        const snapshotTimestamp = new Date(clock.now().getTime());

        snapshots.push({
            minute,
            timestamp: snapshotTimestamp,
            cpu: latest?.cpu ?? 0,
            nextCpuAt: new Date(cpuEpSnap.nextRunAt.getTime()),
            discordPaused: !!discEpSnap.pausedUntil,
        });
    }

    return { runs, jobs, metrics, snapshots };
}

/* =========================
   Flash Sale Scenario Planning Helpers
   ========================= */

async function planTrafficMonitor(
    endpointId: string,
    metrics: FlashSaleMetricsRepo,
    jobs: InMemoryJobsRepo,
    now: Date,
) {
    const latest = metrics.latest(endpointId);
    if (!latest) return;

    const tools = makeToolsForEndpoint(endpointId, { jobs, now: () => now });
    const ep = await jobs.getEndpoint(endpointId);

    // Baseline: 1 minute checks
    // Surge (traffic >= 4000): tighten to 30s
    // Critical (traffic >= 6000): tighten to 20s
    // Recovery (traffic < 2000): widen back to 1m

    if (latest.traffic >= 6000) {
        await maybeProposeInterval(tools, ep, 20_000, now, "Critical traffic load");
    } else if (latest.traffic >= 4000) {
        await maybeProposeInterval(tools, ep, 30_000, now, "Surge traffic detected");
    } else if (latest.traffic < 2000) {
        await maybeProposeInterval(tools, ep, 60_000, now, "Traffic normalized");
    }
}

async function planOrderProcessorHealth(
    endpointId: string,
    metrics: FlashSaleMetricsRepo,
    jobs: InMemoryJobsRepo,
    now: Date,
) {
    const latest = metrics.latest(endpointId);
    if (!latest) return;

    const tools = makeToolsForEndpoint(endpointId, { jobs, now: () => now });
    const ep = await jobs.getEndpoint(endpointId);

    // Baseline: 2 minute checks
    // During critical (orders < 130): widen to 5m (system is overwhelmed, don't add load)
    // During recovery (orders > 130): return to 2m

    if (latest.ordersPerMin < 130) {
        await maybeProposeInterval(tools, ep, 5 * 60_000, now, "Order processing strained, reducing check frequency");
    } else if (latest.ordersPerMin >= 130 && effectiveIntervalMs(ep, now) > 2 * 60_000) {
        await maybeProposeInterval(tools, ep, 2 * 60_000, now, "Order processing recovered");
    }
}

async function planInventorySyncCheck(
    endpointId: string,
    metrics: FlashSaleMetricsRepo,
    jobs: InMemoryJobsRepo,
    now: Date,
) {
    const latest = metrics.latest(endpointId);
    if (!latest) return;

    const tools = makeToolsForEndpoint(endpointId, { jobs, now: () => now });
    const ep = await jobs.getEndpoint(endpointId);

    // Baseline: 3 minute checks
    // Lagging (lag >= 400ms): tighten to 1m
    // Severe lag (lag >= 600ms): tighten to 30s
    // Normal (lag < 200ms): return to 3m

    if (latest.inventoryLagMs >= 600) {
        await maybeProposeInterval(tools, ep, 30_000, now, "Severe inventory lag detected");
    } else if (latest.inventoryLagMs >= 400) {
        await maybeProposeInterval(tools, ep, 60_000, now, "Inventory lag increasing");
    } else if (latest.inventoryLagMs < 200) {
        await maybeProposeInterval(tools, ep, 3 * 60_000, now, "Inventory sync healthy");
    }
}

/* =========================
   Scenario: Flash Sale (E-Commerce)
   ========================= */
export async function scenario_flash_sale() {
    const clock = new FakeClock("2025-01-01T00:00:00Z");

    const jobs = new InMemoryJobsRepo(() => clock.now());
    const runs = new InMemoryRunsRepo();
    const metrics = new FlashSaleMetricsRepo();
    const cron: Cron = {
        next() {
            throw new Error("Cron expressions are not supported in this simulation; use baselineIntervalMs.");
        },
    };

    // Health Tier endpoint IDs
    const trafficMonitorId = "traffic_monitor#prod";
    const orderProcessorId = "order_processor_health#prod";
    const inventorySyncId = "inventory_sync_check#prod";

    // Seed Health Tier endpoints
    jobs.add({
        id: trafficMonitorId,
        jobId: "job#flash-sale",
        tenantId: "tenant#ecommerce",
        name: "Traffic Monitor",
        baselineIntervalMs: 60_000, // 1 minute baseline
        minIntervalMs: 20_000,
        maxIntervalMs: 5 * 60_000,
        nextRunAt: clock.now(),
        failureCount: 0,
    });

    jobs.add({
        id: orderProcessorId,
        jobId: "job#flash-sale",
        tenantId: "tenant#ecommerce",
        name: "Order Processor Health",
        baselineIntervalMs: 2 * 60_000, // 2 minutes baseline
        minIntervalMs: 60_000,
        maxIntervalMs: 5 * 60_000,
        nextRunAt: clock.now(),
        failureCount: 0,
    });

    jobs.add({
        id: inventorySyncId,
        jobId: "job#flash-sale",
        tenantId: "tenant#ecommerce",
        name: "Inventory Sync Check",
        baselineIntervalMs: 3 * 60_000, // 3 minutes baseline
        minIntervalMs: 30_000,
        maxIntervalMs: 10 * 60_000,
        nextRunAt: clock.now(),
        failureCount: 0,
    });

    // Dispatcher: Each health check records flash sale metrics
    const dispatcher = new FakeDispatcher((ep) => {
        const elapsedMin = Math.floor(
            (clock.now().getTime() - new Date("2025-01-01T00:00:00Z").getTime()) / 60_000,
        );

        const sample = getFlashSaleMetricsForMinute(elapsedMin);
        metrics.push(ep.id, { ...sample, at: clock.now() });

        return { status: "success", durationMs: 150 };
    });

    const scheduler = new Scheduler({ clock, jobs, runs, dispatcher, cron });

    const snapshots: ScenarioSnapshot[] = [];

    // Planning orchestration for Health Tier
    const planHealthTier = async (now: Date) => {
        await planTrafficMonitor(trafficMonitorId, metrics, jobs, now);
        await planOrderProcessorHealth(orderProcessorId, metrics, jobs, now);
        await planInventorySyncCheck(inventorySyncId, metrics, jobs, now);
    };

    for (let minute = 0; minute < 40; minute++) {
        // 1) MEASURE: run scheduler tick to process any due endpoints
        await scheduler.tick(50, 10_000);

        // 2) PLAN: Health Tier adjusts based on latest metrics
        const now = clock.now();
        await planHealthTier(now);

        // 3) DRAIN: execute everything that became due during planning
        while (true) {
            const due = await jobs.claimDueEndpoints(50, 10_000);
            if (due.length === 0) break;
            for (const _id of due) {
                await scheduler.tick(50, 10_000);
            }
        }

        // Advance time in 5s increments within the minute to allow sub-minute cadences
        const minuteEnd = new Date(clock.now().getTime() + 60_000);
        while (clock.now() < minuteEnd) {
            await clock.sleep(5_000);
            await scheduler.tick(50, 10_000);
        }

        // 4) SNAPSHOT: Capture state for this minute
        const latest = metrics.latest(trafficMonitorId);
        const trafficEp = await jobs.getEndpoint(trafficMonitorId);

        snapshots.push({
            minute,
            timestamp: new Date(clock.now().getTime()),
            cpu: latest?.traffic ?? 0, // Temporarily using cpu field for traffic
            nextCpuAt: new Date(trafficEp.nextRunAt.getTime()),
            discordPaused: false, // Not applicable for flash sale
        });
    }

    return { runs, jobs, metrics, snapshots };
}
