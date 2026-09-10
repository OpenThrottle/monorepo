---
name: ot-stack
description: >-
  Conventions for the OpenThrottle platform itself. USE WHEN changing
  openthrottle-server, openthrottle-developer, databases or database:import-docs,
  embeddings, packages/openthrottle-mcp, or the GraphQL schema and semantic
  ingest. Not for routine OT plan CRUD (see ot-plans), SQL migrations
  (ot-postgres), or scaffolding (ot-generators).
---

# OpenThrottle stack (server, data, developer app, MCP)

## When to read this skill

- You touch **`applications/openthrottle-server`** (NestJS GraphQL, queues, repositories).
- You touch **`databases/`**, **`pnpm run database:*`**, embeddings, or **plan/docs ingest** scripts.
- You touch **`applications/openthrottle-developer`** (routes, loaders, GraphQL client).
- You extend or debug **`packages/openthrottle-mcp`** (tools, env, smoke checks).

Use **ot-generators** for scaffolding, **nx-workspace** for graph and targets, **ot-plans** for OpenThrottle plans/tasks and MCP traceability, **agents-ralph** for the per-task execution discipline.

## How this fits other skills

| Need                                                       | Use                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `@tools/generators`, `NX_ISOLATE_PLUGINS`                  | **ot-generators** — `.agents/skills/ot-generators/SKILL.md`               |
| Plans, `Plan-Id` / `Task-Id`, work-ledger commit recording | **ot-plans** — `.agents/skills/ot-plans/SKILL.md`                         |
| Ralph loop prompt (one task at a time)                     | **agents-ralph** — `.agents/skills/agents-ralph/SKILL.md`                 |
| Ralph CLI, BullMQ mental model                             | `tools/workflows/README.md` (no skill)                                    |
| Nx graph, `nx show project`, affected                      | **nx-workspace** — `.agents/skills/nx-workspace/SKILL.md`                 |
| Run `nx` targets                                           | **nx-workspace** — `.agents/skills/nx-workspace/SKILL.md`                 |
| **SQL migrations / table comments**                        | **ot-postgres** — `.agents/skills/ot-postgres/SKILL.md`                   |
| **This file**                                              | Server conventions, DB/embeddings, developer UI, openthrottle-mcp package |

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

- **Backwards-compatible schema:** when updating `.entity` files the GraphQL schema must stay backwards compatible. Avoid removing fields or changing types on existing ObjectTypes; if a field is no longer needed, mark it **`@deprecated(reason: "...")`** instead of deleting it.
- **Resolver return types:** resolver methods should return an ObjectType built with **`Result()`**, **`PaginatedResult()`** or **`ListResult()`** (or a module-specific `*ResultObject`), never a raw entity:

  ```typescript
  @ObjectType()
  export class PlatformShiftListResult extends ListResult(PlatformShift) {}
  ```

  New GraphQL services from the **nestjs** generator already follow the `Result` / `PaginatedResult` pattern — see `tools/generators/src/generators/nestjs/files/graphql-service/`.

- **New server surface:** use **`NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:nestjs`** (see **ot-generators**); sub-generators include `graphql-service`, `simple-service`, `module`, `queue`, `ai-agent` and `application` — always **`--describe`** first for the required flags per sub-generator. `<SERVICE_NAME>` is kebab-case, often plural for services.

**Testing**

- Test **all** new methods added to resolvers, services and repositories.
- Co-located tests (e.g. `*.test.ts` next to resolvers), with every NestJS provider mocked in the **`beforeEach`** block.
- Use **model factories** from the repository and **entity factories** from the service where they exist.
- Each `if` statement in the logic gets its own **`describe`** block, and always include edge cases.

---

## 2. Data, embeddings, imports (`databases/`)

**SQL migrations and table comments:** **ot-postgres** — `.agents/skills/ot-postgres/SKILL.md` (`COMMENT ON TABLE`, migration naming, diff-scoped lint). **Schema, ingest, embeddings:** **`databases/README.md`**.

**Typical commands (repo root)**

| Script                                  | Role                                                           |
| --------------------------------------- | -------------------------------------------------------------- |
| `pnpm run database:start`               | Postgres + Redis (Compose)                                     |
| `pnpm run database:migrate`             | Apply migrations                                               |
| `pnpm run database:import-docs`         | Ingest `docs/` + NX READMEs into documentation tables          |
| `pnpm run database:import-agent-assets` | Ingest `skills/` + `.agents/` assets into documentation tables |

**Embeddings:** dimension strategy and **Ollama** / **`OPENAI_API_KEY`** are documented in **`databases/README.md`** (embedding section). For local Ollama and Cursor proxy, see **`docs/monorepo/Ollama.md`** and **`AGENTS.md`** (local embeddings / `OLLAMA_*`).

**Relationship to MCP:** **`openthrottle-mcp` does not connect to Postgres directly** — only **openthrottle-server** GraphQL. DB scripts and migrations are for the server and offline ingest, not for MCP process configuration.

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

- **New UI:** **react-router** generator (**ot-generators**); application name **`openthrottle-developer`** from `--list=applications`.
- After **GraphQL schema changes** or fresh clone: **`pnpm nx run openthrottle-developer:codegen-graphql`** (also noted in run doc above).
- Prefer existing route and **settings** patterns (e.g. `settings.*`, `plans.*`) over one-off structure.

**Testing:** component tests colocated under `app/routes/__tests__/` and route-adjacent `*.test.tsx`; generate mock data from the GraphQL types in the application's `mocks.ts`. UI testing conventions (`component` not `screen`, `userEvent` not `fireEvent`, asserting behavior over copy) live in [`docs/monorepo/code-style.md`](../../docs/monorepo/code-style.md#testing).

---

## 4. `@openthrottle/openthrottle-mcp`

**Boundary:** MCP tools call **openthrottle-server GraphQL only** — no direct DB driver in the MCP package.

**Canonical paths**

| Topic                                     | Path                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| Package README                            | `packages/openthrottle-mcp/README.md`                        |
| Auth tokens                               | `packages/openthrottle-mcp/docs/AUTH.md`                     |
| Env, smoke checklist, secondary workspace | `packages/openthrottle-mcp/docs/verification-environment.md` |
| Cursor registration                       | `.cursor/mcp.json` (server id **`openthrottle-mcp`**)        |
| Env probe script                          | `scripts/verify-openthrottle-mcp-env.sh`                     |

**Local verification (minimal):** install, root + server `.env`, **`pnpm run database:start`** + **`pnpm run database:migrate`**, **`pnpm nx run openthrottle-server:dev`**, align **`API_URL` / `API_URL_INTERNAL`** with server port; **`OPENTHROTTLE_MCP_AUTH_TOKEN`** for authenticated tools. Details and failure modes: **`verification-environment.md`**.

**Extending tools:** add or adjust GraphQL operations against **openthrottle-server** first; keep MCP as a thin GraphQL client and document env in README/AUTH/verification docs.

---

## Cross-links

- **Run server + UI + ports:** `docs/openthrottle/run-openthrottle-server-developer.md`
- **Monorepo OT overview:** `AGENTS.md`
- **Queues and workflows:** `tools/workflows/README.md` (loop prompt: **agents-ralph**)
- **Code style (TypeScript, components, testing):** `docs/monorepo/code-style.md`, normative in `AGENTS.md` § Code style
- **Where files go and what they are named:** [`ot-folders`](../ot-folders/SKILL.md)
