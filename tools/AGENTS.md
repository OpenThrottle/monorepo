# tools/ — agent notes

Family-shared notes for everything under `tools/`. Per-project deltas live in each tool's own `AGENTS.md`; monorepo-wide rules live in the root [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md).

## What lives here

Four Nx projects plus two plain directories (`caddy/`, `nx-plugins/`):

- [`generators/`](./generators/) — `@tools/generators`: Nx generators for scaffolding (`react`, `react-router`, `nestjs`, `package`, `folders`); real `build` target, generator registry in `generators.json`, file templates under `src/generators/<name>/files/`. Canonical agent usage doc: [docs/tools/templates/AGENT_USAGE.md](../docs/tools/templates/AGENT_USAGE.md).
- [`dotfiles/`](./dotfiles/) — `@tools/dotfiles`: shared ESLint/Prettier/Vite/Vitest config. Source-first: `main` → `./src/index.ts`, no `build` target (only `lint`, `test`, `typecheck`).
- [`ollama-proxy/`](./ollama-proxy/) — `@tools/ollama-proxy`: local-dev HTTP proxy that accepts OpenAI-style requests (e.g. from Cursor) and rewrites model names for Ollama; `ollama-proxy` bin, `serve` and `e2e` targets, own `.env.default`.
- [`ot-telemetry/`](./ot-telemetry/) — `@tools/ot-telemetry`: local, read-only OpenThrottle usage report (`report.json` + `report.md`) from the local Postgres; `report` target (root alias `pnpm run telemetry:report`). Source-first, no `build` target. Aggregate-only by default — a sentinel test asserts no free-text column reaches either output, so keep new metrics to counts and fixed-vocabulary labels.
- [`caddy/`](./caddy/) — **not an Nx project** (no `package.json`): Caddyfiles for the local reverse proxy in front of server/developer/Ollama (`Caddyfile` for local domains, `Caddyfile.path-based` variant). Service/hostname map: [docs/monorepo/local-services-and-ports.md](../docs/monorepo/local-services-and-ports.md).
- [`nx-plugins/`](./nx-plugins/) — **not an Nx project**: single-file local Nx plugins registered in root `nx.json` `plugins`. `react-router-typecheck.ts` infers the real `typecheck` target for the React Router apps (the `@nx/react/router-plugin` one is renamed to `__NOT_USED__typecheck`).

## Gotchas

- Generator file templates are also the source of package README conventions; changing scaffold output means editing `tools/generators/src/generators/<name>/files/`, not generated projects.
