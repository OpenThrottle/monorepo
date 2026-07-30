---
description: Fixes for common local-development issues.
group: 03. Operations
order: 1
title: Troubleshooting
---

# Troubleshooting

Fixes for the issues you're most likely to hit running the stack locally.

## `npm install` / `yarn install` is blocked

This is a **pnpm-only** workspace; a `preinstall` guard rejects other package managers. Use pnpm:

```bash
corepack enable
pnpm install
```

## Wrong Node version

Node **>= 22** is required. Check with `node --version` and upgrade if you're on an older release (e.g. via `nvm install 22`).

## The app can't reach the API

The developer app reads from the `openthrottle-server` GraphQL API. Make sure the server is running:

```bash
pnpm nx run openthrottle-server:dev
```

## Postgres or Redis connection errors

Start the local data stack and apply migrations:

```bash
pnpm run database:start
pnpm run database:migrate
```

Migrations are idempotent (tracked by a `schema_migrations` ledger), so re-running is safe.

## A port is already in use

A previous dev server may still be running. Stop it (scope any process kill to the specific server), then restart. When working in a git worktree, scope process kills to that worktree's path so you don't take down the primary checkout's server.

## Tests won't collect in a fresh checkout

App Vitest suites depend on generated GraphQL types. In a brand-new checkout, generate them first:

```bash
pnpm nx run-many --target=codegen-graphql --all
```

## CI fails on codegen drift

The committed schema and `__generated__` output must match the code. Re-run the codegen flow and commit the result:

1. `pnpm nx run openthrottle-server:dev` until bootstrap, then stop (writes `applications/openthrottle-server/schema.gql`).
2. `pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel`
3. Commit `schema.gql` and all `__generated__` files.

## Still stuck?

Run the full local CI parity check to reproduce what CI sees:

```bash
pnpm run check:local
```
