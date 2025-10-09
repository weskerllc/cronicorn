/* eslint-disable no-console */
import { scenario_flash_sale, type FlashSaleSnapshot } from "./scenarios.js";

function formatDuration(ms: number) {
    const clamped = Math.max(0, Math.round(ms));
    const totalSeconds = Math.floor(clamped / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0)
        return `${seconds}s`;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function renderFlashSaleSnapshots(label: string, snapshots: FlashSaleSnapshot[]) {
    if (snapshots.length === 0)
        return;
    console.log(`\n${label}`);
    console.table(snapshots.map(s => ({
        minute: `${s.minute}m`,
        traffic: `${s.traffic}/min`,
        orders: `${s.ordersPerMin}/min`,
        pageLoad: `${s.pageLoadMs}ms`,
        invLag: `${s.inventoryLagMs}ms`,
        dbQuery: `${s.dbQueryMs}ms`,
        nextCheck: formatDuration(s.nextTrafficCheckAt.getTime() - s.timestamp.getTime()),
    })));
}

(async () => {
    const { runs, flashSaleSnapshots } = await scenario_flash_sale();
    const trafficRuns = runs.runs.filter(r => r.endpointId.startsWith("traffic_monitor")).length;
    const orderRuns = runs.runs.filter(r => r.endpointId.startsWith("order_processor")).length;
    const inventoryRuns = runs.runs.filter(r => r.endpointId.startsWith("inventory_sync")).length;
    const slowPageRuns = runs.runs.filter(r => r.endpointId.startsWith("slow_page_analyzer")).length;
    const dbTraceRuns = runs.runs.filter(r => r.endpointId.startsWith("database_query_trace")).length;
    const cacheWarmupRuns = runs.runs.filter(r => r.endpointId.startsWith("cache_warm_up")).length;
    const scaleCheckoutRuns = runs.runs.filter(r => r.endpointId.startsWith("scale_checkout_workers")).length;
    const slackOpsRuns = runs.runs.filter(r => r.endpointId.startsWith("slack_operations")).length;
    const slackSupportRuns = runs.runs.filter(r => r.endpointId.startsWith("slack_customer_support")).length;
    const oncallPageRuns = runs.runs.filter(r => r.endpointId.startsWith("emergency_oncall_page")).length;

    const nextInDurations = flashSaleSnapshots.map(s => Math.max(0, s.nextTrafficCheckAt.getTime() - s.timestamp.getTime()));
    const minNextIn = Math.min(...nextInDurations);
    const widenedLater = flashSaleSnapshots.some((snapshot, idx) => idx >= 21 && (snapshot.nextTrafficCheckAt.getTime() - snapshot.timestamp.getTime()) >= 50_000);

    // Basic assertions for Health Tier
    if (trafficRuns < 50)
        throw new Error(`Expected traffic monitor to run frequently (saw ${trafficRuns})`);
    if (minNextIn > 60_000)
        throw new Error(`Expected at least one sub-minute cadence (closest was ${formatDuration(minNextIn)})`);
    if (!widenedLater)
        throw new Error("Expected cadence to widen during recovery phase");

    console.log("Assertions passed ✔️");
    console.log(`Total runs: ${runs.runs.length}`);
    console.log(`Health Tier: Traffic=${trafficRuns}, Orders=${orderRuns}, Inventory=${inventoryRuns}`);
    console.log(`Investigation Tier: SlowPage=${slowPageRuns}, DBTrace=${dbTraceRuns}`);
    console.log(`Recovery Tier: CacheWarmup=${cacheWarmupRuns}, ScaleCheckout=${scaleCheckoutRuns}`);
    console.log(`Alert Tier: SlackOps=${slackOpsRuns}, SlackSupport=${slackSupportRuns}, OncallPage=${oncallPageRuns}`);

    renderFlashSaleSnapshots("Baseline (0-4m)", flashSaleSnapshots.slice(0, 5));
    renderFlashSaleSnapshots("Surge (5-8m)", flashSaleSnapshots.slice(5, 9));
    renderFlashSaleSnapshots("Strain (9-12m)", flashSaleSnapshots.slice(9, 13));
    renderFlashSaleSnapshots("Critical (13-20m)", flashSaleSnapshots.slice(13, 21));
    renderFlashSaleSnapshots("Recovery (21-25m)", flashSaleSnapshots.slice(21, 26));

    const summaryRow = {
        minNextIn: formatDuration(minNextIn),
        recoveryWidened: widenedLater ? "yes" : "no",
        snapshotsCaptured: flashSaleSnapshots.length,
    };
    console.log("\nScenario summary");
    console.table([summaryRow]);
})();
