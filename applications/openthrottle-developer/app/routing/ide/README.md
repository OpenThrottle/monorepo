# `/ide` route — code-intelligence demo

Wires the headless [`@openthrottle/openthrottle-ide`](../../../../../packages/openthrottle-ide) engine into a UI built from [`@openthrottle/react-router-ide`](../../../../../packages/react-router-ide).

## Architecture

- **Engine is server-only.** All engine calls live in `data/ide-engine.server.ts`, dynamically `import()`-ed inside loaders/resource routes. Its `.server.ts` suffix keeps it out of the client bundle (verified: the client build contains no `ts-morph`/ripgrep/engine runtime; the engine bundles only under `build/server/`).
- **Root from a registered repository.** The loader resolves the workspace root from the selected `WorkspaceLocalRepository.filesystemPath` (via the `getWorkspaceSettings` GraphQL query + a `?repositoryId=` param). No monorepo-root fallback — selection is required.
- **Cost-tiered:**
  - Page loader (`ide._index.tsx`) runs only the cheap ripgrep tier: `listFilesVM` + `searchVM` (when `?q=`).
  - `ide.symbols.tsx` (resource route) runs the lazy ts-morph `exportsVM` when the Symbols tab opens.
  - `ide.symbol.tsx` (resource route) runs `symbolTargetVM` for a clicked symbol's definition + references (`useSymbolDetails` fetcher).
  - `ide.files.tsx` (resource route, `/ide/files?repositoryId=&q=`) runs the cheap `listFilesVM` tier for the chat composer's `@`-mention file picker. Same secure resolution as the rest of `/ide`: the repository is resolved from the **user-scoped** `getWorkspaceSettings` (an unowned/unknown `repositoryId` → 400), the server-stored `filesystemPath` is bridged via `toContainerPath`, and `listFilesVM`→`listFiles` inherits gitignore scoping + the `filterRealPathsInsideRoot` symlink-escape guard — a client path is never trusted. Consumed by `~/routing/home/hooks/useFileMentionProvider`, which fetches the listing once per repository and fuzzy-filters client-side.
  - Semantic tab is **gated** (the components render; real data is a follow-up — see below).

## How to view it

```bash
pnpm nx run openthrottle-developer:dev   # or :build then serve
```

Then:

1. Open **`/settings/workspace`** and register a local repository (a `filesystemPath` on the server host — e.g. this monorepo's absolute path).
2. Open **`/ide`** and pick that repository in the selector (sets `?repositoryId=`).
3. **Files & Search** — type in the palette to filter files; submit the search box (`?q=`) for ripgrep matches.
4. **Symbols** — opening the tab lists exports; click a symbol for its definition + references.
5. **Semantic** — shows the gated "index unavailable" state until the follow-up ships.

## Follow-ups

- **Semantic data wiring** — plan `e4157593-529f-4d55-8854-da71f4965d93` (server-side via GraphQL; depends on the `code_embeddings` pgvector migration).
- **`ScrollArea` primitive** — plan `c94eec42-ff6f-4f68-981c-53ee929796b8`.
