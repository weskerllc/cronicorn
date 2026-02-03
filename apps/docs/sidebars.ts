import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 * - create an ordered group of docs
 * - render a sidebar for each doc of that group
 * - provide next/previous navigation
 *
 * The sidebars can be generated from the filesystem, or explicitly defined here.
 *
 * Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Main documentation sidebar - matches docs/public structure
  docsSidebar: [
    "introduction",
    "quick-start",
    "core-concepts",
    "mcp-server",
    "api-reference",
    "use-cases",
    "self-hosting",
    "troubleshooting",
    {
      type: "category",
      label: "Technical Deep Dive",
      items: [
        "technical/system-architecture",
        "technical/how-scheduling-works",
        "technical/how-ai-adaptation-works",
        "technical/configuration-constraints",
        "technical/coordinating-endpoints",
        "technical/technical-reference",
      ],
    },
  ],
};

export default sidebars;
