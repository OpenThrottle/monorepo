# BullMQ doc ingestion job: input schema and diff strategy

Spec for the scheduled markdown documentation ingestion job. The job accepts **directories** and **individual file paths**, and uses **diff-based re-ingestion**: only re-process documents that were added, changed, or remove documents that no longer exist.

## Job input schema

The job payload supports mixed inputs so callers can specify whole trees and/or specific files.

- **`directories`** (optional): `string[]` — Paths relative to the workspace root. Each directory is expanded to all `.md` files under it (recursive). Example: `["docs", "docs/openthrottle"]`.
- **`files`** (optional): `string[]` — Individual markdown file paths relative to the workspace root. Example: `["README.md", "packages/foo/README.md"]`.
- **`scope`** (optional): `string` — Identifier for the ingestion scope used when reading/writing prior state (see below). Default: `"default"`. Use different scopes when different jobs own different directory sets so their state does not collide.
- **`repo`** (optional): `string` — Source repo for metadata (e.g. `owner/repo`). If omitted, use env `DOCS_REPO` or `"local/repo"`.
- **`sha`** (optional): `string` — Source commit SHA for metadata. If omitted, use env `DOCS_SHA` or `"local"`.

At least one of `directories` or `files` must be provided. Paths are normalized (no leading `./`, consistent slashes). Duplicates (e.g. a file both listed in `files` and covered by a directory in `directories`) are deduplicated after expansion.

**Example payloads:**

```json
{ "directories": ["docs"], "scope": "default" }
```

```json
{
  "directories": ["docs/openthrottle"],
  "files": ["README.md"],
  "scope": "docs-and-root"
}
```

```json
{ "files": ["docs/README.md", "docs/openthrottle/features.md"] }
```

**Types (for implementers):**

```ts
/** Payload for the doc-ingestion BullMQ job. At least one of directories or files must be set. */
export interface DocIngestionJobPayload {
  readonly directories?: readonly string[];
  readonly files?: readonly string[];
  readonly scope?: string;
  readonly repo?: string;
  readonly sha?: string;
}

/** Result of diffing current filesystem state vs prior ingestion state. */
export interface DocIngestionDiff {
  readonly toAdd: readonly string[];
  readonly toUpdate: readonly string[];
  readonly toRemove: readonly string[];
}
```

## Diff strategy

### Goal

On each run, determine:

- **to-add**: paths present on disk that have no prior state (new files).
- **to-update**: paths present on disk whose content has changed vs prior state (re-ingest).
- **to-remove**: paths that had prior state but are no longer in the expanded set (e.g. file deleted or moved out of scope; de-index).

Only **to-add** and **to-update** are sent to the existing docs ingestion pipeline. **to-remove** triggers de-index (delete from `documentation` and `documentation_embeddings` for that path/repo). After a successful run, prior state is updated so the next run can diff again.

### Where to store prior state

**Decision: store prior state in the Cortex Postgres database** in a dedicated table (`doc_ingestion_state`). Read/write and lookup are implemented in `@tools/workflows/doc-ingestion` (`getPriorState`, `savePriorState`, `removePriorState`, `getPriorStateEntry`, `getDocIngestionStateConnectionString`).

- **Why DB over manifest file:** Single source of truth with the rest of Cortex; no git noise or merge conflicts; safe for concurrent jobs if scoped by `scope`; already have `CORTEX_POSTGRES_*` and migrations. A manifest file under the repo would require deciding where it lives, who writes it (CI vs local), and could conflict with multiple jobs or branches.
- **Table shape (conceptual):** One row per `(scope, path)` with at least `path`, `content_hash`, and `updated_at`. Primary or unique key on `(scope, path)`. This allows multiple jobs (or schedules) to maintain separate state via different `scope` values.

### Hash vs mtime

**Decision: use content hash (e.g. SHA-256 of file content) for change detection.**

- **Content hash (chosen):** Detects real content changes only; unaffected by `touch` or CI clone timestamps; stable across environments. Slightly more work (read file, compute hash). Best for “only re-ingest when content changed.”
- **mtime (rejected for primary path):** Faster (stat only), but can change without content change (e.g. git checkout, clone) and can be unreliable in CI or when files are copied. Could be offered later as an optional “fast mode” with a documented tradeoff (fewer reads, possible missed or spurious updates).

So: **store `content_hash` in prior state; on each run, expand paths, read files, compute hash, compare to stored state to derive to-add / to-update / to-remove.**

### First run (no prior state)

When there is no prior state for the given `scope`, treat all expanded paths as **to-add**. Nothing is **to-update** or **to-remove**. After the run, persist state for all ingested paths.

### Summary

| Aspect              | Decision                                                                |
| ------------------- | ----------------------------------------------------------------------- |
| Prior state storage | Cortex DB table (e.g. `doc_ingestion_state`: scope, path, content_hash) |
| Change detection    | Content hash (e.g. SHA-256); not mtime                                  |
| Scope               | Optional `scope` in payload to key state (default `"default"`)          |
| Result of diff      | to-add, to-update, to-remove; only to-add and to-update are re-ingested |

This spec is the source for the implementation tasks: prior-state storage, diff logic, wiring the BullMQ job to the existing ingestion pipeline, and scheduling.

## Implementation (wiring)

The BullMQ job is implemented and wired as follows:

- **Queue:** `doc-ingestion` (see `applications/openthrottle-server/src/queues/doc-ingestion/`).
- **Processor:** `DocIngestionProcessor` runs for each job: validates payload (directories or files required), runs `computeDocIngestionDiff` from `@tools/workflows/doc-ingestion`, de-indexes to-remove via `deindexDocumentationByPath`, runs existing `cortex:import-docs` (with `DOCS_PATHS`, `DOCS_REPO`, `DOCS_SHA`) for to-add and to-update, then persists prior state via `savePriorState` / `removePriorState`.
- **Ingestion script:** Root `cortex:import-docs` (e.g. `scripts/ingest-docs-to-cortex.ts`) respects `DOCS_PATHS` when set (comma-separated relative paths); the processor sets this to the union of to-add and to-update so only changed docs are re-ingested.
- **Enqueue:** The queue is registered in `QueuesService` (`getQueueByName('doc-ingestion')`). On-demand enqueue via GraphQL mutation; optional recurring schedule via env (see below).

## Scheduling and triggering

### On-demand (GraphQL)

Use the **`enqueueDocIngestion`** mutation to run a doc-ingestion job immediately with custom directories and/or files.

- **Input:** `EnqueueDocIngestionInput`: `directories` (optional `[String]`), `files` (optional `[String]`), `scope`, `repo`, `sha` (all optional). At least one of `directories` or `files` must be non-empty.
- **Output:** `EnqueueDocIngestionResultObject`: `success`, `jobId` (when success), `error` (when failure).

**Example (ingest `docs` directory):**

```graphql
mutation {
  enqueueDocIngestion(input: { directories: ["docs"], scope: "default" }) {
    success
    jobId
    error
  }
}
```

**Example (ingest specific files):**

```graphql
mutation {
  enqueueDocIngestion(
    input: {
      files: ["README.md", "docs/openthrottle/features.md"]
      scope: "docs-and-root"
    }
  ) {
    success
    jobId
    error
  }
}
```

**Example (mixed directories and files):**

```graphql
mutation {
  enqueueDocIngestion(
    input: {
      directories: ["docs/openthrottle"]
      files: ["README.md"]
      scope: "docs-and-root"
    }
  ) {
    success
    jobId
    error
  }
}
```

After enqueueing, the job appears in the `doc-ingestion` queue. Use the existing **`queue(name: "doc-ingestion", input: { ... })`** query to list jobs and **`job(jobId, queueName)`** to inspect a job by id.

### Recurring schedule (cron)

To run doc-ingestion on a schedule, set the following environment variables **before** starting the API server (e.g. openthrottle-server). On bootstrap, the server will register a single repeatable job for the `doc-ingestion` queue.

| Env var                     | Required        | Description                                                                                                                                      |
| --------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DOC_INGESTION_CRON`        | Yes (to enable) | Cron pattern (BullMQ format: sec min hour day month dow). Example: `0 0 * * * *` = every hour at :00. If unset, no repeatable job is registered. |
| `DOC_INGESTION_DIRECTORIES` | No              | Comma-separated directory paths (default: `docs`). Example: `docs,packages/foo/docs`.                                                            |
| `DOC_INGESTION_SCOPE`       | No              | Scope for prior state (default: `default`).                                                                                                      |

**Example (hourly ingest of `docs`):**

```bash
export DOC_INGESTION_CRON="0 0 * * * *"
# optional: export DOC_INGESTION_DIRECTORIES="docs"
# optional: export DOC_INGESTION_SCOPE="default"
```

**Example (daily at 2am UTC):**

```bash
export DOC_INGESTION_CRON="0 0 2 * * *"
export DOC_INGESTION_DIRECTORIES="docs,docs/openthrottle"
```

### Listing and removing repeatable jobs

- **List:** Use the **`repeatableJobs(input: { queueName: "doc-ingestion" })`** query. Each repeatable job has a `key`; use it to remove.
- **Remove:** Use the **`removeRepeatableJob(input: { queueName: "doc-ingestion", key: "<key>" })`** mutation. After removal, the schedule stops until the server is restarted with `DOC_INGESTION_CRON` set (which re-registers one repeatable) or you add a repeatable via BullMQ/API elsewhere.
