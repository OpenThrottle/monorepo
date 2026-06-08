# @openthrottle/openthrottle-ide

Headless code-intelligence engine for an IDE-like, agent-driven web experience. It gives agents and agentic workflows a programmatic way to scan arbitrary codebases — the same building blocks an editor like Cursor uses under the hood (ripgrep for search, content hashing for incremental sync), exposed as a Node library. UI lives in a consuming React Router app (e.g. `openthrottle-developer`), not here.

## Layers

- **`config/`** — `WorkspaceConfig` / `resolveWorkspaceConfig`: declare the workspace once (root, `.gitignore` handling, exclude globs).
- **`data/`** — three tiers, all driven by the same `WorkspaceConfig`:
  - **workspace + text search**: `listFiles` / `hashWorkspace` (gitignore-aware enumeration + per-file fingerprints for incremental re-indexing) and `searchText` (structured ripgrep matches with path/line/column).
  - **symbols (`ts-morph`)**: `loadProject` plus `listExports`, `findDefinition`, and `findReferences` — the LSP-grade tier that lets agents reason about code structure (definitions, references, exports) rather than just text.
- **`utils/`** — `runRipgrep` (the bundled `@vscode/ripgrep` binary) and `hashContent` / `hashFile`.

Future layers (file watching, semantic search over the existing pgvector store) plug into the same `WorkspaceConfig`.

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
