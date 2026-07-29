---
description: Prerequisites and the commands to run the OpenThrottle stack locally.
group: 00. Getting Started
order: 2
title: Getting Started
---

# Getting Started

This guide takes you from a fresh checkout to the developer app running against a local server.

## Prerequisites

- **Node.js >= 22.** Older versions are unsupported.
- **pnpm.** This is a pnpm-only workspace — a `preinstall` guard blocks `npm` and `yarn`. Install pnpm with `corepack enable` (bundled with Node) or per the [pnpm docs](https://pnpm.io/installation).
- **Docker.** The local Postgres + Redis stack runs via Docker Compose.

## First-time setup

From the workspace root:

```bash
./scripts/setup.sh
```

This performs a full environment setup (and can be re-run to reset it). It installs dependencies with pnpm and prepares the workspace.

## Start the databases

```bash
pnpm run database:start
```

This brings up Postgres and Redis via Docker Compose. Then apply any pending migrations:

```bash
pnpm run database:migrate
```

Migrations are idempotent — they run through a `schema_migrations` ledger, so re-running is safe and does not re-stamp data. (This command does not take a backup.)

## Run the apps

Everything runs through Nx, prefixed with pnpm — never call the underlying tooling directly.

```bash
# NestJS GraphQL API
pnpm nx run openthrottle-server:dev

# Developer UI (React Router)
pnpm nx run openthrottle-developer:dev
```

The developer app reads plans and tasks from the OpenThrottle GraphQL API, so start the server first (or point the app at a running server).

## Validate your changes

```bash
pnpm nx run <project>:lint
pnpm nx run <project>:typecheck   # tsc over source AND tests; does NOT run tests
pnpm nx run <project>:test        # Vitest

pnpm nx affected --target=lint --parallel   # affected projects only
pnpm run check:local                        # full local CI parity
```

`typecheck` and `test` are not interchangeable: `typecheck` type-checks source and test files without executing them; only `test` runs the Vitest assertions.

## Regenerate GraphQL types

The schema is code-first in `openthrottle-server`. After changing GraphQL types, resolvers, or documents:

1. Run `pnpm nx run openthrottle-server:dev` until it bootstraps, then stop it — this writes `applications/openthrottle-server/schema.gql`.
2. `pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel`
3. Commit the updated `schema.gql` and all `__generated__` output. CI fails on codegen drift.

If something doesn't connect, see [Troubleshooting](/docs/troubleshooting) or the [FAQ](/faq).
