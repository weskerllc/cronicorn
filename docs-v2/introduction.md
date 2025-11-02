---
id: introduction
title: Introduction to Cronicorn
description: Overview of Cronicorn's AI-powered adaptive scheduling system
tags:
  - user
  - assistant
  - essential
sidebar_position: 1
mcp:
  uri: file:///docs/introduction.md
  mimeType: text/markdown
  priority: 0.9
  lastModified: 2025-11-02T00:00:00Z
---

# Introduction to Cronicorn

**Cronicorn** is an AI-powered adaptive scheduler designed for modern applications that need intelligent, dynamic task scheduling.

## What is Cronicorn?

Cronicorn combines traditional cron-like scheduling with AI-driven adaptability. Unlike static schedulers that run tasks at fixed intervals, Cronicorn learns from your application's behavior and dynamically adjusts scheduling patterns to optimize performance, reduce costs, and improve reliability.

## Why Cronicorn?

### The Problem with Traditional Schedulers

Traditional cron schedulers have several limitations:

- **Static intervals**: Tasks run at fixed times regardless of system load or success rates
- **No learning**: Repeated failures don't trigger automatic backoff
- **Resource waste**: Tasks may run too frequently when system is idle
- **No adaptability**: Can't respond to changing application needs in real-time

### The Cronicorn Solution

Cronicorn addresses these issues through:

1. **AI-Powered Adaptation**: Automatically adjusts task intervals based on performance metrics and failure patterns
2. **Dynamic Rate Limiting**: Respects configured min/max intervals while optimizing execution frequency
3. **Intelligent Backoff**: Increases intervals after failures and returns to normal after success
4. **Real-time Responsiveness**: Adapts to system load and application behavior instantly

## Key Features

### 🤖 AI-Driven Scheduling

The AI planner analyzes execution patterns, success rates, and system metrics to suggest optimal scheduling intervals. It can:

- Increase frequency during high-demand periods
- Back off during repeated failures
- Optimize intervals based on historical performance
- Respect configured constraints (min/max intervals, quotas)

### ⚡ Real-time Adaptation

Scheduling changes take effect immediately through:

- **AI Hints**: Temporary interval adjustments with configurable TTL
- **One-shot Scheduling**: Schedule immediate or delayed single runs
- **Dynamic Pausing**: Temporarily halt endpoints for maintenance

### 🎯 Smart Rate Limiting

Built-in protections ensure safe operation:

- Minimum interval constraints prevent over-execution
- Maximum interval constraints ensure timely execution
- Quota management limits AI and endpoint execution costs
- Tenant-level isolation for multi-tenant deployments

### 📊 Comprehensive Observability

Full visibility into scheduling behavior:

- Detailed run history with execution metrics
- Success/failure tracking with error messages
- Scheduling source tracking (baseline, AI interval, AI one-shot, etc.)
- Performance analytics and trend analysis

### 🛡️ Production-Ready Architecture

Designed for reliability and scale:

- Clean layered architecture (Domain → Ports → Adapters)
- Request-scoped transactions for data consistency
- Distributed worker support with lease-based claiming
- Multi-tenant isolation with proper data boundaries
- Graceful degradation and fault tolerance

## Use Cases

### API Rate Limit Optimization

Automatically adjust polling intervals to stay just under API rate limits while maximizing data freshness.

### Database Maintenance

Run cleanup tasks more frequently during high-activity periods and less frequently when idle.

### Monitoring & Health Checks

Increase check frequency after failures and return to normal intervals after recovery.

### Data Synchronization

Adapt sync frequency based on data change rates and system load.

### Batch Processing

Optimize batch job execution based on queue depth and processing times.

## Architecture Overview

Cronicorn follows a clean, hexagonal architecture:

```
┌─────────────────────────┐
│   Composition Roots     │  (API, Worker, Sim)
│  (Wire dependencies)    │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│      Domain Layer       │  (Pure business logic)
│  Governor, Scheduler,   │
│  Policies               │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│        Ports            │  (Interfaces)
│  Clock, Cron, Repos,    │
│  Dispatcher, Quota      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│       Adapters          │  (Concrete implementations)
│  DB, HTTP, AI, Logging  │
└─────────────────────────┘
```

### Key Components

- **Domain**: Pure scheduling logic and policies
- **Ports**: Interface contracts for external dependencies
- **Adapters**: Concrete implementations (PostgreSQL, HTTP, AI SDKs)
- **API**: RESTful endpoints for job/endpoint management
- **Worker**: Background scheduler that executes tasks
- **AI Planner**: Intelligent decision-making service

## Getting Started

Ready to try Cronicorn? Check out the [Quick Start Guide](./quick-start.md) to get up and running in minutes.

## Next Steps

- **[Core Concepts](./core-concepts.md)** - Understand key terminology
- **[Quick Start](./quick-start.md)** - Get started in 5 minutes
