import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";

import { brand, logo, urls } from "@cronicorn/content";
import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: brand.name,
  tagline: brand.title,
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: urls.website,
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  organizationName: urls.github.org,
  projectName: urls.github.repoName,

  onBrokenLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  // Head tags for SEO and structured data
  headTags: [
    // Preconnect to external resources for performance
    {
      tagName: "link",
      attributes: {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    },
    // JSON-LD structured data for rich search results
    {
      tagName: "script",
      attributes: {
        type: "application/ld+json",
      },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "SoftwareApplication",
        "name": brand.name,
        "applicationCategory": "DeveloperApplication",
        "description": brand.description,
        "url": urls.website,
        "operatingSystem": "Cross-platform",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
        "author": {
          "@type": "Organization",
          "name": brand.name,
          "url": urls.website,
        },
        "sameAs": [urls.github.repo],
      }),
    },
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          path: "../../docs/public",
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/", // Serve docs at the root instead of /docs
          editUrl: `${urls.github.repo}/tree/main/docs/public`,
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: false, // Blog disabled - placeholder content removed
        pages: false, // Custom pages disabled - docs only
        theme: {
          customCss: "./src/css/custom.css",
        },
        sitemap: {
          changefreq: "weekly",
          priority: 0.5,
          ignorePatterns: ["/tags/**"],
          filename: "sitemap.xml",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    // AI-optimized documentation plugin - generates llms.txt and markdown versions
    [
      "@signalwire/docusaurus-plugin-llms-txt",
      {
        // Customize site metadata for llms.txt
        siteTitle: brand.name,
        siteDescription: `${brand.title} - ${brand.description}`,

        // Use depth 2 for better organization (e.g., /developers/quick-start)
        depth: 2,

        // Prioritize important sections first
        includeOrder: [
          "/quick-start", // Getting started first
          "/core-concepts", // Core concepts second
          "/use-cases", // Use cases third
          "/mcp-server", // MCP integration
          "/developers/**", // Developer docs
          "/technical/**", // Technical details
        ],

        // Content filtering
        content: {
          excludeRoutes: [
            "/tags", // Exclude main tags page
            "/tags/*", // Exclude individual tag pages (too noisy)
          ],
        },
      },
    ],
  ],

  // Temporarily disabled theme due to React 19 peer dependency issues
  // themes: [
  //   // Theme for llms.txt copy-to-clipboard functionality
  //   "@signalwire/docusaurus-theme-llms-txt",
  // ],

  themeConfig: {
    // Enhanced SEO metadata
    image: "img/docusaurus-social-card.jpg",
    metadata: [
      { name: "keywords", content: "cron, scheduling, AI, adaptive, webhooks, HTTP jobs, intelligent scheduling" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
    ],

    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true, // Auto dark mode based on OS preference
    },

    // Announcement bar for important updates
    announcementBar: {
      id: "announcement-bar-alpha",
      content: "🚀 <a target=\"_blank\" href=\"https://github.com/weskerllc/cronicorn\">Star us on GitHub</a> to stay updated!",
      backgroundColor: "#fafbfc",
      textColor: "#091E42",
      isCloseable: true,
    },

    navbar: {
      title: brand.name,
      logo: {
        alt: logo.alt,
        src: "img/logo.svg",
        href: urls.website, // Link logo/title back to main website
        target: "_self",
        // For SVG logos, you can use CSS to invert colors in dark mode
        // Or provide a separate dark mode logo here:
        // srcDark: "img/logo-dark.svg",
        style: {
          // This CSS will invert the logo colors in dark mode
          filter: "var(--docusaurus-logo-filter, none)",
        },
      },
      hideOnScroll: true, // Auto-hide navbar on scroll for cleaner reading
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        {
          type: "dropdown",
          label: "Resources",
          position: "left",
          items: [
            {
              label: "API Reference",
              href: urls.docs.apiReference,
            },
            {
              label: "Architecture",
              to: "/developers/developer-workspace-structure",
            },
            {
              label: "MCP Server",
              to: "/mcp-server",
            },
          ],
        },
        {
          "href": urls.github.repo,
          "label": "GitHub",
          "position": "right",
          "className": "header-github-link",
          "aria-label": "GitHub repository",
        },
      ],
    },

    footer: {
      style: "dark",
      logo: {
        alt: logo.alt,
        src: "img/logo.svg",
        href: urls.website,
        width: 160,
        height: 51,
      },
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Quick Start",
              to: "/quick-start",
            },
            {
              label: "Use Cases",
              to: "/use-cases",
            },
            {
              label: "API Reference",
              href: urls.docs.apiReference,
            },
          ],
        },
        {
          title: "Developers",
          items: [
            {
              label: "Architecture",
              to: "/developers/developer-workspace-structure",
            },
            {
              label: "Contributing",
              href: urls.github.contributing,
            },
            {
              label: "MCP Server",
              to: "/mcp-server",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: urls.github.repo,
            },
            {
              label: "Discussions",
              href: urls.github.discussions,
            },
            {
              label: "Issues",
              href: urls.github.issues,
            },
          ],
        },
        {
          title: "Company",
          items: [
            {
              label: "Contact",
              href: urls.legal.contact,
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ${brand.name}. Built with Docusaurus.`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },

    // Enhanced table of contents
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 5, // Show deeper headings for better navigation
    },

    // Docs-specific settings
    docs: {
      sidebar: {
        hideable: true, // Allow users to hide sidebar for focused reading
        autoCollapseCategories: true, // Auto-collapse sibling categories
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
