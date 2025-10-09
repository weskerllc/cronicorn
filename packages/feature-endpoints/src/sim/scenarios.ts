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
    const discordState: { cooldownUntil: Date | undefined } = { cooldownUntil: undefined };

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

    const events: string[] = [];

    for (let minute = 0; minute < 40; minute++) {
        // 1) MEASURE once for this minute (collects a fresh CPU metric if due)
        await scheduler.tick(50, 10_000);

        // 2) PLAN (CPU + Discord) based on latest metrics
        const now = clock.now();
        const latest = metrics.latest(cpuEndpointId);
        const highForMins = metrics.consecutiveHighMinutes(cpuEndpointId, 80);
        const lowForMins = consecutiveLowMinutes(metrics.all(cpuEndpointId), 65);

        // CPU planning
        const cpuEp = await jobs.getEndpoint(cpuEndpointId);
        const cpuTools = makeToolsForEndpoint(cpuEndpointId, { jobs, now: () => clock.now() });

        if (latest && latest.cpu >= 80) {
            // tighten to 30s if not already
            await maybeProposeInterval(cpuTools, cpuEp, 30_000, now, `High CPU ${latest.cpu}%`);
            // Optional: one-shot when spike first starts
            if (highForMins === 1) {
                await callTool(cpuTools, "propose_next_time", {
                    nextRunInMs: 5_000,
                    ttlMinutes: 10,
                    reason: "Spike start",
                });
            }
        }
        else if (latest && lowForMins >= 5) {
            // recovered for a few minutes -> relax to 3m
            await maybeProposeInterval(cpuTools, cpuEp, 180_000, now, "Recovered < 65% (5m)");
        }

        // Discord planning with cooldown (one-shot window)
        const discTools = makeToolsForEndpoint(discordEndpointId, { jobs, now: () => clock.now() });
        const discEp = await jobs.getEndpoint(discordEndpointId);

        // Only trigger if: high CPU, cooldown expired, and endpoint is currently paused
        const onCooldown = discordState.cooldownUntil && discordState.cooldownUntil > now;
        const isPaused = !!(discEp.pausedUntil && discEp.pausedUntil > now);

        if (!onCooldown && latest && latest.cpu >= 80 && isPaused) {
            // 1) Unpause
            await callTool(discTools, "pause_until", { untilIso: null, reason: "Unpause for alert" });

            // 2) Schedule a single one-shot in 5s
            await callTool(discTools, "propose_next_time", {
                nextRunInMs: 5_000,
                ttlMinutes: 2,
                reason: highForMins >= 5 ? "High CPU sustained" : "High CPU start",
            });

            // 3) Re-pause shortly after the one-shot time to prevent chatter
            const rePauseAt = new Date(now.getTime() + 15_000); // 15s > 5s
            await callTool(discTools, "pause_until", {
                untilIso: rePauseAt.toISOString(),
                reason: "Post-alert short pause window",
            });

            // 4) Start cooldown
            discordState.cooldownUntil = new Date(now.getTime() + 10 * 60_000);
        }
        else if (latest && latest.cpu < 65 && isPaused === false) {
            // Optional: if we detect recovery and it's currently unpaused (rare with short window),
            // push it back to a long pause.
            await callTool(discTools, "pause_until", {
                untilIso: new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
                reason: "Recovered",
            });
            discordState.cooldownUntil = undefined;
        }

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
        const cpuVal = latest?.cpu ?? 0;

        events.push(
            `${minute}m: cpu=${cpuVal}%, next(cpu)=${cpuEpSnap.nextRunAt.toISOString()}, discordPaused=${!!discEpSnap.pausedUntil}`,
        );
    }

    return { runs, jobs, metrics, events };
}
