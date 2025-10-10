# @cronicorn/scheduler

A flexible, AI-powered job scheduler with clean architecture and type-safe tool integration for modern TypeScript applications.

## Purpose

Provides the core scheduling domain logic with pluggable AI integration. Uses hexagonal architecture to keep business logic independent of infrastructure concerns.

## Key Features

- **AI-Powered**: Makes intelligent scheduling decisions using configurable AI clients
- **Clean Architecture**: Clear separation between domain logic and infrastructure
- **Type-Safe Tools**: Full TypeScript support with Zod schema validation and automatic type inference
- **Pluggable Adapters**: Support for different AI providers through adapter pattern
- **Testable**: Comprehensive mocking and testing utilities

## Installation

```bash
pnpm add @cronicorn/scheduler zod
```

## Core Concepts

### Tools

Tools define actions that AI can take. Two formats supported:

- **Function tools**: Simple async functions
- **Object tools**: With metadata, descriptions, and schema validation

### Type-Safe Tool Definition

Use the `tool()` helper for automatic type inference from Zod schemas:

- Define schema with Zod
- Execute function gets properly typed parameters
- Runtime validation included

### Tool Collections

Use `defineTools()` to create strongly-typed tool collections that work with the AI client interface.

## Architecture

Follows hexagonal (ports and adapters) pattern:

```
Application → Ports → Domain Logic → Adapters → Infrastructure
```

### Key Interfaces

- **AIClient**: Interface for AI service integration
- **JobsRepo**: Job storage and retrieval
- **Clock**: Time abstraction for testing
- **Dispatcher**: Job execution interface
- **Tools**: Type-safe tool definitions

## Usage Patterns

1. **Define Tools**: Create type-safe tools with schemas
2. **Implement Ports**: Provide concrete implementations for your infrastructure
3. **Configure AI**: Choose an AI adapter (e.g., Vercel AI SDK)
4. **Run Scheduler**: Let AI make intelligent scheduling decisions

## Tool Validation

Supports both:

- **Zod Schema**: Automatic validation and type inference
- **Custom Validation**: Manual validation functions for complex cases

## Testing

- Mock tools with test frameworks
- Use `callTool()` utility for direct tool testing
- Comprehensive test coverage with type safety

## Integration

Works with any AI provider through adapters:

- **@cronicorn/adapter-ai**: For Vercel AI SDK
- **Custom implementations**: Implement the `AIClient` interface

## Migration

Migrating from JSON Schema to Zod provides:

- Better TypeScript integration
- Automatic type inference
- Runtime validation
- Improved developer experience
