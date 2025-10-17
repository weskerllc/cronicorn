# Cronicorn Documentation

**Adaptive AI-driven scheduler** with hexagonal architecture and intelligent cadence management.

## Getting Started

- **[Quickstart Guide](./quickstart.md)** - Get running in 5 minutes
- **[Architecture Guide](./architecture.md)** - System design and principles
- **[Authentication](./authentication.md)** - OAuth & API key setup
- **[Use Cases](./use-cases.md)** - Real-world examples and patterns
- **[Contributing](./contributing.md)** - Development workflow

## UI Planning (MVP)

- **[Requirements Summary](./ui-requirements-summary.md)** - Executive overview of minimal UI needed for MVP
- **[Full Requirements](./minimal-ui-requirements.md)** - Detailed feature specifications and user flows
- **[UI Sitemap](./ui-sitemap.md)** - Visual site structure and navigation
- **[Implementation Checklist](./ui-implementation-checklist.md)** - Week-by-week task breakdown

## For Developers

### Understanding the System
1. Start with [Quickstart](./quickstart.md) to get running locally
2. Read [Architecture](./architecture.md) to understand the design
3. Check [ADRs](../.adr/) for key decisions and rationale
4. See [Contributing](./contributing.md) for development workflow

### Making Changes
1. Follow hexagonal architecture patterns
2. Write tests (unit, contract, integration)
3. Document decisions in ADRs
4. Log uncertainty in tech debt

### Key Resources
- **[Testing Strategy](../.github/instructions/testing-strategy.instructions.md)** - Testing patterns
- **[Core Principles](../.github/instructions/core-principles.instructions.md)** - Design philosophy
- **[Tech Debt Log](./TODO.md)** - Active work and open questions
- **[ADRs](../.adr/)** - Architectural decisions with context

## For Users

### Authentication
- **GitHub OAuth** for interactive users
- **API Keys** for programmatic access
- See [Authentication Guide](./authentication.md)

### Real-World Examples
- E-commerce flash sale monitoring
- DevOps health checks with auto-remediation
- Content publishing automation
- Data pipeline coordination
- SaaS usage monitoring
- Web scraping with rate limiting

See [Use Cases](./use-cases.md) for detailed scenarios.

## Project Organization

```
docs/
├─ README.md                        # This file
├─ quickstart.md                    # Get running quickly
├─ architecture.md                  # System design
├─ authentication.md                # Auth setup
├─ use-cases.md                     # Examples and patterns
├─ contributing.md                  # Development guide
├─ TODO.md                          # Active work tracking
├─ ui-requirements-summary.md       # UI planning overview (MVP)
├─ minimal-ui-requirements.md       # Detailed UI specifications
├─ ui-sitemap.md                    # Site structure and navigation
├─ ui-implementation-checklist.md   # Implementation task breakdown
└─ archive/                         # Historical/reference docs
```

## Additional Resources

- **GitHub**: [bcanfield/mvpmvp](https://github.com/bcanfield/mvpmvp)
- **ADRs**: [.adr/](../.adr/) - Architectural Decision Records
- **Instructions**: [.github/instructions/](../.github/instructions/) - AI agent guidance

---

**Questions?** Check the guides above or open an issue on GitHub.
