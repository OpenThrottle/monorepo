# @openthrottle/openthrottle-ide

Headless code-intelligence engine for an IDE-like, agent-driven web experience. It gives agents and agentic workflows a programmatic way to scan arbitrary codebases — the same building blocks an editor like Cursor uses under the hood (ripgrep for search, content hashing for incremental sync), exposed as a Node library. UI lives in a consuming React Router app (e.g. `openthrottle-developer`), not here.

## Layers

This first cut delivers the **workspace + text search** foundation:

- **`config/`** — `WorkspaceConfig` / `resolveWorkspaceConfig`: declare the workspace once (root, `.gitignore` handling, exclude globs).
- **`data/`** — `listFiles` / `hashWorkspace` (gitignore-aware enumeration + per-file fingerprints for incremental re-indexing) and `searchText` (structured ripgrep matches with path/line/column).
- **`utils/`** — `runRipgrep` (the bundled `@vscode/ripgrep` binary) and `hashContent` / `hashFile`.

Future layers (symbols via `ts-morph`, file watching, semantic search over the existing pgvector store) plug into the same `WorkspaceConfig`.

## Usage

```ts
import { listFiles, searchText } from '@openthrottle/openthrottle-ide';

const config = { root: '/path/to/repo' };

const files = await listFiles(config);
const matches = await searchText('createUser', config, { globs: ['*.ts'] });
// matches: [{ path, line, column, lineText, matchText }, …]
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
