/**
 * Shared endpoint color mapping logic
 * Ensures consistent colors across all dashboard visualizations
 */

import type { ChartConfig } from "@cronicorn/ui-library/components/chart";

export interface EndpointColorMapping {
    /** Original endpoint name (with spaces) */
    name: string;
    /** Sanitized key for CSS variables (no spaces) */
    sanitizedKey: string;
    /** Chart color index (1-5) */
    colorIndex: number;
}

/**
 * Creates consistent color mappings for a list of endpoint names
 * @param endpointNames - Array of endpoint names
 * @returns Array of endpoint color mappings
 */
export function createEndpointColorMappings(
    endpointNames: Array<string>
): Array<EndpointColorMapping> {
    return endpointNames.map((name, index) => ({
        name,
        sanitizedKey: name.replace(/\s+/g, ""),
        colorIndex: (index % 5) + 1,
    }));
}

/**
 * Builds a ChartConfig object from endpoint color mappings
 * @param mappings - Array of endpoint color mappings
 * @returns ChartConfig object for use with ChartContainer
 */
export function buildChartConfigFromMappings(
    mappings: Array<EndpointColorMapping>
): ChartConfig {
    const config: ChartConfig = {};
    for (const mapping of mappings) {
        config[mapping.sanitizedKey] = {
            label: mapping.name,
            color: `var(--chart-${mapping.colorIndex})`,
        };
    }
    return config;
}

/**
 * Gets the sanitized key for a given endpoint name
 * @param endpointName - Original endpoint name
 * @returns Sanitized key for CSS variables
 */
export function getSanitizedKey(endpointName: string): string {
    return endpointName.replace(/\s+/g, "");
}
