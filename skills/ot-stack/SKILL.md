---
name: ot-stack
description: >-
  Conventions for the OpenThrottle platform itself. USE WHEN changing
  openthrottle-server, openthrottle-developer, databases or database:import-docs,
  embeddings, packages/openthrottle-mcp, or the GraphQL schema and semantic
  ingest. Not for routine OT plan CRUD (see ot-plans), SQL migrations
  (ot-postgres), or scaffolding (ot-generators).
metadata:
  author: openthrottle
  last-reviewed: '2026-11-14'
  version: '1.1.0'
---

# OpenThrottle stack (server, data, developer app, MCP)

## When to read this skill

- You touch **`applications/openthrottle-server`** (NestJS GraphQL, queues, repositories).
- You touch **`databases/`**, **`pnpm run database:*`**, embeddings, or **plan/docs ingest** scripts.
- You touch **`applications/openthrottle-developer`** (routes, loaders, GraphQL client).
- You extend or debug **`packages/openthrottle-mcp`** (tools, env, smoke checks).

Use `ot-generators` for scaffolding, `nx-workspace` for graph and targets, `ot-plans` for OpenThrottle plans/tasks and MCP traceability, `ot-postgres` for SQL migrations and table comments, `ot-loop` for executing a plan. The OT Loop job and its BullMQ wiring: [docs/workflows/ot-loop-job.md](https://github.com/openthrottle/monorepo/blob/main/docs/workflows/ot-loop-job.md).

---

## 1. NestJS GraphQL (`openthrottle-server`)

**Conventions**

- **Schema and codegen:** follow [AGENTS.md § GraphQL schema + codegen flow](https://github.com/openthrottle/monorepo/blob/main/AGENTS.md); `schema.gql` is only written by `pnpm nx run openthrottle-server:graphql-schema:write`.
- **Backwards-compatible schema:** when updating `.entity` files the GraphQL schema must stay backwards compatible. Avoid removing fields or changing types on existing ObjectTypes; if a field is no longer needed, mark it **`@deprecated(reason: "...")`** instead of deleting it.
- **Resolver return types:** there are **no** `Result()` / `PaginatedResult()` / `ListResult()` factories (they lived in the never-ported `@openthrottle/nestjs-core`). Return a hand-written `@ObjectType()` from the feature's `*.object.ts`, never a raw entity: the class for one item, `[Thing]` for a plain list, or a `<Thing>ListResult` envelope when the list needs metadata. References: `projects/project-plans-page.object.ts`, `work-ledger/work-ledger.object.ts`. Scaffold new GraphQL modules with `@tools/generators:nestjs` (`graphql-service` / `simple-service`) — those templates match this shape.
- **Offset-paged lists:** envelope `extends OffsetPageObject` (`@openthrottle/nestjs-graphql`) and declares typed `items`; input `extends OffsetPaginationInput`; the resolver calls `assertPagination(input, { max })` (rejects a sent out-of-range value). The repository clamps with `resolvePagination` / `paginate` (`@openthrottle/nestjs-postgres`) and returns `OffsetPage<T>`. Default 25, max 100, per-call override allowed. Exceptions: cursor-paged lists, `activityByDate*`, `search`, plain `[Thing]` lists.
- **Positions within a parent** (tasks in a plan, plans in a project): use the `nestjs-postgres` sort-order helpers with the table's `SortOrderScope`; never hand-write a renumber.
- **Data access:** entities, repositories and the default DataSource (`getOpenThrottleTypeOrmOptions()`) live in `@openthrottle/nestjs-repositories-server`; a new table's entity also joins `OPENTHROTTLE_ENTITIES`.
- **New server surface:** use **`NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:nestjs`** (see `ot-generators`); sub-generators include `graphql-service`, `simple-service`, `module`, `queue`, `ai-agent` and `application` — always **`--describe`** first for the required flags per sub-generator. `<SERVICE_NAME>` is kebab-case, often plural for services.

**Testing** (general conventions: [code-style.md § Testing](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/code-style.md#testing); NestJS tier only)

- Test **all** new methods added to resolvers, services and repositories; the test sits next to its file (`<folder>.<kind>.test.ts`), with every NestJS provider mocked in the **`beforeEach`** block.
- Use **model factories** from the repository and **entity factories** from the service where they exist.

---

## 2. Data, embeddings, imports (`databases/`)

**Schema, ingest, embeddings:** [databases/openthrottle/README.md](https://github.com/openthrottle/monorepo/blob/main/databases/openthrottle/README.md).

**Typical commands (repo root)**

| Script                                  | Role                                                           |
| --------------------------------------- | -------------------------------------------------------------- |
| `pnpm run database:start`               | Postgres + Redis (Compose)                                     |
| `pnpm run database:migrate`             | Apply migrations                                               |
| `pnpm run database:import-docs`         | Ingest `docs/` + NX READMEs into documentation tables          |
| `pnpm run database:import-agent-assets` | Ingest `skills/` + `.agents/` assets into documentation tables |

**Embeddings:** dimension strategy and **Ollama** / **`OPENAI_API_KEY`** are documented in the README above (embedding section). Local Ollama and Cursor proxy: [docs/monorepo/Ollama.md](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/Ollama.md).

---

## 3. React Router UI (`openthrottle-developer`)

Env defaults live in `applications/openthrottle-developer/.env.default`; full stack quick path: [run-openthrottle-server-developer.md](https://github.com/openthrottle/monorepo/blob/main/docs/openthrottle/run-openthrottle-server-developer.md).

**Conventions**

- **New UI:** **react-router** generator (`ot-generators`); application name **`openthrottle-developer`** from `--list=applications`.
- After **GraphQL schema changes** (once `schema.gql` is regenerated, §1) or fresh clone: **`pnpm nx run openthrottle-developer:codegen-graphql`**.
- Prefer existing route and **settings** patterns (e.g. `settings.*`, `plans.*`) over one-off structure.

**Testing:** component tests go in a sibling `__tests__/` (see code-style.md § Testing above); generate mock data from the GraphQL types in the application's `mocks.ts`.

---

## 4. `@openthrottle/openthrottle-mcp`

**Boundary:** MCP tools call **openthrottle-server GraphQL only** — no direct DB driver in the MCP package, so DB scripts and migrations are not part of MCP configuration.

**Paths:** package README `packages/openthrottle-mcp/README.md`; auth tokens `packages/openthrottle-mcp/docs/AUTH.md`; env, smoke checklist and secondary workspace `packages/openthrottle-mcp/docs/verification-environment.md`; Cursor registration `.cursor/mcp.json` (server id **`openthrottle-mcp`**); env probe `scripts/verify-openthrottle-mcp-env.sh`.

**Local verification (minimal):** install, root + server `.env`, **`pnpm run database:start`** + **`pnpm run database:migrate`**, **`pnpm nx run openthrottle-server:dev`**, align **`API_URL` / `API_URL_INTERNAL`** with server port; **`OPENTHROTTLE_MCP_AUTH_TOKEN`** for authenticated tools. Details and failure modes: **`verification-environment.md`**.

**Extending tools:** add or adjust GraphQL operations against **openthrottle-server** first; keep MCP as a thin GraphQL client and document env in README/AUTH/verification docs.
