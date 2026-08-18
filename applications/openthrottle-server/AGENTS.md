# openthrottle-server — agent notes

The NestJS code-first GraphQL API and the schema owner for the whole platform. See
[README.md](./README.md) for env vars, the CLS request-user model, and Stripe webhook wiring.

**Consumed by:** no workspace package lists it as a dependency; every client (the React Router
apps, `packages/openthrottle-mcp`) consumes its schema through the committed
`applications/openthrottle-server/schema.gql` plus codegen.

## Commands

- `pnpm nx run openthrottle-server:dev` — watch mode (`nest start`). Needs Postgres + Redis up
  (`pnpm run database:start`) and `.env` (copy `.env.default`). GraphQL endpoint is `/graphql`.
- `pnpm nx run openthrottle-server:dev-debug` — dev with the Node inspector on `0.0.0.0:9229`
  (what the compose dev profile attaches to).
- `pnpm nx run openthrottle-server:start` — no-watch start; builds dependency packages first.
- `pnpm nx run openthrottle-server:docker-build` — builds from root `Dockerfile.NestJS`
  (monorepo context); expects `GITHUB_TOKEN` in the environment.
- The single `typecheck` target type-checks source and test files here; `test` is plain Vitest and does not depend on any
  `__generated__` output (the server is code-first, not a codegen consumer).

## Layout

- `src/app.module.ts` — single registration point: every GraphQL feature module, queue module,
  and `@openthrottle/nestjs-*` platform module. New features get wired here.
- `src/graphql/<feature>/` — one folder per schema area (resolver, service, `*.object.ts`,
  `*.input.ts`, module). Example with tests to copy: `src/graphql/queue-job-logs/` (the
  queue-job log tail API; design doc in [docs/log-tail-api-design.md](./docs/log-tail-api-design.md)).
- `src/queues/` — BullMQ queue modules (plans, code-index, daily-stats, database-backup,
  doc-ingestion, agentic-test) plus `bullmq-run-output.module.ts`.
- `src/guards/` + `src/auth/` — `GlobalAuthGuard` (service-account `ot_sa_…` tokens first, then
  JWT) and the CLS auth hook; registered as `APP_GUARD`.
- `src/main.ts` — bootstrap: `rawBody: true`, CORS from `@openthrottle/nestjs-rbac`, shutdown
  hooks. `src/load-env.ts` runs before anything else.
- `docs/` — per-feature design docs; read the matching one before touching that area.

## Invariants & gotchas

- **Schema regeneration:** `autoSchemaFile: 'schema.gql'` (default in
  `@openthrottle/nestjs-graphql`) is cwd-relative, and the Nx `dev`/`start` targets run with
  `cwd` at the project root — so booting the server writes the app copy
  `applications/openthrottle-server/schema.gql`. That is the single committed schema file;
  every consumer reads it via `@openthrottle/graphql-codegen`'s `defineCodegen`. Boot, then run
  consumer codegen (`nx affected --target=codegen-graphql,codegen-react-router`) and commit
  both. (There is no repo-root `schema.gql` and no sync gate — both were retired.)
- Schema evolution (never remove/change existing fields; `@deprecated(reason)`) — root CLAUDE.md.
- TypeORM entities live in `packages/nestjs-repositories`, not here; each entity's JSDoc names
  the `databases/migrations/` files it matches. A schema change means a new SQL migration in
  `databases/migrations/` plus the matching entity edit — this app has no TypeORM migrations.
- `rawBody: true` in `main.ts` is required for Stripe webhook signature verification
  (`req.rawBody`); don't drop it when touching bootstrap.
- The custom `useBodyParser('json', { type: [...] })` in `main.ts` (CSP report parsing) is
  the ONLY json parser once registered — `application/json` must stay in its `type` list or
  `/graphql` POST bodies 400. The comment above the call explains the Nest dedupe mechanics.
- Subscriptions returning the `NotificationEvent` interface leave concrete types orphaned —
  they must stay registered via `buildSchemaOptions.orphanedTypes` in `app.module.ts`.
- graphql-ws requests have no `req`: the GraphQL context puts the validated user on `userId`
  for ws and on `req` for HTTP. Guards/resolvers must handle both shapes.
- Bull Board sits behind a single static basic-auth credential — it stays disabled in
  production (`isBullBoardEnabled()` gate in `app.module.ts`).
- **Agent-CLI install/update** (`graphql/agent-setup/`): `installAgentCli`/`updateAgentCli` run
  the registry-defined `curl | shell` installers on the server host — RCE-on-demand, so they are
  double-gated: the `SETTINGS_WRITE` permission AND the default-OFF `OT_AGENT_CLI_INSTALL_ENABLED`
  env flag (`readAgentCliInstallEnabledFromConfig`). Leave the flag unset in hosted/multi-tenant
  deploys — this is a **local-developer-machine** feature. The mutation takes only a `backend` id
  validated against `ALL_DRIVERS`; never a URL/command from the client. Output streams over the
  `agentSetupChunkAdded` subscription; a successful run invalidates the shared
  `AgentDiscoveryService` cache. CLI auth/login is out of scope (install ≠ authenticated).

## Don't

- Don't hand-edit `schema.gql` — it's generated; boot the server to regenerate.
- Don't add a global prefix or a validation pipe casually; webhook routing and GraphQL both
  depend on the current bootstrap shape (see comments in `src/main.ts`).

## Pointers

- [README.md](./README.md) — env table, CLS/auth details, Stripe webhook endpoints.
- [docs/](./docs/) — feature design docs (log tail, workspace settings, agent conversations).
- [../../databases/README.md](../../databases/README.md) — the database this app reads/writes.
