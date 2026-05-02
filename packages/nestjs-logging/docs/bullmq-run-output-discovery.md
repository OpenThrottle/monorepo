# Discovery: keyed run transcripts vs global JSONL (`nestjs-logging`)

**Plan context:** BullMQ workers may run **N** concurrent jobs; each needs its **own** append-only transcript file. Today `FileLogJsonlSink` owns **one** `FileHandle`, optional rotation, and publishes to `FileBackedLogStreamHub` for the **global** structured log. That model does not map to per-job files.

## Options compared

### A. New service inside `@openthrottle/nestjs-logging`

| Area         | Notes                                                                                                                                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DI**       | Register a **second** token (e.g. `KEYED_RUN_JSONL_WRITER`) alongside `LOG_JSONL_SINK`. Do **not** implement `LogJsonlSink`; run transcripts are not `StructuredLogRecord` + hub contract. Optional `forRoot`/`forRootAsync` fields or a small `registerKeyedRunWriter` flag keep defaults unchanged. |
| **Hub**      | **Do not** connect keyed lines to `LOG_STREAM_HUB` / WebSocket (explicit non-goal). Keeps tail/replay semantics tied to the single active application JSONL.                                                                                                                                          |
| **Rotation** | Per-job files are typically **append-only until job end**; no size/daily rotation in v1 (unlike `FileLogJsonlSink`). Different product rules → different type, avoids overloading `JsonlRotationPolicy`.                                                                                              |
| **Tests**    | Same Vitest project as `FileLogJsonlSink`; can share temp-dir helpers and optionally internal fs helpers after refactor task.                                                                                                                                                                         |
| **Reuse**    | `serializeStructuredLogLine` only if the spec chooses **JSONL of structured objects**; raw stdout capture would write **bytes/lines** without that serializer. Optional follow-up: extract tiny shared `appendUtf8Line` / `syncFd` helper used by both sinks.                                         |

### B. Sibling package (framework-agnostic or `nestjs-*`)

| Area         | Notes                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| **DI**       | Consumer app imports another module or constructs the writer manually.                                          |
| **Hub**      | Naturally omitted; good separation.                                                                             |
| **Rotation** | Same as A; stays out of global sink types.                                                                      |
| **Tests**    | New project boundary; slightly more release/version overhead in the monorepo.                                   |
| **Reuse**    | Best when **multiple** non–`nestjs-logging` consumers need identical LRU/sanitize behavior (e.g. CLI + server). |

### C. Application-local only (`openthrottle-server` / queue module)

| Area         | Notes                                                                |
| ------------ | -------------------------------------------------------------------- |
| **DI**       | Local provider or plain class; fastest one-off.                      |
| **Hub**      | N/A.                                                                 |
| **Rotation** | App-defined.                                                         |
| **Tests**    | Lives next to processors; no shared library tests unless duplicated. |
| **Reuse**    | Weak if a second app later runs the same BullMQ pattern.             |

## Recommendation

**Implement in `packages/nestjs-logging`** as a **separate** injectable keyed writer service (name TBD, e.g. `KeyedJsonlWriter` / `KeyedRunOutputWriter`):

1. **Consumers:** `applications/openthrottle-server` already depends on this package for global JSONL; one dependency, one place for fs edge cases (sanitize, FD cap, flush/close).
2. **Boundaries:** Clear split from `LogJsonlSink` / hub / OpenClaw contract file—only **optional** reuse of `serializeStructuredLogLine` if the spec chooses structured JSONL lines for runs.
3. **Sibling package** is a later extraction if a second consumer appears outside Nest or without `nestjs-logging`.

**Defer** a standalone package unless we need the same writer in a non-Nest worker or a package that must not pull Socket.IO / logging module peers.

## Wiring note (for follow-on tasks)

BullMQ processors today live under `applications/openthrottle-server/src/queues/*` (`plans.processor.ts`, `workflow.processor.ts`, etc.). Lifecycle hooks: open (or lazy-open on first chunk) at job start, periodic or milestone `flush`, `close`/evict LRU slot on completion—documented in README after implementation.
