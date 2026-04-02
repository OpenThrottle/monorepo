# Analysis: ingest-docs-to-cortex and NX project graph

**Plan:** Extend markdown ingestion to use NX project graph and include project READMEs
**Task:** Analyze ingest-docs-to-cortex.ts and NX project graph usage

## Current script behavior (docs/ only)

- **Script:** `scripts/ingest-docs-to-cortex.ts`
- **Source:** Only `docs/` — `DOCS_ROOT = join(process.cwd(), 'docs')`.
- **Collection:** `collectMdPaths(dir, baseRelative)` recursively finds `.md` paths under `DOCS_ROOT` (relative paths).
- **Upsert:** For each path: read file, upsert into `documentation` (path, content, repo, sha, pr_number, authors, message). Idempotent per `(repo, sha, path)`.
- **Embeddings:** Delete existing `documentation_embeddings` for the doc, then insert chunks via `chunkTextForEmbedding` and OpenAI `text-embedding-3-small` when `OPENAI_API_KEY` is set.
- **Env:** `DOCS_REPO`, `DOCS_SHA`, `DOCS_AUTHORS`, `DOCS_MESSAGE`, `DOCS_PR_NUMBER` for metadata; `CORTEX_POSTGRES_*` / `CORTEX_POSTGRES_URL` for DB.

## How NX project graph is read elsewhere

- **API:** `createProjectGraphAsync()` from `@nx/devkit` (used in scripts and generators).
- **Graph shape:** Returns `{ nodes, dependencies }`. Each entry in `nodes` is keyed by project name; node has `name`, `data` (with `root`, `tags`, etc.). `data.root` is the project root path (e.g. `applications/openthrottle-server`, `packages/ai-mcp`).
- **Usages in repo:**
  - **tools/generators/src/utils/projects.ts:** `getNxProjectNames()` and `getProjectsByTags()` call `createProjectGraphAsync()`, then `Object.values(nodes)`; filter by `data.tags` (e.g. `type:application`, `type:package`). Used for workflow `--project` validation and generator targets.
  - **tools/generators/src/generators/nestjs/generator.module.ts:** `createProjectGraphAsync()` then `graph.nodes[schema.destination]`; uses `node?.data?.root` to resolve project root path.
  - **scripts/nx-circular-dependencies.ts:** `createProjectGraphAsync()` then `graph.nodes` and `graph.dependencies` for cycle detection.
- **CLI:** `pnpm exec nx graph --file=...` used in `scripts/nx-dependency-graph.ts` for HTML output (not for programmatic project list).

## Implications for ingestion

- Use `createProjectGraphAsync()` from `@nx/devkit` to get all projects (or filter by tags if we only want apps/packages).
- For each project node, `node.data.root` is the project root; resolve `README.md` at `join(workspaceRoot, node.data.root, 'README.md')`.
- Use a stable path key for documentation table (e.g. project-relative like `applications/cortex/README.md` or prefixed like `projects/applications/cortex/README.md`) so idempotency per `(repo, sha, path)` still holds.
- Keep existing docs/ ingestion; add a second pass (or merged list) for project READMEs.

## Verification (task 5)

- Full run: `pnpm run cortex:import-docs` ingests docs/ (e.g. 113 files) plus NX project READMEs (e.g. 75 files) for 188 documentation rows; paths for READMEs are `projects/<root>/README.md`.
- Idempotent per (repo, sha, path); re-run upserts and refreshes embeddings.
