---
name: openthrottle-stack
description: >-
  OpenThrottle platform slices beyond generators and OT plans: NestJS GraphQL
  patterns in openthrottle-server (resolver wrappers, backwards-compatible
  schema); Postgres/pgvector and ingest scripts (databases/README.md); React
  Router UI in openthrottle-developer (@openthrottle/react-router-shadcn,
  routes under app/routes); @openthrottle/mcp-developer GraphQL boundary,
  auth, and local verification. Use when working on openthrottle-server,
  openthrottle-developer, databases/migrations/embedding imports,
  packages/mcp-developer, Cortex Postgres schema, semantic search ingestion,
  Ollama vs OpenAI embeddings, verify-openthrottle-mcp-env, or extending MCP
  tools against openthrottle-server only.
---

# OpenThrottle stack (server, data, developer app, MCP)

## When to read this skill

- You touch **`applications/openthrottle-server`** (NestJS GraphQL, queues, repositories).
- You touch **`databases/`**, **`pnpm run database:*`**, embeddings, or **plan/docs ingest** scripts.
- You touch **`applications/openthrottle-developer`** (routes, loaders, GraphQL client).
- You extend or debug **`packages/mcp-developer`** (tools, env, smoke checks).

Use **openthrottle-generators** for scaffolding, **nx-workspace** / **nx-run-tasks** for graph and targets, **ot-plans** for Cortex plans/tasks and MCP traceability, **workflow-ralph** for Ralph CLI and queues.

## How this fits other skills

| Need                                        | Use                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| `@tools/generators`, `NX_ISOLATE_PLUGINS`   | **openthrottle-generators** — `.agents/skills/openthrottle-generators/SKILL.md` |
| Plans, `Plan-Id` / `Task-Id`, `link_commit` | **ot-plans** — `.agents/skills/ot-plans/SKILL.md`                               |
| `workflow-ralph`, BullMQ mental model       | **workflow-ralph** — `.agents/skills/workflow-ralph/SKILL.md`                   |
| Nx graph, `nx show project`, affected       | **nx-workspace** — `.agents/skills/nx-workspace/SKILL.md`                       |
| Run `nx` targets                            | **nx-run-tasks** — `.agents/skills/nx-run-tasks/SKILL.md`                       |
| **This file**                               | Server conventions, DB/embeddings, developer UI, mcp-developer package          |

---

## 1. NestJS GraphQL (`openthrottle-server`)

**Canonical paths**

| Topic                                  | Path                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| App module and GraphQL wiring          | `applications/openthrottle-server/src/app.module.ts`    |
| GraphQL modules                        | `applications/openthrottle-server/src/graphql/`         |
| Generated / audited schema (reference) | `applications/openthrottle-server/schema.gql`           |
| Schema audit notes                     | `applications/openthrottle-server/docs/SCHEMA_AUDIT.md` |

**Conventions (align with workspace rules)**

- **Backwards-compatible schema:** avoid removing fields or changing types on existing ObjectTypes; **deprecate** unused fields instead. See **Updating Existing Files** under API applications in `.cursor/rules/personal-general.mdc`.
- **Resolver return types:** prefer ObjectTypes built with **`Result()`**, **`PaginatedResult()`**, **`ListResult()`** (and module-specific `*ResultObject` types) rather than returning raw entities — same section in `.cursor/rules/personal-general.mdc`. New GraphQL services from the **nestjs** generator follow the `Result` / `PaginatedResult` pattern in `tools/generators/src/generators/nestjs/files/graphql-service/`.
- **New server surface:** use **`NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:nestjs`** (see **openthrottle-generators**); sub-generators include `graphql-service`, `module`, `queue`, etc. — always **`--describe`** first.

**Testing**

- Co-located tests (e.g. `*.test.ts` next to resolvers) with providers mocked in **`beforeEach`**; cover branches per **personal-general.mdc** (NestJS testing bullets).

---

## 2. Data, embeddings, imports (`databases/`)

**Canonical path:** `databases/README.md` (schema, migrations under `databases/cortex/migrations/`, embedding dimensions, Ollama vs OpenAI).

**Typical commands (repo root)**

| Script                          | Role                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm run database:start`       | Postgres + Redis (Compose)                                                           |
| `pnpm run database:migrate`     | Apply migrations                                                                     |
| `pnpm run database:import`      | Ingest plan JSON from `plans/` (non-template dirs); embeddings when keys/model allow |
| `pnpm run database:import-docs` | Ingest `docs/` + NX READMEs into documentation tables                                |

**Embeddings:** dimension strategy and **Ollama** / **`OPENAI_API_KEY`** are documented in **`databases/README.md`** (embedding section). For local Ollama and Cursor proxy, see **`docs/monorepo/Ollama.md`** and **`AGENTS.md`** (local embeddings / `OLLAMA_*`).

**Relationship to MCP:** **`mcp-developer` does not connect to Postgres directly** — only **openthrottle-server** GraphQL. DB scripts and migrations are for the server and offline ingest, not for MCP process configuration.

---

## 3. React Router UI (`openthrottle-developer`)

**Canonical paths**

| Topic                 | Path                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ |
| Routes (file-based)   | `applications/openthrottle-developer/app/routes/`                                    |
| Shared UI primitives  | `@openthrottle/react-router-shadcn` — `packages/react-router-shadcn/src/components/` |
| Env defaults          | `applications/openthrottle-developer/.env.default`                                   |
| Full stack quick path | `docs/openthrottle/run-openthrottle-server-developer.md`                             |

**Conventions**

- **New UI:** **react-router** generator (**openthrottle-generators**); application name **`openthrottle-developer`** from `--list=applications`.
- After **GraphQL schema changes** or fresh clone: **`pnpm nx run openthrottle-developer:codegen-graphql`** (also noted in run doc above).
- Prefer existing route and **settings** patterns (e.g. `settings.*`, `plans.*`) over one-off structure.

**Testing:** component tests colocated under `app/routes/__tests__/` and route-adjacent `*.test.tsx`; mocks from GraphQL types per **`personal-general.mdc`** UI testing bullets.

---

## 4. `@openthrottle/mcp-developer`

**Boundary:** MCP tools call **openthrottle-server GraphQL only** — no direct DB driver in the MCP package.

**Canonical paths**

| Topic                                     | Path                                                      |
| ----------------------------------------- | --------------------------------------------------------- |
| Package README                            | `packages/mcp-developer/README.md`                        |
| Auth tokens                               | `packages/mcp-developer/docs/AUTH.md`                     |
| Env, smoke checklist, secondary workspace | `packages/mcp-developer/docs/verification-environment.md` |
| Cursor registration                       | `.cursor/mcp.json` (server id **`mcp-developer`**)        |
| Env probe script                          | `scripts/verify-openthrottle-mcp-env.sh`                  |

**Local verification (minimal):** install, root + server `.env`, **`pnpm run database:start`** + **`pnpm run database:migrate`**, **`pnpm nx run openthrottle-server:dev`**, align **`API_URL` / `API_URL_INTERNAL`** with server port; **`MCP_DEVELOPER_AUTH_TOKEN`** for authenticated tools. Details and failure modes: **`verification-environment.md`**.

**Extending tools:** add or adjust GraphQL operations against **openthrottle-server** first; keep MCP as a thin GraphQL client and document env in README/AUTH/verification docs.

---

## Cross-links

- **Run server + UI + ports:** `docs/openthrottle/run-openthrottle-server-developer.md`
- **Monorepo OT overview:** `AGENTS.md`
- **Queues and workflows:** `tools/workflows/README.md` (see **workflow-ralph** skill)
- **API + UI coding rules:** `.cursor/rules/personal-general.mdc`
