# Cronicorn Documentation

This directory contains the Docusaurus-based documentation site for Cronicorn.

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

From the root of the monorepo:

```bash
pnpm install
```

## Local Development

```bash
pnpm -F @cronicorn/docs start
```

Or from this directory:

```bash
pnpm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
pnpm build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Serve

```bash
pnpm serve
```

Serve the built site locally for testing.

## Project Structure

```
apps/docs/
├── blog/                       # Blog posts (currently empty - ready for content)
│   ├── authors.yml            # Blog author definitions
│   └── tags.yml               # Blog tag definitions
├── src/                       # Custom React components and pages
│   ├── components/
│   │   └── HomepageFeatures/  # Homepage feature cards
│   ├── css/
│   │   └── custom.css         # Custom styles
│   └── pages/
│       └── index.tsx          # Homepage
├── static/                    # Static assets (images, etc.)
├── docusaurus.config.ts       # Main configuration file
├── sidebars.ts               # Documentation sidebar configuration
└── package.json              # Dependencies
```

**Note**: The actual documentation markdown files are located at `../../docs/public/` in the monorepo root. This allows the docs to be consumed by both the Docusaurus site and other consumers like the MCP server.

## Content Sources

This docs site integrates with the `@cronicorn/content` package for:
- Brand name and tagline
- Documentation features and descriptions
- URLs and links
- SEO metadata

All branding and content should be updated in `packages/content/` to maintain consistency across the web app and docs site.

## Learn More

- [Docusaurus Documentation](https://docusaurus.io/)
- [Cronicorn Main Repository](https://github.com/weskerllc/cronicorn)
