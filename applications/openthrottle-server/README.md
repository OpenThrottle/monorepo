# openthrottle-server

NestJS backend for the OpenThrottle platform. Exposes a GraphQL API for plans, tasks, embeddings, commit links, activity, and related resources. Uses the OpenThrottle Postgres database (plans, tasks, pgvector embeddings) and Redis (BullMQ queues, GraphQL response cache).

## Tech stack

- **NestJS** – API framework
- **GraphQL** – Apollo with code-first schema, JWT auth, RBAC, response caching
- **OpenThrottle** – Postgres database (`databases/`): plans, tasks, plan/task embeddings, commit links, plan output stream, notes, documentation embeddings
- **Redis** – BullMQ (plans, daily-stats, doc-ingestion, database-backup queues) and GraphQL cache
- **Socket.IO** – Real-time notifications via `@openthrottle/nestjs-websockets`

## Prerequisites

- Node.js ≥ 22
- pnpm (monorepo root)
- **Postgres** – OpenThrottle DB; see [databases/README.md](../../databases/README.md) for setup (e.g. `docker compose up -d openthrottle-postgres`, then `pnpm run database:migrate`)
- **Redis** – For BullMQ and GraphQL cache (e.g. from same compose: `docker compose up -d openthrottle-redis` if present, or local Redis on default port)

## Environment

Copy `.env.default` to `.env` and adjust. Key variables:

| Variable                           | Purpose                                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                             | HTTP port (default `6021`)                                                                                                   |
| `APP_URL`                          | Base URL (e.g. `http://localhost:6021`)                                                                                      |
| `JWT_SECRET`                       | Secret for JWT signing/verification                                                                                          |
| `POSTGRES_*` / `POSTGRES_URL`      | Postgres connection ([README](../../databases/README.md) uses `POSTGRES_*`; this app uses `POSTGRES_*` as in `.env.default`) |
| `REDIS_HOST`, `REDIS_PORT`         | Redis for BullMQ and GraphQL cache                                                                                           |
| `CORS_ORIGINS`, `CORS_CREDENTIALS` | Allowed frontend origins (e.g. openthrottle-developer, localhost)                                                            |
| `GITHUB_TOKEN`                     | Optional; for GitHub API (e.g. listing PRs)                                                                                  |
| `BULLMQ_BOARD_*`                   | BullMQ Board admin credentials                                                                                               |
| `WORKSPACE_ROOT`                   | Monorepo root when the API is not started from the repo (spawns, scheduled backup); see doc below                            |
| `DATABASE_BACKUP_CRON`             | Optional; enables daily BullMQ backup (`pnpm run database:backup`).                                                          |
| `DATABASE_BACKUP_TZ`               | Optional IANA timezone for backup cron (default UTC)                                                                         |
| `DATABASE_BACKUP_ENABLED`          | Optional kill switch when cron is set (default true)                                                                         |
| `DATABASE_BACKUP_JOB_TIMEOUT_MS`   | Optional BullMQ job timeout for one backup run (default `1800000`, 30 min)                                                   |
| `STRIPE_SECRET_KEY`                | Stripe API secret (`sk_…`); required for checkout and webhook verification                                                   |
| `STRIPE_WEBHOOK_SECRET`            | Stripe webhook signing secret (`whsec_…`); set when webhooks are enabled                                                     |

See `.env.default` for full list and comments.

## Run

From monorepo root:

```bash
# Development (watch mode)
pnpm nx run openthrottle-server:dev

# Production-style start
pnpm nx run openthrottle-server:start
```

From the app directory:

```bash
cd applications/openthrottle-server
pnpm exec nx run openthrottle-server:dev   # or: nest start --path ./tsconfig.app.json --watch
```

GraphQL endpoint: `http://localhost:6021/graphql` (or the configured `PORT`). Health and metrics are available via the app’s HTTP routes (see `HealthModule`, `MetricsModule`).

**Stripe webhooks:** `main.ts` uses `rawBody: true` so the HTTP webhook route can verify signatures. Configure the Stripe Dashboard to **`POST {APP_URL}/webhooks/stripe`** (no global prefix in this app; see `@openthrottle/nestjs-stripe` README if you add one). The GraphQL mutation `processStripeWebhook` is also available (base64 raw body + signature) for gateway-style integrations; it is marked public for JWT (`@SetMetadata` aligned with `GlobalAuthGuard`). CORS follows `CORS_ORIGINS` like other routes. The HTTP route remains the supported primary endpoint for Dashboard delivery; GraphQL is an alternative surface that shares the same handler service.

## Request-scoped user (CLS)

The app uses `@openthrottle/nestjs-modules` **Global CLS** (`GlobalClsModule` / `GlobalClsService`) so each HTTP or GraphQL request has an isolated store. The store’s `user` field holds a [`GlobalClsUser`](../../packages/mattscholta/nestjs-modules/src/modules/global-cls/global-cls-user.ts) snapshot after authentication.

- **Protected routes:** `GlobalAuthGuard` tries `Bearer ot_sa_…` service-account tokens first (`ServiceAccountAuthService`), otherwise delegates to `GqlJwtAuthGuard` for JWT. It then calls `GlobalClsAuthHook.populateFromPrincipal` with a normalized `AuthPrincipal`. The hook loads the user or service account plus permissions and roles from `UsersService` / `ServiceAccountsService` / `RolesService`, or falls back to a minimal CLS mapping.
- **Public routes** (`@Public()`): Never 401. With no `Authorization` header the guard returns early and CLS `user` is unset. When `Authorization` is present, the guard **soft-auths** (service-account bearer first, then JWT via `tryAuthenticate`): success populates CLS like a protected route; failure leaves the request anonymous. Resolvers that must work unauthenticated should treat `globalCls.get('user')` / `@CurrentUser()` as optional.

**Reading the current user in code:** inject `GlobalClsService` and use `this.globalCls.get('user')` (optional) or `this.globalCls.has('user')`. Types live in `@openthrottle/nestjs-modules` (`GlobalClsUser`).

## Build

```bash
pnpm nx run openthrottle-server:build
```

Output under `applications/openthrottle-server/build`. For Docker image (built from monorepo root), see the root Dockerfile referenced in `package.json` (`docker-build` target).

## LangGraph Studio (optional)

This app can host LangGraph agents. For local LangGraph Studio:

```bash
cd applications/openthrottle-server

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Run LangGraph dev server (uses langgraph.json and .env)
npx @langchain/langgraph-cli dev
# or: pnpm run langgraph

# Deactivate when done
deactivate
```

## Related

- **OpenThrottle DB** – [databases/README.md](../../databases/README.md) (schema, migrations, ingest, embeddings)
- **MCP (openthrottle-mcp)** – Talks to this server via GraphQL only; see `packages/openthrottle-mcp` and `.cursor/rules/commands/openthrottle.mdc`
- **OpenThrottle docs** – `docs/openthrottle/`
