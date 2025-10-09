/* eslint-disable no-console */
import { scenario_system_resources } from "./scenarios.js";

(async () => {
    const { runs, events } = await scenario_system_resources();
    const cpuRuns = runs.runs.filter(r => (r.endpointId ?? r.endpoint_id)?.toString().startsWith("cpu_check")).length;
    const discordRuns = runs.runs.filter(r => (r.endpointId ?? r.endpoint_id)?.toString().startsWith("discord_notify")).length;

    console.log("Total runs:", runs.runs.length, "CPU runs:", cpuRuns, "Discord runs:", discordRuns);
    console.log(events.slice(0, 6).join("\n"));
    console.log("...");
    console.log(events.slice(-6).join("\n"));
})();
