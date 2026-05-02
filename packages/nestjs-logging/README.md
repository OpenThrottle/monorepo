# @openthrottle/nestjs-logging

NestJS logging utilities: durable **JSON Lines** log files plus optional **WebSocket** streaming (OpenClaw-style hybrid). Status: in active development; see [docs/openclaw-style-contract.md](./docs/openclaw-style-contract.md) for the frozen JSONL schema and Socket.IO control/push contract.

## Maintainer docs

- [OpenClaw-style contract (JSONL + WebSocket)](./docs/openclaw-style-contract.md) — line schema, `logs.*` messages, backpressure, and upstream OpenClaw reference.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-logging
```

**npm:**

```bash
npm install @openthrottle/nestjs-logging
```

**yarn:**

```bash
yarn add @openthrottle/nestjs-logging
```
