# @openthrottle/react-router-ide

Presentational + client-only UI for the [`@openthrottle/openthrottle-ide`](../openthrottle-ide) code-intelligence engine: a repository selector, a workspace file palette, text/symbol/semantic search forms, and result components — all built from [`@openthrottle/react-router-shadcn`](../react-router-shadcn) primitives.

## Server/client boundary (read this first)

`@openthrottle/openthrottle-ide` is a **server-only Node library** (`@vscode/ripgrep`, `chokidar`, `ts-morph`; tag `technology:nodejs`). It must never be imported into the browser bundle.

- **This package is presentational.** It imports only the engine's **types** (`import type`, erased at compile time) — never its runtime. Components take already-serialized view-model data as props and emit callbacks; they do no data fetching.
- **The engine runs server-side**, in the consuming app's React Router `loader` / `action` / resource-route modules — specifically in `*.server.ts` modules dynamically `import()`-ed inside the loader, so engine code is never bundled for the client.
- The loader maps engine results → the serializable view-model DTOs exported here → component props.

## Data-flow contract

| Tier                          | How it loads                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository selection          | `IdeRepositorySelector` sets a `?repositoryId=` search param; the loader resolves the selected `WorkspaceLocalRepository.filesystemPath` (via GraphQL) into the engine's `WorkspaceConfig`. |
| Workspace files + text search | GET form `?q=` → page **loader** (ripgrep — cheap; runs on navigation).                                                                                                                     |
| Symbols (exports)             | Lazy: a fetcher → resource route running `listExports` (ts-morph — expensive; only when the Symbols tab opens).                                                                             |
| Definition / references       | Click-driven `useSymbolDetails` fetcher → the same resource route.                                                                                                                          |
| Semantic search               | Gated behind the `code_embeddings` infra; presentational components ship here, real wiring lands server-side separately.                                                                    |

## Exported surface

- **Components** — `IdeRepositorySelector`, `WorkspaceFilePalette`, `IdeSearchForm`, `IdeSearchResults`, `IdeSearchResultRow`, `ExportsList`, `SymbolRow`, `DefinitionReferencesPanel`.
- **Hooks** — `useDebouncedValue`, `useSymbolDetails` (the only fetcher; text search is GET→loader).
- **Utils** — `splitMatchHighlight`, `formatLocationLabel`, `githubBlobHref`, `editorHref`.
- **View-model types** — re-exported engine leaf types (`SearchMatch`, `ExportedSymbol`, `DefinitionLocation`, `ReferenceLocation`, `SemanticMatch`) plus envelope DTOs (`IdeRepositoryRef`, `IdeWorkspaceListing`, `IdeSearchResult`, `IdeExportsResult`, `IdeSymbolDetails`, `IdeSymbolRef`, `IdeSemanticResult`).

> This package deliberately uses no `ScrollArea` primitive (it doesn't exist in `react-router-shadcn` yet — adding it is tracked separately). Bounded scroll regions use the cmdk `Command` list or a plain `overflow-auto` container.

## Usage

The engine runs in a server module; the route maps its results to view-models and renders these components.

```ts
// app/routing/ide/data/ide-engine.server.ts  (server-only)
import { listFiles, searchText } from '@openthrottle/openthrottle-ide';
import type {
  IdeSearchResult,
  IdeWorkspaceListing,
} from '@openthrottle/react-router-ide';

export const listFilesVM = async (
  config: WorkspaceConfig,
  repository: IdeRepositoryRef,
): Promise<IdeWorkspaceListing> => ({
  paths: await listFiles(config),
  repository,
  truncated: false,
});
```

```tsx
// app/routes/ide._index.tsx  (the loader resolves the repo + runs the cheap tier)
import {
  IdeRepositorySelector,
  IdeSearchForm,
  IdeSearchResults,
  WorkspaceFilePalette,
} from '@openthrottle/react-router-ide';

export default function Ide({ loaderData }: Route.ComponentProps) {
  const { listing, repositories, search, selectedId } = loaderData;

  return (
    <>
      <IdeRepositorySelector options={repositories} selectedId={selectedId} />
      <WorkspaceFilePalette listing={listing} />
      <IdeSearchForm defaultQuery={search.query} />
      <IdeSearchResults result={search} />
    </>
  );
}
```

## Development

Source-first package — no `build` target; `main`/`types` point at `./src/index.ts`. Validate with:

```bash
pnpm nx run react-router-ide:lint
pnpm nx run react-router-ide:typecheck
pnpm nx run react-router-ide:typecheck-tests
pnpm nx run react-router-ide:test
```

Then run `openthrottle-developer` (`dev`/`build`) as the integration check.
