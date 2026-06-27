# @openthrottle/nestjs-bullmq

A BullMQ module for NestJS applications. This package provides queue management capabilities using BullMQ, allowing you to handle background jobs, task queues, and asynchronous processing in your NestJS applications.

## Installation

Install with your preferred package manager:

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-bullmq
```

**npm:**

```bash
npm install @openthrottle/nestjs-bullmq
```

## Configuration

The Redis connection is configured via environment variables. Only `REDIS_HOST`
is required; the rest are optional and exist to support authenticated/managed
(cloud) Redis and production hardening.

| Variable         | Required | Default | Description                                                                     |
| ---------------- | -------- | ------- | ------------------------------------------------------------------------------- |
| `REDIS_HOST`     | yes      | —       | Redis hostname.                                                                 |
| `REDIS_PORT`     | no       | `6379`  | Redis port.                                                                     |
| `REDIS_DB`       | no       | —       | Logical database index.                                                         |
| `REDIS_USERNAME` | no       | —       | ACL username (Redis 6+).                                                        |
| `REDIS_PASSWORD` | no       | —       | AUTH password. Most managed Redis requires this.                                |
| `REDIS_TLS`      | no       | off     | Enable TLS when truthy (`1`/`true`/`yes`/`on`). Most managed Redis requires it. |
| `REDIS_FAMILY`   | no       | —       | IP stack: `4` (IPv4) or `6` (IPv6). Some managed Redis resolve only over IPv6.  |

Client resiliency options required by BullMQ (`maxRetriesPerRequest: null`,
`enableReadyCheck: false`) are applied automatically.
