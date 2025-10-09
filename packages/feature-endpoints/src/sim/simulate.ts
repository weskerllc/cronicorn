/* eslint-disable no-console */
import { scenario_system_resources, type ScenarioSnapshot } from "./scenarios.js";

function formatDuration(ms: number) {
    const clamped = Math.max(0, Math.round(ms));
    const totalSeconds = Math.floor(clamped / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0)
        return `${seconds}s`;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function renderSnapshots(label: string, snapshots: ScenarioSnapshot[]) {
    if (snapshots.length === 0)
        return;
    console.log(`\n${label}`);
    console.table(snapshots.map(s => ({
        minute: `${s.minute}m`,
        cpu: `${s.cpu}%`,
        nextIn: formatDuration(s.nextCpuAt.getTime() - s.timestamp.getTime()),
        nextRunAt: s.nextCpuAt.toISOString(),
        discordPaused: s.discordPaused ? "yes" : "no",
    })));
}

(async () => {
    const { runs, snapshots } = await scenario_system_resources();
    const cpuRuns = runs.runs.filter(r => r.endpointId.startsWith("cpu_check")).length;
    const discordRuns = runs.runs.filter(r => r.endpointId.startsWith("discord_notify")).length;

    const nextInDurations = snapshots.map(s => Math.max(0, s.nextCpuAt.getTime() - s.timestamp.getTime()));
    const minNextIn = Math.min(...nextInDurations);
    const widenedLater = snapshots.some((snapshot, idx) => idx >= 20 && (snapshot.nextCpuAt.getTime() - snapshot.timestamp.getTime()) >= 120_000);

    if (cpuRuns < 60)
        throw new Error(`Expected adaptive cadence to increase run count (saw ${cpuRuns})`);
    if (minNextIn > 60_000)
        throw new Error(`Expected at least one sub-minute cadence (closest was ${formatDuration(minNextIn)})`);
    if (!widenedLater)
        throw new Error("Expected recovery cadence to widen after the spike");
    if (discordRuns === 0)
        throw new Error("Expected Discord alert to fire at least once");

    console.log("Assertions passed ✔️");
    console.log(`Total runs: ${runs.runs.length} (CPU=${cpuRuns}, Discord=${discordRuns})`);

    renderSnapshots("Baseline sample (0-4m)", snapshots.slice(0, 5));
    renderSnapshots("Spike sample (5-10m)", snapshots.slice(5, 11));
    renderSnapshots("Recovery sample (30-34m)", snapshots.slice(30, 35));

    const summaryRow = {
        minNextIn: formatDuration(minNextIn),
        recoveryWidened: widenedLater ? "yes" : "no",
        snapshotsCaptured: snapshots.length,
    };
    console.log("\nScenario summary");
    console.table([summaryRow]);
})();
