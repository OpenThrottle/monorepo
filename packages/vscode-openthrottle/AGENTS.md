# vscode-openthrottle — agent notes

The **deployable VS Code / Cursor extension** for OpenThrottle plans and tasks, backed by
`openthrottle-server` GraphQL. One codebase targets both editors. All extension code —
activation, commands, secret-storage auth, tree views, and webviews — lives here.

**Consumed by:** nothing — it is a leaf, packaged into a `.vsix` and sideloaded.

## Commands

- `pnpm nx run vscode-openthrottle:codegen-graphql` — regenerate `src/__generated__/` from
  `src/queries.graphql` against the root schema.
- `pnpm nx run vscode-openthrottle:build` — noop that just runs `codegen-graphql`; the real
  TS compile is `project:typescript` (`@nx/js:tsc`).
- `pnpm nx run vscode-openthrottle:project:build` — compile then package `openthrottle.vsix`
  via `vsce`. `project:install` then sideloads it into Cursor.

Note the Nx project name is `vscode-openthrottle` (unscoped) — the README's
`pnpm nx build @openthrottle/vscode-openthrottle` and `packages/openthrottle/...` paths are
stale; the package lives at `packages/vscode-openthrottle/`.

## Layout

- `src/index.ts` — extension `activate`/`deactivate`; `src/commands/*`, `src/trees/*`,
  `src/views/*` — the contributed commands, sidebar trees, and detail webview.
- `src/api-client.ts` / `src/auth.ts` / `src/config.ts` — GraphQL client, secret-storage
  auth, and `openthrottle.apiBaseUrl` (default `http://localhost:6021`) config.
- `src/queries.graphql` + `src/__generated__/` — codegen source and output.

## Invariants & gotchas

- Built package: `main` → `./dist/src/index.js`; ships `dist/`. The extension host loads
  the compiled output, not `src`.
- `src/__generated__/` is codegen output — edit `src/queries.graphql`, run
  `codegen-graphql`, never hand-edit generated files (see [../AGENTS.md](../AGENTS.md)).
- Extension contribution metadata (commands, views, `viewsContainers`, configuration) lives
  in this `package.json`, not source. Keep command ids in sync with `src/commands/`.

## Don't

- Don't put editor-agnostic helpers here — those belong in the sibling logic library
  [`@openthrottle/openthrottle-vscode`](../openthrottle-vscode/). Keep the split intact.

## Pointers

- [README.md](./README.md) — sideload / `.vsix` install steps.
- [docs/INTEGRATION.md](./docs/INTEGRATION.md), [docs/UI-DESIGN.md](./docs/UI-DESIGN.md).
