# applications/ — agent notes

Family-shared notes for everything under `applications/`. Per-project deltas live in each app's own `AGENTS.md`; monorepo-wide rules live in the root [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md).

## What lives here

- Four React Router v8 + Vite apps: `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`, `openthrottle-website`.
- One NestJS app: `openthrottle-server` — the only backend, owner of the code-first GraphQL schema (`schema.gql`).
- One Storybook host: `openthrottle-workbench` — Storybook 10 for `@openthrottle/react-router-shadcn`. **Not** a React Router app; `production:false`, local dev tool only, never deployed. See [`openthrottle-workbench/AGENTS.md`](./openthrottle-workbench/AGENTS.md).
- [`openthrottle/`](./openthrottle/) is **not an Nx project** (no `package.json`): a standalone consumer-install `docker-compose.yml` + Dockerfiles running published images. Local dev Postgres/Redis come from the **root** `docker-compose.yml` via `pnpm run database:start`, not this directory.

## Ports and env

Every app keeps its own `.env` + `.env.default` in its project root. Local port map (from `.env.default` files): developer 6020, server 6021, admin 6022 (6023 is reserved for a CMS app), email 6024, website 6025; Postgres 6010, Redis 6011. Workbench (Storybook) runs on 6006, outside the 60xx block — see [`openthrottle-workbench/AGENTS.md`](./openthrottle-workbench/AGENTS.md).

## React Router app family conventions

- `dev`/`build`/`start` targets are inferred by `@nx/react/router-plugin` (see root `nx.json`), so they do not appear in an app's `package.json` `nx.targets`. The real `typecheck` target is explicit per app; the plugin's inferred one is renamed `__NOT_USED__typecheck`.
- Layout: `app/routes/` route modules (registered in `app/routes.ts`) stay thin and delegate to `app/routing/<area>/` feature folders (`components/`, `data/`, `hooks/`, `utils/`), imported via the `~/*` → `app/*` tsconfig alias. Component vs data file boundaries: [`.agents/rules/coding/component-data-boundaries.mdc`](../.agents/rules/coding/component-data-boundaries.mdc).
- `app/__generated__/` is codegen output from the per-app `codegen-graphql` / `codegen-react-router` targets — regenerate, never hand-edit. Fresh worktrees need codegen to run before Vitest suites can even collect.
- `tests/setup.ts` is the single shared `setupReactRouterTest` call (root CLAUDE.md); **app-specific** jsdom shims stay local in that file rather than moving into `@openthrottle/react-router-testing` (see the developer app's WebGL/`visualViewport` shims).

## E2E

Apps with `tests/e2e/` run Maestro flows via `pnpm nx run <app>:test-e2e` (configurations: `smoke`, `full`, `watch`, `record`, `studio`; cwd is `tests/e2e/`). Run E2E against a **production build** (`build`, then `NODE_ENV=production react-router-serve ./build/server/index.js`), not the Vite dev server. `react-router-serve` does not auto-load env files — source `.env.default` first. Canonical write-up: [`openthrottle-developer/tests/e2e/README.md`](./openthrottle-developer/tests/e2e/README.md).

## Server/schema gotcha that affects everyone

`autoSchemaFile` is the cwd-relative string `'schema.gql'` (set in `packages/nestjs-graphql`), and the `openthrottle-server` `dev`/`start` targets run with `cwd` at the project root, so booting `pnpm nx run openthrottle-server:dev` writes `applications/openthrottle-server/schema.gql`. That is the single committed schema; every consumer reads it via `@openthrottle/graphql-codegen`'s `defineCodegen`. Boot, then run consumer codegen and commit both.
