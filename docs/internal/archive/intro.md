---
sidebar_position: 1
---

# Welcome to Cronicorn

**Cronicorn** is an AI-powered adaptive scheduler designed for modern applications that need intelligent, dynamic task scheduling.

## What is Cronicorn?

Cronicorn is a sophisticated scheduling system that combines traditional cron-like scheduling with AI-driven adaptability. It learns from your application's behavior and adjusts scheduling patterns to optimize performance, reduce costs, and improve reliability.

## Key Features

- 🤖 **AI-Powered Scheduling** - Automatically adjusts task intervals based on performance metrics
- ⚡ **Real-time Adaptation** - Dynamic scheduling that responds to your application's needs
- 🎯 **Smart Rate Limiting** - Respects configured min/max intervals and quotas
- 📊 **Comprehensive Monitoring** - Built-in observability with detailed run history
- 🔒 **Tenant Isolation** - Multi-tenant support with proper data isolation
- 🛡️ **Fault Tolerance** - Graceful handling of failures with configurable backoff

## Quick Start

Get started with Cronicorn in minutes:

```bash
# Clone the repository
git clone https://github.com/weskerllc/cronicorn.git
cd cronicorn

# Install dependencies
pnpm install

# Start local database
pnpm db

# Run migrations
pnpm db:migrate

# Start the development environment
pnpm dev
```

## Architecture

Cronicorn follows a clean, layered architecture:

- **Domain Layer** - Pure business logic and scheduling policies
- **Adapters** - Concrete implementations for storage, AI, and dispatching
- **API** - RESTful API for job and endpoint management
- **Worker** - Background scheduler that executes tasks
- **AI Planner** - Intelligent decision-making for schedule optimization

## Next Steps

- [Installation Guide](./tutorial-basics/create-a-document.md) - Set up Cronicorn in your environment
- [Core Concepts](./tutorial-basics/create-a-page.md) - Understand how Cronicorn works
- [API Reference](./tutorial-extras/manage-docs-versions.md) - Explore the REST API

## Getting Help

- 📖 Browse the [documentation](https://github.com/weskerllc/cronicorn/tree/main/docs)
- 🐛 Report issues on [GitHub](https://github.com/weskerllc/cronicorn/issues)
- 💬 Join our community discussions
