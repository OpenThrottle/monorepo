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
  last-reviewed: '2026-11-22'
  # A convention reference with no finish line of its own: it reports no outcome, on purpose.
  outcome-telemetry: 'none'
  version: '1.3.0'
---

# OpenThrottle stack (server, data, developer app, MCP)

Scaffolding is `ot-generators`, SQL migrations `ot-postgres`, plans and tasks `ot-plans`, graph and
targets `nx-workspace`. The OT Loop job and its BullMQ wiring: [docs/workflows/ot-loop-job.md](https://github.com/openthrottle/monorepo/blob/main/docs/workflows/ot-loop-job.md).

## NestJS GraphQL (`openthrottle-server`)

- **Backwards-compatible schema:** when changing `.entity` or `*.object.ts` files, never remove a field or change its type on an existing ObjectType; mark it `@deprecated(reason: "...")` instead.
- **Resolver return types:** there are no `Result()` / `PaginatedResult()` / `ListResult()` factories (they lived in the never-ported `@openthrottle/nestjs-core`). Return a hand-written `@ObjectType()` from the feature's `*.object.ts`, never a raw entity: the class for one item, `[Thing]` for a plain list, or a `<Thing>ListResult` envelope when the list needs metadata. References: `projects/project-plans-page.object.ts`, `work-ledger/work-ledger.object.ts`. The `@tools/generators:nestjs` `graphql-service` / `simple-service` templates match this shape.
- **Offset-paged lists:** envelope `extends OffsetPageObject` (`@openthrottle/nestjs-graphql`) and declares typed `items`; input `extends OffsetPaginationInput`; the resolver calls `assertPagination(input, { max })` (rejects a sent out-of-range value). The repository clamps with `resolvePagination` / `paginate` (`@openthrottle/nestjs-postgres`) and returns `OffsetPage<T>`. Default 25, max 100, per-call override allowed. Exceptions: cursor-paged lists, `activityByDate*`, `search`, plain `[Thing]` lists.
- **Positions within a parent** (tasks in a plan, plans in a project): use the `nestjs-postgres` sort-order helpers with the table's `SortOrderScope`; never hand-write a renumber.
- **Data access:** entities, repositories and the default DataSource (`getOpenThrottleTypeOrmOptions()`) live in `@openthrottle/nestjs-repositories-server`; a new table's entity also joins `OPENTHROTTLE_ENTITIES`.
- **Errors a client must read:** a plain `NotFoundException` / `ConflictException` reaches the client as `NOT_FOUND` / `CONFLICT` with its message. For any other code, or extra fields, throw `new GraphQLError(msg, { extensions: { code, ... } })` from the service (see `createPlanScheduleConflictError` in `plan-enqueue.utils.ts`).
- **Testing (NestJS tier):** test every new resolver, service and repository method; the test sits next to its file (`<folder>.<kind>.test.ts`) with every NestJS provider mocked in `beforeEach`. Use the repository's model factories and the service's entity factories where they exist.

### Schema change

Consumers generate from the committed `applications/openthrottle-server/schema.gql` (via `@openthrottle/graphql-codegen`'s `defineCodegen`), and CI fails on drift. After changing GraphQL types, resolvers or documents:

1. Run `pnpm nx run openthrottle-server:graphql-schema:write` (no Postgres, Redis or running server needed). It is the only producer of the committed `applications/openthrottle-server/schema.gql`: booting the server keeps the schema in memory and never writes the file. `dev` on a codegen consumer runs the equivalent `graphql-schema-write` first, so a new field plus a document selecting it needs no manual step there. It works in one pass even when a server-side client (`openthrottle-mcp`) already selects or reads the new field: tsc builds never run codegen and the client builds in the server graph are emit-only, so the server builds against the stale generated output and writes the schema that step 2 regenerates from. Do not reach for `--excludeTaskDependencies`.
2. `pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel`
3. Commit the app `schema.gql` and all `__generated__` output.

### Gotchas

- **DI fails at boot while lint, typecheck and tests stay green** → an injected class was imported
  with `import type`. SWC compiles the server with `decoratorMetadata: true` (`.swcrc`), so
  constructor injection needs the runtime import even though `tsconfig.base.json` says
  `emitDecoratorMetadata: false`. Keep injected classes as value imports; the ESLint override in
  `tools/dotfiles/src/index.ts` that declares `emitDecoratorMetadata: true` exists for this reason,
  so do not "simplify" it to match the tsconfig.
- **A multi-key TypeORM `find({ order: { a, b } })` sorts in the wrong order** → it sorts by key
  insertion order, and the enforced alphabetize-keys autofix reorders the keys. Mock tests echo the
  same object and pass. When precedence across keys matters, use
  `createQueryBuilder().orderBy(...).addOrderBy(...)`, and check the order against a real database.
- **CI `gates` fails on `monorepo:check-side-effects --strict` after adding an enum** → a new
  `*.enum.ts`, or any file with module-scope `registerEnumType`, must be listed in the server
  `package.json` `sideEffects` array. `pnpm exec tsx scripts/check-side-effects.ts --strict` prints
  the value to set. Local `nx affected -t lint,typecheck,test` does not run it.
- **A client enum comparison never matches** → codegen emits GraphQL enums as `as const` objects
  with PascalCase keys (`TimelineMarkerKind.Grilling`, value `'GRILLING'`), while the NestJS enum
  uses `GRILLING`. Copy the spelling from an existing client consumer, never from the server enum,
  and test the negative case.
- **`z.infer` of an MCP tool's parameter schema is `unknown`** → the generated zod schemas in
  `packages/openthrottle-mcp` map through `z.ZodType<T[K], any, T[K]>`. Type helpers against the
  generated GraphQL input type (`CreatePlanInput` from `../__generated__/graphql.js`) instead.
- **Never set `extensions.http.status` on a GraphQLError** → Apollo uses it as the HTTP status, and
  clients then treat the error as a transport failure.

## Everything else

| Area                                     | Where the conventions live                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data, embeddings, ingest (`databases/`)  | [databases/openthrottle/README.md](https://github.com/openthrottle/monorepo/blob/main/databases/openthrottle/README.md). Embeddings are local and in-process by default (root AGENTS.md § Local embeddings). `pnpm run database:import-docs` / `database:import-agent-assets` write content rows; the server, not the script, embeds them.                                                                                                                                                                                                                                                                        |
| Developer app (`openthrottle-developer`) | New UI through the `react-router` generator with `--application=openthrottle-developer`. Run `pnpm nx run openthrottle-developer:codegen-graphql` after `schema.gql` changes. Follow the existing `settings.*` / `plans.*` route patterns. In `react-router-*` apps the UI rules in root AGENTS.md § Code style (shadcn components, Tailwind tokens, `GlobalPopover`) override the vendored `frontend-design` skill. Env defaults: `.env.default`; full stack: [run-openthrottle-server-developer.md](https://github.com/openthrottle/monorepo/blob/main/docs/openthrottle/run-openthrottle-server-developer.md). |
| `@openthrottle/openthrottle-mcp`         | MCP tools call openthrottle-server GraphQL only — no DB driver. Add the GraphQL operation on the server first; a new input field becomes a tool parameter through codegen, and only the tool description is hand-written. Env and smoke checks: `packages/openthrottle-mcp/docs/verification-environment.md`; tokens: `packages/openthrottle-mcp/docs/AUTH.md`; env probe: `scripts/verify-openthrottle-mcp-env.ts`.                                                                                                                                                                                              |
