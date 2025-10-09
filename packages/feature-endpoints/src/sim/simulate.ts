/* eslint-disable no-console */
import { scenario_flash_sale, type ScenarioSnapshot } from "./scenarios.js";

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
    const { runs, snapshots } = await scenario_flash_sale();
    const trafficRuns = runs.runs.filter(r => r.endpointId.startsWith("traffic_monitor")).length;
    const orderRuns = runs.runs.filter(r => r.endpointId.startsWith("order_processor")).length;
    const inventoryRuns = runs.runs.filter(r => r.endpointId.startsWith("inventory_sync")).length;

    const nextInDurations = snapshots.map(s => Math.max(0, s.nextCpuAt.getTime() - s.timestamp.getTime()));
    const minNextIn = Math.min(...nextInDurations);
    const widenedLater = snapshots.some((snapshot, idx) => idx >= 21 && (snapshot.nextCpuAt.getTime() - snapshot.timestamp.getTime()) >= 50_000);

    // Basic assertions for Health Tier
    if (trafficRuns < 50)
        throw new Error(`Expected traffic monitor to run frequently (saw ${trafficRuns})`);
    if (minNextIn > 60_000)
        throw new Error(`Expected at least one sub-minute cadence (closest was ${formatDuration(minNextIn)})`);
    if (!widenedLater)
        throw new Error("Expected cadence to widen during recovery phase");

    console.log("Assertions passed ✔️");
    console.log(`Total runs: ${runs.runs.length} (Traffic=${trafficRuns}, Orders=${orderRuns}, Inventory=${inventoryRuns})`);

    renderSnapshots("Baseline (0-4m)", snapshots.slice(0, 5));
    renderSnapshots("Surge (5-8m)", snapshots.slice(5, 9));
    renderSnapshots("Strain (9-12m)", snapshots.slice(9, 13));
    renderSnapshots("Critical (13-20m)", snapshots.slice(13, 21));
    renderSnapshots("Recovery (21-25m)", snapshots.slice(21, 26));

    const summaryRow = {
        minNextIn: formatDuration(minNextIn),
        recoveryWidened: widenedLater ? "yes" : "no",
        snapshotsCaptured: snapshots.length,
    };
    console.log("\nScenario summary");
    console.table([summaryRow]);
})();
