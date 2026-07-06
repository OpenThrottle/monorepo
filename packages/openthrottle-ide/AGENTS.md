# @openthrottle/openthrottle-ide — agent notes

Node-only headless code-intelligence engine for agent-driven IDE experiences: gitignore-aware file
enumeration + hashing, ripgrep text search, ts-morph symbols (definitions/references/exports),
watch + incremental sync, and pgvector semantic search over arbitrary workspaces.

**Consumed by:** `openthrottle-developer` (runtime, confined to
`app/routing/ide/data/ide-engine.server.ts`), `@openthrottle/react-router-ide` (**types only**),
`@openthrottle/nestjs-vector-search`.

## Layout

- `src/config/workspace-config.ts` — `WorkspaceConfig`, `resolveWorkspaceConfig`, and
  `resolveInsideRoot` / `isRealPathInsideRoot` (the path-containment boundary).
- `src/data/` — the tiers: `workspace.ts`/`search.ts` (enumeration + ripgrep), `symbols.ts` +
  `ts-project.ts` (ts-morph), `watch.ts` (chokidar + snapshot diff), `chunk.ts`/`embeddings.ts`/
  `semantic.ts` (pgvector semantic search).
- `src/utils/` — `ripgrep.ts` (bundled `@vscode/ripgrep` binary), `hash.ts`.

## Invariants & gotchas

- **This is the engine-owner side of a server/client boundary.** Runtime exports pull Node-only
  deps (`@vscode/ripgrep`, `chokidar`, `ts-morph`) into any bundle. Types are safe to export
  anywhere; values are server-only. UI consumers enforce this — `react-router-ide` allows only
  `import type` (ESLint rule + `engine-boundary.test.ts`), and the developer app reaches runtime
  exports only through its `*.server.ts` adapter. Never add browser-targeting code here.
- **Path containment is the P0 contract**: callers pass untrusted `path` arguments. Any new
  path-taking function must route through `resolveInsideRoot` (and the realpath check when
  `followSymlinks` is on) — never raw `node:path` `resolve`/join on caller input. See the README
  threat-model section.
- No `process.env` reads: `createEmbeddingsProvider` takes a fully-resolved `EmbeddingsConfig`;
  config resolution is the caller's job. `EmbeddingsProvider` and `VectorStore` are injectable
  seams — tests run against in-memory implementations, no live model or DB.
- The pgvector `VectorStore` talks to Postgres **directly** by design — not via
  `openthrottle-server` GraphQL and not via `openthrottle-mcp` (which stays GraphQL-only).
- No Nx `build` target (`__build`/`__build-package` placeholders — see [../AGENTS.md](../AGENTS.md)),
  but top-level `exports` map to `dist/` for server-side consumers; keep that map intact.

## Pointers

- [README.md](./README.md) — layer walkthrough, threat model, usage examples.
