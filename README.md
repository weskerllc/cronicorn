<div align="center">

# 🦄 Cronicorn

### AI-Powered Adaptive Job Scheduler

**A scheduler that thinks like a DevOps engineer—tightening monitoring during incidents, relaxing during calm periods, and attempting recovery before waking you up at 3 AM.**

[![GitHub stars](https://img.shields.io/github/stars/bcanfield/mvpmvp?style=social)](https://github.com/bcanfield/mvpmvp/stargazers)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./docs/contributing.md)

[Features](#-features) • [Quick Start](#-quick-start) • [Use Cases](#-real-world-use-cases) • [Architecture](#-architecture) • [Documentation](./docs)

</div>

---

## 🎯 The Problem

Traditional job schedulers treat every moment the same—checking your services at fixed intervals whether things are calm or chaotic. During incidents, you're monitoring at the same slow pace when you need faster visibility. During quiet periods, you're wasting resources checking everything obsessively.

**You need a scheduler that adapts to reality.**

## ✨ The Solution

Cronicorn uses **AI to dynamically adjust scheduling** based on real-time conditions:

- 🔄 **Adaptive Intervals**: Tightens monitoring from 5min → 30sec during incidents, relaxes back during recovery
- 🎭 **Conditional Activation**: Keeps expensive investigation tools paused until health checks detect issues
- 🔧 **Auto-Recovery**: Attempts fixes (cache warming, pod restarts) before paging humans
- 🚨 **Smart Alerts**: Escalation ladder with cooldowns—no notification spam

```
🎬 During Flash Sale
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Traffic Monitor     5min → 30sec      (adaptive tightening)
🔍 Page Analyzer       Paused → Active   (conditional activation)
🔧 Cache Warm-Up       Triggers once     (auto-recovery)
📢 Slack Alert         One notification  (smart cooldown)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Result: Problems resolved, team informed—not overwhelmed
```

---

## 💡 What Makes This Special?

Unlike traditional schedulers that blindly execute on fixed intervals, Cronicorn:

- **Learns from patterns** → Notices when failures cluster or performance degrades
- **Adapts automatically** → Tightens monitoring during incidents, relaxes during recovery  
- **Orchestrates workflows** → Health checks trigger investigation, which triggers recovery
- **Reduces noise** → Smart cooldowns prevent alert spam
- **Explains decisions** → Every AI adjustment includes clear reasoning

**Think of it as having a senior DevOps engineer watching your systems 24/7.**

---

## 🚀 Features

<table>
<tr>
<td width="50%">

### 🧠 Intelligent Scheduling
- AI learns from execution patterns
- Adjusts intervals based on success/failure rates
- Respects min/max bounds you define
- Manual overrides always take priority

</td>
<td width="50%">

### 🎯 Conditional Workflows
- Pause endpoints until triggered
- Coordinated multi-tier execution
- Health → Investigation → Recovery → Alert
- Reduces false alarms and alert fatigue

</td>
</tr>
<tr>
<td width="50%">

### ⚡ Production Ready
- Distributed architecture with lease-based locking
- Idempotent execution (safe retries)
- Transaction-per-execution guarantees
- Graceful degradation if AI worker is down

</td>
<td width="50%">

### 📊 Observable by Default
- Every AI decision includes reasoning
- Complete execution history audit trail
- Structured logging with context
- Real-time monitoring dashboard

</td>
</tr>
</table>

---

## 🏁 Quick Start

### Prerequisites

- Node.js >= 24.0.0
- pnpm >= 10.0.0
- Docker (for PostgreSQL)

### Installation

```bash
# Clone the repository
git clone https://github.com/bcanfield/mvpmvp.git
cd mvpmvp

# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

**That's it!** The API runs at `http://localhost:3333` with sensible defaults.

### Optional Configuration

Create `.env` to customize (or use defaults):

```bash
# Database (defaults: localhost:6666)
DATABASE_URL=postgresql://user:password@localhost:6666/cron_mvp

# AI Features (leave blank to disable)
OPENAI_API_KEY=sk-your_key_here
AI_ENABLED=true

# Authentication (optional - defaults work for testing)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Create Your First Job

```bash
curl -X POST http://localhost:3333/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Health Monitor",
    "endpoints": [{
      "name": "API Latency Check",
      "url": "https://your-api.com/health",
      "method": "GET",
      "baselineIntervalMs": 300000,
      "minIntervalMs": 30000,
      "maxIntervalMs": 900000
    }]
  }'
```

---

## 🎭 Real-World Use Cases

### 🛒 E-Commerce Flash Sale

Handle traffic surges automatically:

- **Health monitors** detect 5× traffic spike
- **AI tightens** intervals (5min → 30sec)
- **Page analyzer** activates (was paused) to identify slow products
- **Cache warm-up** fires once to fix performance
- **Operations team** gets one Slack notification—not spam

[See full simulation →](./docs/use-cases.md#e-commerce-flash-sale-monitoring)

### 🔧 DevOps Auto-Remediation

Recover from issues automatically:

- Error rate spikes → investigation logs activate
- Slow queries detected → automatic query killer runs
- Memory issues found → pod restart attempts
- Only pages oncall if auto-recovery fails

[See more use cases →](./docs/use-cases.md)

### 📊 Data Pipeline Orchestration

Coordinate dependent jobs:

- Extract completes → Transform activates (was paused)
- Transform finishes → Load triggers
- Adaptive intervals based on data volume

### 💳 SaaS Usage & Billing

Monitor smarter, not harder:

- Increase monitoring as usage approaches quotas
- Pause checks after limits exceeded
- Accelerate dunning based on payment patterns

---

## 🏗️ Architecture

Cronicorn uses **hexagonal architecture** with clean boundaries:

```
┌─────────────────────────────────────────┐
│         Composition Roots               │
│   (API Server, Scheduler, AI Planner)   │
└────────────────┬────────────────────────┘
                 │ injects dependencies
                 ▼
┌─────────────────────────────────────────┐
│           Domain Layer                  │
│  (Pure scheduling logic, no IO/SDKs)    │
│  • Governor (planning)                  │
│  • Scheduler (execution)                │
│  • Policies (rules)                     │
└────────────────┬────────────────────────┘
                 │ uses ports
                 ▼
┌─────────────────────────────────────────┐
│            Adapters                     │
│  (Infrastructure implementations)        │
│  • Database (PostgreSQL)                │
│  • HTTP Dispatcher                      │
│  • AI SDK (OpenAI)                      │
│  • Cron Parser                          │
└─────────────────────────────────────────┘
```

**Key Benefits:**
- Domain logic is pure and testable
- Infrastructure is swappable
- AI worker runs independently
- Clear separation of concerns

[Deep dive into architecture →](./docs/architecture.md)

---

## 🧪 Testing

We use a **transaction-per-test** pattern for clean database state:

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# Run the flash sale simulation
pnpm sim
```

**Flash Sale Simulator:** Watch 10 endpoints coordinate across 4 tiers over 40 simulated minutes—467 total runs with adaptive intervals and auto-recovery.

---

## 📦 Project Structure

```
mvpmvp/
├── apps/
│   ├── api/              # REST API server
│   ├── web/              # Frontend dashboard
│   ├── scheduler/        # Job execution worker
│   ├── ai-planner/       # AI analysis worker
│   └── migrator/         # Database migrations
├── packages/
│   ├── domain/           # Core scheduling logic
│   ├── services/         # Business logic layer
│   ├── worker-*/         # Background workers
│   └── adapter-*/        # Infrastructure implementations
└── docs/                 # Documentation
```

---

## 🆚 Cronicorn vs Traditional Schedulers

| Feature | Traditional Cron | Cronicorn |
|---------|-----------------|-----------|
| **Intervals** | Fixed | ✅ Adaptive based on conditions |
| **Failure Handling** | Retry blindly | ✅ Learn patterns, adjust strategy |
| **Investigation** | Manual | ✅ Conditional activation |
| **Recovery** | External scripts | ✅ Built-in auto-remediation |
| **Alerts** | Every failure | ✅ Smart escalation with cooldowns |
| **Coordination** | Independent jobs | ✅ Multi-tier workflows |
| **Observability** | Basic logs | ✅ AI reasoning + execution history |

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (we use transaction-per-test)
4. Follow our clean architecture patterns
5. Create ADRs for significant decisions
6. Run tests: `pnpm test`
7. Submit a pull request

[Read full contributing guide →](./docs/contributing.md)

---

## 📚 Documentation

- 📖 [Architecture Guide](./docs/architecture.md) - System design deep dive
- 🚀 [Quick Start Guide](./docs/quickstart.md) - Get running in 5 minutes
- 🎯 [Use Cases](./docs/use-cases.md) - Real-world scenarios
- 🔐 [Authentication](./docs/authentication.md) - API keys & OAuth setup
- 🏛️ [ADRs](./.adr/) - Architectural decision records

---

## 🗺️ Roadmap

- [ ] **Dashboard UI** - Visual monitoring and AI decision tracking
- [ ] **Webhook support** - Beyond HTTP requests
- [ ] **More AI models** - Claude, Gemini support
- [ ] **Custom recovery scripts** - User-defined remediation
- [ ] **Multi-region** - Global distributed scheduling
- [ ] **Self-hosting guide** - Deploy on your infrastructure

---

## 🌟 Why Choose Cronicorn?

### For DevOps Teams
✅ Reduce alert fatigue with smart escalation  
✅ Auto-remediation before paging oncall  
✅ Adaptive monitoring during incidents  

### For E-Commerce
✅ Handle traffic surges automatically  
✅ Performance optimization without manual intervention  
✅ Proactive cache management  

### For Data Engineering
✅ Coordinate dependent pipelines  
✅ Adaptive intervals based on data volume  
✅ Intelligent retry strategies  

### For Everyone
✅ Set baseline schedules once—AI handles the rest  
✅ Zero maintenance scheduling  
✅ Transparent AI decisions with clear reasoning  

---

## 💬 Community & Support

- 🐛 [Report bugs](https://github.com/bcanfield/mvpmvp/issues)
- 💡 [Request features](https://github.com/bcanfield/mvpmvp/issues)
- 💬 [Join discussions](https://github.com/bcanfield/mvpmvp/discussions)
- 📧 Email: support@cronicorn.com

---

## 📄 License

[ISC License](LICENSE) - free for personal and commercial use.

---

<div align="center">

---

**Built by engineers, for engineers.**

*Stop fighting your scheduler. Let it adapt to you.*

### If Cronicorn saves you from a 3 AM page, give us a ⭐️

[![Star History Chart](https://api.star-history.com/svg?repos=bcanfield/mvpmvp&type=Date)](https://star-history.com/#bcanfield/mvpmvp&Date)

[🚀 Get Started](#-quick-start) • [📖 Documentation](./docs) • [💬 Join Community](https://github.com/bcanfield/mvpmvp/discussions)

</div>
