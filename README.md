<div align="center">

# 🦄 Cronicorn

**Job scheduler with AI-powered adaptive intervals—timing adjusts automatically based on application conditions**

[![GitHub stars](https://img.shields.io/github/stars/bcanfield/mvpmvp?style=social)](https://github.com/bcanfield/mvpmvp/stargazers)
[![License: FSL-1.1-MIT](https://img.shields.io/badge/License-FSL--1.1--MIT-blue.svg)](./LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)

[Quick Start](#-quick-start) • [Documentation](./docs) • [Use Cases](./docs/use-cases.md)

</div>

---

## The Problem

Traditional schedulers run jobs at fixed intervals—checking everything every 5 minutes whether your system is calm or on fire. 

You waste resources during quiet periods and miss issues during incidents.

## The Solution

Cronicorn's AI **automatically adjusts timing** based on what's actually happening:

- **5min → 30sec** when incidents are detected
- **Pause expensive jobs** until they're actually needed  
- **Auto-recovery** attempts before alerting humans
- **Smart cooldowns** prevent notification spam

```bash
# Flash Sale Example
📊 Traffic Monitor    5min → 30sec     (detects spike, tightens)
🔍 Page Analyzer      OFF → ON         (activates when needed)
🔧 Cache Warmer       Runs once        (fixes performance)
� Slack Alert       One message      (no spam)
```

**Result:** Issues get resolved faster with less noise.

---

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/bcanfield/mvpmvp.git
cd mvpmvp && pnpm install

# Start database and run migrations  
docker-compose up -d && pnpm db:migrate

# Start all services
pnpm dev
```

API runs at `http://localhost:3333`. Create your first adaptive job:

```bash
curl -X POST http://localhost:3333/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Monitor",
    "endpoints": [{
      "name": "Health Check",
      "url": "https://your-api.com/health",
      "baselineIntervalMs": 300000,
      "minIntervalMs": 30000,
      "maxIntervalMs": 900000
    }]
  }'
```

**That's it!** The AI will automatically adjust timing based on your API's behavior.

---

## � Why Choose Cronicorn?

**🛒 E-Commerce Teams:** Handle traffic surges automatically—no manual scaling  
**🔧 DevOps Teams:** Auto-remediation before 3 AM pages  
**📊 Data Teams:** Pipelines that adapt to data volume  
**👩‍💻 Any Developer:** Set scheduling once, let AI handle the rest  

**[See real examples →](./docs/use-cases.md)**

---

## 🆚 vs Traditional Schedulers

| Traditional Cron | Cronicorn |
|-----------------|-----------|
| Fixed 5-minute intervals | **Adapts: 5min → 30sec during incidents** |
| Runs expensive jobs always | **Pauses until actually needed** |
| Alert on every failure | **Smart escalation with cooldowns** |
| Manual configuration | **AI learns and adjusts automatically** |

---

## 📚 Learn More

- **[Full Documentation](./docs)** - Complete guides and API reference
- **[Use Cases](./docs/use-cases.md)** - E-commerce, DevOps, data pipelines
- **[Architecture](./docs/architecture.md)** - How it works under the hood
- **[Contributing](./docs/contributing.md)** - Join the community

---

<div align="center">

**Stop fighting your scheduler. Let it adapt to you.**

⭐️ **Star us if Cronicorn saves you from a 3 AM page**

[🚀 Get Started](#-quick-start) • [💬 Discussions](https://github.com/bcanfield/mvpmvp/discussions) • [� Issues](https://github.com/bcanfield/mvpmvp/issues)

</div>
