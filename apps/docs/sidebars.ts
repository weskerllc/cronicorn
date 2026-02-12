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
    {
      type: "category",
      label: "Self-Hosting",
      link: {
        type: "generated-index",
        title: "Self-Hosting Documentation",
        description:
          "Deploy and operate Cronicorn on your own infrastructure.",
      },
      items: [
        "self-hosting/self-hosting-index",
        "self-hosting/self-hosting-configuration",
        "self-hosting/self-hosting-reverse-proxy",
        "self-hosting/self-hosting-upgrading",
        "self-hosting/self-hosting-backup-restore",
        "self-hosting/self-hosting-monitoring",
        "self-hosting/self-hosting-troubleshooting",
        "self-hosting/self-hosting-known-limitations",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: [
        "guides/webhook-verification",
      ],
    },
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
