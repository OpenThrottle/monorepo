# tools/ — agent notes

Family-shared notes for everything under `tools/`. Per-project deltas live in each tool's own `AGENTS.md`; monorepo-wide rules live in the root [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md).

## What lives here

Four Nx projects plus one plain config directory:

- [`generators/`](./generators/) — `@tools/generators`: Nx generators for scaffolding (`react`, `react-router`, `nestjs`, `package`, `folders`); real `build` target, generator registry in `generators.json`, file templates under `src/generators/<name>/files/`. Canonical agent usage doc: [docs/tools/templates/AGENT_USAGE.md](../docs/tools/templates/AGENT_USAGE.md).
- [`workflows/`](./workflows/) — `@tools/workflows`: the Ralph CLI (bins `workflow-ralph`, `workflow-link-merge`, `workflow-lighthouse`). **DEPRECATED** — being retired in favor of `@openthrottle/nestjs-agentic-workflow`, `@openthrottle/nestjs-worktrees`, and `@openthrottle/openthrottle-agentic-workflow`; exports remain only as re-export shims, so do **not** add new imports from this package (see the README's top banner; OT plan `62c58119-54c3-4b3e-b57c-bdf921e247cc`).
- [`dotfiles/`](./dotfiles/) — `@tools/dotfiles`: shared ESLint/Prettier/Vite/Vitest config. Source-first: `main` → `./src/index.ts`, no `build` target (only `lint`, `test`, `typecheck`, `typecheck-tests`).
- [`ollama-proxy/`](./ollama-proxy/) — `@tools/ollama-proxy`: local-dev HTTP proxy that accepts OpenAI-style requests (e.g. from Cursor) and rewrites model names for Ollama; `ollama-proxy` bin, `serve` and `e2e` targets, own `.env.default`.
- [`caddy/`](./caddy/) — **not an Nx project** (no `package.json`): Caddyfiles for the local reverse proxy in front of server/developer/Ollama (`Caddyfile` for local domains, `Caddyfile.path-based` variant). Service/hostname map: [docs/monorepo/local-services-and-ports.md](../docs/monorepo/local-services-and-ports.md).
- [`nx-plugins/`](./nx-plugins/) — **not an Nx project**: single-file local Nx plugins registered in root `nx.json` `plugins`. `react-router-typecheck.ts` infers the real `typecheck` target for the React Router apps (the `@nx/react/router-plugin` one is renamed to `__NOT_USED__typecheck`).

## Gotchas

- `tools/workflows/README.md` § "Which path runs when" is the single canonical decision table for the three Ralph execution surfaces (CLI, queue worker, in-process orchestrator) — read it before touching Ralph plumbing, even though the package is deprecated.
- Generator file templates are also the source of package README conventions; changing scaffold output means editing `tools/generators/src/generators/<name>/files/`, not generated projects.
