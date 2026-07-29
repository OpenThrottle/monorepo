---
description: How the OpenThrottle Nx + pnpm monorepo is laid out.
group: 01. Concepts
order: 1
title: Architecture overview
---

# Architecture overview

OpenThrottle is an **Nx + pnpm workspace monorepo** (Node >= 22, pnpm only). It does both **task running** and **package publishing**. Tasks always run through Nx, prefixed with pnpm (`pnpm nx ...`).

## Top-level layout

| Folder          | What lives here                                                           |
| --------------- | ------------------------------------------------------------------------- |
| `applications/` | Deployable apps.                                                          |
| `packages/`     | Shared libraries published under `@openthrottle/*`, plus agentic tooling. |
| `tools/`        | Nx plugins and workspace tooling.                                         |
| `databases/`    | Postgres schema, migrations, and local DB scripts.                        |

### applications/

- `openthrottle-server` — the NestJS **code-first** GraphQL API.
- `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`, `openthrottle-website` — React Router (v8) + Vite apps.

### packages/

- `@openthrottle/nestjs-*` — server modules (auth, bullmq, typeorm, redis, graphql, …).
- `@openthrottle/react-router-*` — shared UI and client libraries consumed by the React Router apps.
- `openthrottle-agentic-*` — the Ralph agentic tooling.
- `openthrottle-mcp` — the OpenThrottle MCP server.

Many `react-router-*` packages are **source-first**: they have no `build` target and their `package.json` `main`/`types` point at `./src/index.ts`, so consuming apps' Vite transpiles them directly. Validate these with `lint` / `typecheck` / `test`, then run `dev` or `build` on a consumer app as the integration check.

### tools/

Nx plugins, `@tools/generators` (scaffolding templates), and `@tools/workflows` (the Ralph CLI).

## Project tags

Every project carries Nx tags — `name:`, `type:`, `production:`, `technology:` — used for filtering and release. Validate them with:

```bash
pnpm nx:validate-tags
```

## Scaffolding

Before writing a new component, route, service, or package by hand, check `@tools/generators`:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<name> --describe
```

All generator commands require the `NX_ISOLATE_PLUGINS=false` prefix. Generators exist for `react`, `react-router`, `nestjs`, `package`, and `folders`.
