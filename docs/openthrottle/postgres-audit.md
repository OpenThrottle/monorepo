# OpenThrottle direct Postgres access audit

Goal: everything should go through openthrottle-server via GraphQL so all interaction can be limited to the GraphQL layer.

This doc lists **direct Postgres touch points** (raw SQL, pg client, connection strings, TypeORM/repository access) in OpenThrottle apps and packages. It will be updated as each area is audited.

---

## 1. openthrottle-server

**Summary:** openthrottle-server is the intended single gateway to OpenThrottle Postgres. It currently accesses Postgres in two ways: (1) **TypeORM** via `@openthrottle/nestjs-repositories` (PlansService, TasksService, etc.), and (2) **openthrottle-server** (`@openthrottle/node-client`) for config, semantic search, and doc-ingestion state. All of these are “direct” in the sense that the server opens connections and runs SQL; there is no other app in between.

### 1.1 Connection / config

| File                                                    | Usage                                                                                                                                                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `applications/openthrottle-server/.env`, `.env.default` | `POSTGRES_*` and `POSTGRES_URL` (and doc-ingestion uses `POSTGRES_*` via `@tools/workflows/doc-ingestion`) — connection config only, no code.                                             |
| `applications/openthrottle-server/src/app.module.ts`    | Imports `NestjsRepositoriesModule` from `@openthrottle/nestjs-repositories`; that module provides TypeORM DataSource to OpenThrottle Postgres (connection is created inside the package). |

### 1.2 openthrottle-server (`@openthrottle/node-client`)

Used for **config**, **semantic search**, and **embedding**. Each of these uses `getPostgresConfig()` and then runs queries or uses a connection internally.

| File                                                                     | Usage                                                                                                                                                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `applications/openthrottle-server/src/graphql/search/search.resolver.ts` | `getPostgresConfig()`, `embedQuery()`, `runSemanticSearch(config, embedding, limit)`, `getChunkById(config, id)`, `listSources(config)` — semantic search over plan/task/docs embeddings. |
| `applications/openthrottle-server/src/graphql/plans/plans.resolver.ts`   | `getPostgresConfig()`, `searchPlansBySemanticQuery(config, query, limit)` — plan-level semantic search used by `searchPlans` query.                                                       |
| `applications/openthrottle-server/src/graphql/health/health.service.ts`  | `getPostgresConfig()` to decide if DB is configured; then uses `PlansService.getRepository().manager.query('SELECT 1')` for liveness.                                                     |

### 1.3 TypeORM / repository (OpenThrottle Postgres via `@openthrottle/nestjs-repositories`)

All of these use services that expose `getRepository()` (TypeORM Repository) or `repo.manager.query()` for raw SQL. The DataSource is created and used inside `@openthrottle/nestjs-repositories`; openthrottle-server only calls into it.

**Resolvers (GraphQL) — read/write via repository or raw SQL**

| File                                                                                             | Usage                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `applications/openthrottle-server/src/graphql/activity/activity.resolver.ts`                     | `PlansService`, `TasksService`. Uses `plansService.getRepository()` and `repo.manager.query()` for `lastActivity` and `fetchActivityByRange` — raw SQL over `commit_links`, `plan_output_stream`, `tasks`, `plans`.                                                                                                               |
| `applications/openthrottle-server/src/graphql/commit-links/commit-links.resolver.ts`             | `CommitLinksService.getRepository().find()`, `.create()`, `.save()`; also `PlansService.getRepository()`, `TasksService.getRepository()` for ResolveField.                                                                                                                                                                        |
| `applications/openthrottle-server/src/graphql/plans/plans.resolver.ts`                           | `PlansService`, `TasksService`. `getRepository().find()`, `.query()` for: `fetchPlanCountsByStatus` (raw SQL: `SELECT status, COUNT(*)... FROM plans`), `listDistinctCategories` (raw SQL: `SELECT DISTINCT category FROM plans`), `listDistinctAuthorsAndAssignees` (raw SQL over plans/tasks). Plus normal CRUD via repository. |
| `applications/openthrottle-server/src/graphql/health/health.service.ts`                          | `PlansService.getRepository().manager.query('SELECT 1')` for DB liveness.                                                                                                                                                                                                                                                         |
| `applications/openthrottle-server/src/graphql/prompts/custom-prompts.resolver.ts`                | `CustomPromptsService.getRepository()` for find/create/update/delete.                                                                                                                                                                                                                                                             |
| `applications/openthrottle-server/src/graphql/daily-stats/daily-stats.resolver.ts`               | `DailyStatsService.getRepository()` for queries.                                                                                                                                                                                                                                                                                  |
| `applications/openthrottle-server/src/graphql/notes/notes.resolver.ts`                           | `NotesService.getRepository().find()`, repo for create/update/delete.                                                                                                                                                                                                                                                             |
| `applications/openthrottle-server/src/graphql/plan-embeddings/plan-embeddings.resolver.ts`       | `PlanEmbeddingsService.getRepository().find()`, `PlansService.getRepository()` for ResolveField.                                                                                                                                                                                                                                  |
| `applications/openthrottle-server/src/graphql/plan-output-stream/plan-output-stream.resolver.ts` | `PlanOutputStreamService.getRepository().find()` and repo; `PlansService.getRepository()` for ResolveField.                                                                                                                                                                                                                       |
| `applications/openthrottle-server/src/graphql/tasks/tasks.resolver.ts`                           | `TasksService.getRepository().find()` and repo for task CRUD.                                                                                                                                                                                                                                                                     |
| `applications/openthrottle-server/src/graphql/tasks/tasks-loaders.ts`                            | `PlansService.getRepository()` for batched plan/project resolution.                                                                                                                                                                                                                                                               |
| `applications/openthrottle-server/src/graphql/task-embeddings/task-embeddings.resolver.ts`       | `TaskEmbeddingsService.getRepository()`, `TasksService.getRepository()` for ResolveField.                                                                                                                                                                                                                                         |
| `applications/openthrottle-server/src/graphql/users/users.resolver.ts`                           | Uses `UsersService` from nestjs-repositories (repository access).                                                                                                                                                                                                                                                                 |
| `applications/openthrottle-server/src/graphql/roles/roles.resolver.ts`                           | Uses roles service from nestjs-repositories.                                                                                                                                                                                                                                                                                      |
| `applications/openthrottle-server/src/graphql/projects/projects.resolver.ts`                     | Uses `ProjectsService` from nestjs-repositories.                                                                                                                                                                                                                                                                                  |
| `applications/openthrottle-server/src/graphql/payments/payments.resolver.ts`                     | Uses NestjsRepositoriesModule (payments-related repository).                                                                                                                                                                                                                                                                      |

**Queue processors (background jobs) — direct DB access**

| File                                                                                   | Usage                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `applications/openthrottle-server/src/queues/plans/plans.processor.ts`                 | `PlansService.getRepository()`, `PlanOutputStreamService.getRepository()` for plan run job (read/write plans, tasks, plan_output_stream).                                                                                                                                                             |
| `applications/openthrottle-server/src/queues/daily-stats/daily-stats.processor.ts`     | `PlansService.getRepository()`, `TasksService.getRepository()` for daily stats aggregation.                                                                                                                                                                                                           |
| `applications/openthrottle-server/src/queues/doc-ingestion/doc-ingestion.processor.ts` | **Separate path:** `getDocIngestionStateConnectionString()`, `removePriorState(connectionString, ...)`, `savePriorState(connectionString, ...)` from `@tools/workflows/doc-ingestion` — uses a dedicated connection string and raw Postgres for doc-ingestion state (diff, prior state), not TypeORM. |

### 1.4 GraphQL modules that import NestjsRepositoriesModule

These modules don’t run SQL themselves but import the module that provides the Postgres-backed services:

- `activity-graphql.module.ts`
- `auth-graphql.module.ts`
- `commit-links-graphql.module.ts`
- `custom-prompts-graphql.module.ts`
- `daily-stats-graphql.module.ts`
- `health-graphql.module.ts`
- `notes-graphql.module.ts`
- `payments-graphql.module.ts`
- `plan-embeddings-graphql.module.ts`
- `plan-output-stream-graphql.module.ts`
- `plans-graphql.module.ts`
- `projects-graphql.module.ts`
- `roles-graphql.module.ts`
- `task-embeddings-graphql.module.ts`
- `tasks-graphql.module.ts`
- `users-graphql.module.ts`

Queue modules that import NestjsRepositoriesModule:

- `plans-queue.module.ts`
- `daily-stats-queue.module.ts`

---

## 2. openthrottle-developer and other OT apps

**Summary:** No direct Postgres access was found in openthrottle-developer, openthrottle-admin, openthrottle-email, or openthrottle-website. These apps use **GraphQL only** (openthrottle-server) for data. The `applications/openthrottle` folder is a meta-project (compose/env/seed); it holds Postgres-related env and compose for services but has no application code that opens a DB connection.

### 2.1 openthrottle-developer

| File                                                                                     | Usage                                                                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| _(none)_                                                                                 | No pg/Prisma/Drizzle or other DB client. All data via GraphQL (e.g. `serverHealth`, plans, tasks).                                 |
| `app/root.tsx`, `app/global/components/GlobalFooter.tsx`, `GlobalServerHealthBanner.tsx` | Use `serverHealth.database` from GraphQL (openthrottle-server) and UI copy ("Postgres", "Postgres-backed") — not direct DB access. |
| `app/__generated__/*`                                                                    | Generated types and doc strings (e.g. "OpenThrottle Postgres") — no runtime DB.                                                    |
| `codegen.ts`                                                                             | Commented-out Supabase refs — not active.                                                                                          |

### 2.2 openthrottle-admin

| File                  | Usage                                                              |
| --------------------- | ------------------------------------------------------------------ |
| _(none)_              | No direct Postgres access. Uses GraphQL only.                      |
| `app/__generated__/*` | HealthCard `database` field and doc strings — from GraphQL schema. |
| `codegen.ts`          | Commented-out Supabase — not active.                               |

### 2.3 openthrottle-email

| File                  | Usage                                         |
| --------------------- | --------------------------------------------- |
| _(none)_              | No direct Postgres access. Uses GraphQL only. |
| `app/__generated__/*` | Same as above — schema/types only.            |
| `codegen.ts`          | Commented-out Supabase — not active.          |

### 2.4 openthrottle-website

| File                                                    | Usage                                                    |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `app/routes/contact.waitlist.tsx`, `contact._index.tsx` | Commented-out `getSupabaseClient(request)` — not active. |
| `app/routing/home/components/HomeContext.tsx`           | `DatabaseIcon` (UI only).                                |
| `codegen.ts`                                            | Commented-out Supabase — not active.                     |

### 2.5 applications/openthrottle (meta-project)

| File                                 | Usage                                                                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env`, `.env.default`               | `POSTGRES_*` for OpenThrottle (and optional openthrottle DB) — consumed by openthrottle-server or compose services, not by app code in this folder. |
| `docker-compose.yml`, `package.json` | References `openthrottle-postgres` service and `docker:start`/`docker:stop` scripts — infra only.                                                   |
| `Dockerfile.Postgres`, `seed.sql`    | Dockerfile for Postgres image; seed.sql is **data content** (docs/plans for ingestion), not executable app SQL.                                     |

No application source in `applications/openthrottle` opens a Postgres connection; it is a compose/env/seed holder for the OT suite.

---

## 3. packages/openthrottle

**Summary:** The only package that contains direct Postgres access is **@openthrottle/nestjs-repositories**. It provides the TypeORM DataSource, entities, and repository services used by openthrottle-server. All other packages in `packages/openthrottle` (openthrottle-mcp, vscode-openthrottle, nodejs-graphql, react-router-\*, etc.) use GraphQL only and do not open Postgres connections.

### 3.1 @openthrottle/nestjs-repositories

This package is the shared repository layer for OpenThrottle Postgres. It is consumed by openthrottle-server; no other OpenThrottle app or package in this folder depends on it. It directly touches Postgres via TypeORM and the `pg` driver.

#### Connection / config

| File                                | Usage                                                                                                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/database.config.ts`            | Builds TypeORM DataSource options for OpenThrottle Postgres. Reads `POSTGRES_URL` or `POSTGRES_*` (POSTGRES_DB, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER); returns `postgresql://` URL and `type: 'postgres'`. Exports `getTypeOrmOptions()`. |
| `src/nestjs-repositories.module.ts` | Imports `TypeOrmModule.forRootAsync({ useFactory: getTypeOrmOptions })` — registers the single TypeORM connection to OpenThrottle Postgres.                                                                                                                         |

#### Postgres-specific helpers

| File                               | Usage                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/common/vector.transformer.ts` | ValueTransformer for pgvector `vector(1536)` columns. Serializes JS `number[]` to/from Postgres vector string format. Used by plan/task embedding entities. |

#### Entities (TypeORM → Postgres tables)

Each entity maps to a OpenThrottle Postgres table; TypeORM uses them for schema and queries.

| File                                                          | Table / usage                               |
| ------------------------------------------------------------- | ------------------------------------------- |
| `src/modules/commit-links/commit-link.entity.ts`              | `commit_links`                              |
| `src/modules/prompts/custom-prompt.entity.ts`                 | `custom_prompts`                            |
| `src/modules/daily-stats/daily-stat.entity.ts`                | `daily_stats`                               |
| `src/modules/notes/note.entity.ts`                            | `notes`                                     |
| `src/modules/plans/plan.entity.ts`                            | `plans`                                     |
| `src/modules/plan-embeddings/plan-embedding.entity.ts`        | `plan_embeddings` (uses vector.transformer) |
| `src/modules/plan-output-stream/plan-output-stream.entity.ts` | `plan_output_stream`                        |
| `src/modules/roles/permission.entity.ts`                      | `permissions`                               |
| `src/modules/roles/role.entity.ts`                            | `roles`                                     |
| `src/modules/projects/project.entity.ts`                      | `projects`                                  |
| `src/modules/subscriptions/subscription.entity.ts`            | `subscriptions`                             |
| `src/modules/tasks/task.entity.ts`                            | `tasks`                                     |
| `src/modules/task-embeddings/task-embedding.entity.ts`        | `task_embeddings` (uses vector.transformer) |
| `src/modules/users/user.entity.ts`                            | `users`                                     |

#### Services (TypeORM Repository access)

Each service injects `@InjectRepository(Entity)` and exposes `getRepository()` and/or uses `repository.find()`, `.save()`, `.create()`, etc. All are direct Postgres access via TypeORM.

| File                                                           | Usage                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/modules/commit-links/commit-links.service.ts`             | `InjectRepository(CommitLink)`, getRepository, repo find/save                   |
| `src/modules/prompts/custom-prompts.service.ts`                | `InjectRepository(CustomPrompt)`, getRepository                                 |
| `src/modules/daily-stats/daily-stats.service.ts`               | `InjectRepository(DailyStat)`, getRepository, repo queries                      |
| `src/modules/notes/notes.service.ts`                           | `InjectRepository(Note)`, getRepository                                         |
| `src/modules/plans/plans.service.ts`                           | `InjectRepository(Plan)`, getRepository                                         |
| `src/modules/plan-embeddings/plan-embeddings.service.ts`       | `InjectRepository(PlanEmbedding)`, getRepository                                |
| `src/modules/plan-output-stream/plan-output-stream.service.ts` | `InjectRepository(PlanOutputStreamChunk)`, getRepository                        |
| `src/modules/roles/roles.service.ts`                           | `InjectRepository(Role)`, `InjectRepository(User)`, repo find/save/delete/merge |
| `src/modules/roles/permissions.service.ts`                     | `InjectRepository(Permission)`, getRepository, find/create/save                 |
| `src/modules/projects/projects.service.ts`                     | `InjectRepository(Project)`, getRepository, find/save/merge                     |
| `src/modules/subscriptions/subscriptions.service.ts`           | `InjectRepository(Subscription)`, find/save/merge                               |
| `src/modules/tasks/tasks.service.ts`                           | `InjectRepository(Task)`, getRepository                                         |
| `src/modules/task-embeddings/task-embeddings.service.ts`       | `InjectRepository(TaskEmbedding)`, getRepository                                |
| `src/modules/users/users.service.ts`                           | `InjectRepository(User)`, getRepository, findOne/find/save/merge                |

#### DataLoaders (repository-backed)

| File                      | Usage                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/projects-loaders.ts` | Uses `PlansService.getRepository().find()`, `TasksService.getRepository().find()` for batched plan/task loading — indirect Postgres via repositories. |

#### Dependencies

| File           | Usage                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `package.json` | Direct dependencies: `pg`, `typeorm`, `@nestjs/typeorm` — these are the Postgres/TypeORM stack. |

### 3.2 Other packages in packages/openthrottle (no direct Postgres)

| Package                                                                                                                                                                                | Notes                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **@openthrottle/openthrottle-mcp**                                                                                                                                                     | Uses `@openthrottle/nodejs-graphql` only (GraphQL client). No pg/TypeORM. `src/utils/errors.ts` contains error copy "OpenThrottle Postgres is not configured" / "POSTGRES_URL" — user-facing message only, no DB connection. |
| **@openthrottle/vscode-openthrottle**                                                                                                                                                  | Uses `OpenThrottleApiClient` and `@openthrottle/nodejs-graphql` (GraphQL only). No direct Postgres.                                                                                                                          |
| **@openthrottle/nodejs-graphql**                                                                                                                                                       | GraphQL client utilities (executeGraphql, executeGraphqlWithAuth). No Postgres.                                                                                                                                              |
| **@openthrottle/react-router-graphql**, **react-router-auth**, **react-router-ui**, **react-router-utils**, **react-router-profiling**, **react-router-editor**, **react-router-chat** | GraphQL or UI only. No direct Postgres.                                                                                                                                                                                      |
| **@openthrottle/openthrottle-notifications**                                                                                                                                           | Not audited in this pass; if it only sends notifications via GraphQL or external APIs, it has no direct Postgres.                                                                                                            |

---

## 4. Recommendations (GraphQL-only path)

Goal: **all** Postgres access is limited to openthrottle-server; every other OpenThrottle app and package talks to OpenThrottle only via openthrottle-server GraphQL (and, where applicable, REST/WebSocket APIs exposed by the server).

### 4.1 Current state vs goal

| Layer                                                                                 | Current state                                                                                                             | Goal                                                                                                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **OT apps** (developer, admin, email, cms, website)                                   | Already GraphQL-only                                                                                                      | No change.                                                                                                                |
| **packages/openthrottle** (openthrottle-mcp, vscode, nodejs-graphql, react-router-\*) | Already GraphQL-only                                                                                                      | No change.                                                                                                                |
| **openthrottle-server**                                                               | Single gateway; uses TypeORM (nestjs-repositories) + openthrottle-server (semantic search) + doc-ingestion state (raw pg) | Keep as the **only** process that opens Postgres connections. Optionally consolidate to one connection story (see below). |
| **@openthrottle/nestjs-repositories**                                                 | Only consumed by openthrottle-server; provides TypeORM + pg                                                               | Remain server-only. Do not import from any other OT app or from openthrottle-mcp/vscode.                                  |

### 4.2 Recommendations

1. **Keep openthrottle-server as the single Postgres gateway**
   - All client apps and packages already use GraphQL (or server APIs). No new direct Postgres access in apps or in packages other than nestjs-repositories.
   - Enforce that **no** OpenThrottle app or package (other than openthrottle-server) adds a dependency on `@openthrottle/nestjs-repositories`, `pg`, or any OpenThrottle connection env (e.g. `POSTGRES_*` for connection purposes). openthrottle-mcp and vscode should only use `@openthrottle/nodejs-graphql` (or equivalent) against the server.

2. **Optional: consolidate connection paths inside openthrottle-server**
   - Today the server uses (a) TypeORM via nestjs-repositories, (b) openthrottle-server (`getPostgresConfig()` + raw pg/semantic search), and (c) doc-ingestion state (separate connection string + raw pg in `@tools/workflows/doc-ingestion`).
   - **Recommendation:** Prefer a single connection story where possible:
     - **Semantic search:** Consider moving `runSemanticSearch`, `embedQuery`, `getChunkById`, `listSources` (and plan-level semantic search) behind a small service that uses the same TypeORM DataSource or a shared pool, so openthrottle-server’s `getPostgresConfig()` is only used from one place (e.g. doc-ingestion or a single “openthrottle adapter” in the server). This reduces two config paths (POSTGRES*\* vs POSTGRES*\*) to one where feasible.
     - **Doc-ingestion state:** Either (A) expose doc-ingestion state via GraphQL (e.g. `getDocIngestionState`, `saveDocIngestionState`) and have the doc-ingestion processor call the server, so the server is the only one touching `doc_ingestion_state`, or (B) keep the current raw pg path but document it as a **server-side-only** exception: the processor runs inside the server’s process/worker and uses a connection string derived from the same env as the server. Option (A) is more aligned with “all interaction at the GraphQL layer”; option (B) is simpler if the processor must stay in tools/workflows and share no runtime with the server.

3. **Document and guard the boundary**
   - Add a short “Data access” section to the openthrottle-server README (or infra doc): “OpenThrottle Postgres is accessed only by openthrottle-server. All other OpenThrottle apps and packages use GraphQL (and server APIs). Direct Postgres touch points are audited in `docs/openthrottle/postgres-audit.md`.”
   - In CI or in a lint rule, consider disallowing imports of `@openthrottle/nestjs-repositories` or `pg` (for OpenThrottle) in any project other than openthrottle-server and nestjs-repositories itself.

4. **No change for OT apps and GraphQL-only packages**
   - openthrottle-developer, openthrottle-admin, openthrottle-email, openthrottle-website, openthrottle-mcp, vscode-openthrottle, nodejs-graphql, and react-router-\* packages require no code changes for this goal; they already use GraphQL only.

### 4.3 Summary

- **Touch points:** All direct Postgres access is either (1) inside openthrottle-server (TypeORM, openthrottle-server semantic search, doc-ingestion state) or (2) inside `@openthrottle/nestjs-repositories` (consumed only by openthrottle-server). No OT app or other package opens a Postgres connection.
- **Recommendation:** Keep this boundary. Optionally consolidate the server’s connection paths (TypeORM + openthrottle-server + doc-ingestion) for simplicity and a single config story; and optionally expose doc-ingestion state via GraphQL so the processor goes through the server. Document the boundary and consider guarding it in CI so no new direct Postgres access is introduced outside the server.
