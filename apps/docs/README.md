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
pnpm -F @cronicorn/docs dev
```

Or from this directory:

```bash
pnpm dev
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

- `docs/` - Documentation markdown files
- `blog/` - Blog posts
- `src/` - Custom React components and pages
- `static/` - Static assets (images, etc.)
- `docusaurus.config.ts` - Main configuration file
- `sidebars.ts` - Documentation sidebar configuration

## Learn More

- [Docusaurus Documentation](https://docusaurus.io/)
- [Cronicorn Main Repository](https://github.com/weskerllc/cronicorn)
