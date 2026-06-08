# @openthrottle/openthrottle-ide

Headless code-intelligence engine for an IDE-like, agent-driven web experience. It gives agents and agentic workflows a programmatic way to scan arbitrary codebases — the same building blocks an editor like Cursor uses under the hood (ripgrep for search, content hashing for incremental sync), exposed as a Node library. UI lives in a consuming React Router app (e.g. `openthrottle-developer`), not here.

## Layers

- **`config/`** — `WorkspaceConfig` / `resolveWorkspaceConfig`: declare the workspace once (root, `.gitignore` handling, exclude globs).
- **`data/`** — three tiers, all driven by the same `WorkspaceConfig`:
  - **workspace + text search**: `listFiles` / `hashWorkspace` (gitignore-aware enumeration + per-file fingerprints for incremental re-indexing) and `searchText` (structured ripgrep matches with path/line/column).
  - **symbols (`ts-morph`)**: `loadProject` plus `listExports`, `findDefinition`, and `findReferences` — the LSP-grade tier that lets agents reason about code structure (definitions, references, exports) rather than just text.
  - **watch + incremental sync**: `watchWorkspace` (debounced, gitignore-aware `add`/`change`/`unlink` events), `diffSnapshots` (pure `{ added, changed, removed }` delta over two `hashWorkspace` snapshots), and `createWorkspaceIndex` (a live in-memory snapshot that re-hashes only what changed and emits deltas to subscribers) — the Merkle-style tier so downstream layers only re-process files that actually moved.
  - **semantic search (pgvector)**: `chunkFile` / `chunkWorkspace` (AST-aware chunks for TS/JS, line-window fallback otherwise, with stable content-derived ids), `createEmbeddingsProvider` (the `EmbeddingsProvider` seam — OpenAI/Ollama by env), `indexWorkspace` (chunk → embed → upsert, full or incremental via a `diffSnapshots` delta), and `semanticSearch` (top-k vector similarity) — natural-language code search over the existing embeddings + pgvector infrastructure.
- **`utils/`** — `runRipgrep` (the bundled `@vscode/ripgrep` binary) and `hashContent` / `hashFile`.

### Semantic layer: storage & provider boundary

The semantic tier reuses OpenThrottle's existing infrastructure rather than standing up a new store:

- **Embeddings provider** — `createEmbeddingsProvider()` matches the platform contract: OpenAI `text-embedding-3-small` (1536-dim) by default, Ollama when `OLLAMA_BASE_URL` / `OLLAMA_EMBEDDING_MODEL` is set (same env vars as the rest of the platform). It implements the `EmbeddingsProvider` interface, which is **injectable** — pass any `{ embed(texts) => number[][] }` (e.g. a mock in tests).
- **Vector storage** — code-chunk vectors live in a dedicated pgvector table (`code_embeddings`: content-derived chunk id, `workspace_root`, `path`, line range, `content`, `content_hash`, `vector(1536)`), keyed by chunk id for idempotent incremental upserts. The migration is delivered in its own PR.
- **Boundary** — this engine owns the `VectorStore` interface and ships a pgvector-backed implementation that talks to Postgres **directly** (not through `openthrottle-server` GraphQL, which is plan/task/doc-shaped, and not through `openthrottle-mcp`, which stays GraphQL-only). `VectorStore` is injectable, so `indexWorkspace` / `semanticSearch` run against an in-memory store in tests with no live model or database.

## Usage

### Workspace + text search

```ts
import { listFiles, searchText } from '@openthrottle/openthrottle-ide';

const config = { root: '/path/to/repo' };

const files = await listFiles(config);
const matches = await searchText('createUser', config, { globs: ['*.ts'] });
// matches: [{ path, line, column, lineText, matchText }, …]
```

### Symbols (TypeScript intelligence)

The symbols tier builds a [ts-morph](https://ts-morph.com) project from the
workspace `tsconfig.json` (or sensible defaults), so it resolves through
barrels and across files. Paths are workspace-relative, consistent with
`listFiles` / `searchText`.

```ts
import {
  findDefinition,
  findReferences,
  listExports,
} from '@openthrottle/openthrottle-ide';

const config = { root: '/path/to/repo' };

// Every exported symbol, resolved to its declaration (not the re-exporting barrel).
const exports = await listExports(config, { globs: ['src/**/*.ts'] });
// exports: [{ name, kind, path, line, isDefault }, …]

// Go-to-definition by source position…
const defs = await findDefinition(config, {
  path: 'src/app.ts',
  line: 2,
  column: 22,
});
// …or by symbol name.
const byName = await findDefinition(config, { name: 'createUser' });
// defs: [{ path, line, column, name?, kind? }, …]

// Every reference across the workspace, declaration site included.
const refs = await findReferences(config, { name: 'createUser' });
// refs: [{ path, line, column, isWrite? }, …]
```

`findDefinition` and `findReferences` return an empty array (never throw) when
nothing resolves.

### Watch + incremental sync

Keep a workspace snapshot fresh as files change. `watchWorkspace` emits raw,
debounced events; `createWorkspaceIndex` layers hashing and diffing on top so
you receive ready-to-consume `{ added, changed, removed }` deltas — re-hashing
only the files that moved, never the whole tree. Both honor the same
`.gitignore` + exclude-glob scoping as `listFiles`.

```ts
import {
  createWorkspaceIndex,
  diffSnapshots,
  hashWorkspace,
  watchWorkspace,
} from '@openthrottle/openthrottle-ide';

const config = { root: '/path/to/repo' };

// Low-level: debounced add/change/unlink with workspace-relative POSIX paths.
const handle = watchWorkspace(config, {
  onEvents: (events) => {
    // events: [{ type: 'add' | 'change' | 'unlink', path }, …]
  },
});
await handle.close();

// Pure delta between two snapshots — no filesystem access.
const before = await hashWorkspace(config);
const after = await hashWorkspace(config);
const { added, changed, removed } = diffSnapshots(before, after);

// High-level: a live index that emits deltas as the workspace changes.
const index = await createWorkspaceIndex(config);
const unsubscribe = index.subscribe((delta) => {
  // delta: { added, changed, removed } — re-process only these paths.
});
index.getSnapshot(); // current [{ path, hash }, …]
unsubscribe();
await index.close();
```

### Semantic search

Index a workspace into a vector store, then query it in natural language. The
embeddings provider and the `VectorStore` are injected, so the same code runs
against the real pgvector store in production and against an in-memory stub in
tests. Chunk ids are content-derived, so incremental re-indexing (driven by a
`diffSnapshots` delta) only re-embeds files that actually changed.

```ts
import {
  createEmbeddingsProvider,
  indexWorkspace,
  semanticSearch,
  type VectorStore,
} from '@openthrottle/openthrottle-ide';

const config = { root: '/path/to/repo' };
const provider = createEmbeddingsProvider(); // OpenAI by default; Ollama via env
const store: VectorStore = /* pgvector-backed implementation */ myStore;

// Full index: clear + chunk + embed + upsert every tracked file.
await indexWorkspace(config, { provider, store });

// Incremental: only re-embed added/changed files, delete vectors for removed ones.
const before = await hashWorkspace(config);
// …files change…
const after = await hashWorkspace(config);
await indexWorkspace(config, {
  diff: diffSnapshots(before, after),
  provider,
  store,
});

// Top-k semantic search, sorted by descending similarity.
const matches = await semanticSearch('where do we validate JWTs?', config, {
  provider,
  store,
  topK: 5,
});
// matches: [{ path, startLine, endLine, score, content }, …]
```

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-ide
```

**npm:**

```bash
npm install @openthrottle/openthrottle-ide
```
