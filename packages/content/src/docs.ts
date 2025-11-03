/**
 * Documentation site content
 * Features and descriptions for the Docusaurus docs site
 */

export type DocsFeature = {
    title: string;
    description: string;
};

/** Homepage features for documentation site */
export const docsFeatures: DocsFeature[] = [
    {
        title: "AI-Powered Intelligence",
        description: "Cronicorn uses AI to automatically adjust task scheduling based on performance metrics, failure patterns, and system load. Get smarter scheduling without manual intervention.",
    },
    {
        title: "Real-time Adaptation",
        description: "Dynamic scheduling that responds to your application's needs in real-time. Automatically scales up during high demand and backs off during failures, respecting your configured constraints.",
    },
    {
        title: "Built for Production",
        description: "Multi-tenant support, comprehensive monitoring, fault tolerance, and distributed execution. Cronicorn is designed for production workloads with clean architecture and extensive observability.",
    },
] as const;

/** Tagline specifically for docs site */
export const docsTagline = "AI-powered adaptive scheduler for modern applications";

/** Page title for docs homepage */
export const docsPageTitle = "AI-Powered Adaptive Scheduler";

/** Meta description for docs site */
export const docsMetaDescription = "Cronicorn is an AI-powered adaptive scheduler for modern applications that need intelligent, dynamic task scheduling.";
