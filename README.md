<div align="center">

# <img src="packages/content/assets/logo.svg" alt="Cronicorn" height="40" align="center"> Cronicorn

**Scheduled HTTP calls that adapt in real time**

<p align="center">
Add HTTP endpoints with a baseline schedule. Describe what matters in plain English —
<br/>
the AI reads your response bodies, adjusts frequency, and coordinates across endpoints. All within your min/max constraints.
</p>

<p align="center">
  <a href="https://cronicorn.com">
    <img src=".github/images/button-start-now.png" alt="Start Now (Free)" width="250" />
  </a>
</p>


<p align="center">
  <img src=".github/images/timeline-animation.gif" alt="Cronicorn AI Adaptation" width="640">
  <br>
  <em>Activity surge → AI tightens to 30s + triggers recovery actions → stabilizes → back to baseline</em>
</p>

</div>

<table align="center"><tr><td>

## Features

- **Response body parsing** — AI reads your endpoint's JSON (`status`, `error_rate_pct`, `queue_depth`) and interprets values against your description
- **Plain English descriptions** — write "tighten when error_rate_pct > 5%" instead of code rules. No SDK, no config files
- **Safety constraints** — min/max intervals the AI cannot exceed. TTL-based hints auto-expire to baseline
- **Endpoint coordination** — endpoints in the same job see each other's responses and adapt together
- **Automatic error recovery** — exponential backoff, configurable timeouts, recovery actions
- **Reliable baseline** — cron expressions and intervals run with or without AI adaptation

## How It Works

1. **Add an HTTP endpoint** and set a baseline schedule (cron or interval)
2. **Describe what matters** in plain English — thresholds, coordination logic, response structure
3. **AI monitors responses** and adapts frequency, triggers actions, and recovers from failures automatically

## Getting Started

| Path | Link |
|------|------|
| **Web UI** — create and manage jobs visually | [cronicorn.com](https://cronicorn.com) |
| **MCP Server** — manage jobs from Claude, Cursor, or any MCP client | [MCP Server docs](https://docs.cronicorn.com/mcp-server) |
| **API** — integrate programmatically with the REST API | [API Playground](https://cronicorn.com/api/reference) |

</td></tr></table>

<p align="center">
  <a href="https://docs.cronicorn.com">Docs</a> ·
  <a href="https://docs.cronicorn.com/mcp-server">MCP Server</a> ·
  <a href="https://cronicorn.com/api/reference">API</a> ·
  <a href="https://docs.cronicorn.com/self-hosting">Self-Host</a> ·
  <a href="https://github.com/weskerllc/cronicorn/issues/new">Support</a>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-FSL--1.1--MIT-blue" alt="License: FSL-1.1-MIT"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://docs.cronicorn.com"><img src="https://img.shields.io/badge/Docs-docs.cronicorn.com-green" alt="Docs"></a>
  <a href="https://context7.com/weskerllc/cronicorn"><img src="https://img.shields.io/badge/Context7-Docs-blue?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnoiIGZpbGw9IndoaXRlIi8+PC9zdmc+" alt="Context7"></a>
</p>
