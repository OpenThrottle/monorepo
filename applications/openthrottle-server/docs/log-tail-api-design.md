# Phase 1 Log Tail API — GraphQL contract (design)

**Plan:** OT `3c397432-dc7d-47a5-a87e-36ec0682891e` — _feat(openthrottle-server): Phase 1 log tail API for openthrottle-developer_.
**Parent product plan (OpenThrottle):** `a72b208c-1f39-4092-b69b-abdb8b82bb91` — Settings > Logs.

This document is the task‑2 deliverable: the documented API contract. Tasks 3–6
implement it; **the code‑first GraphQL types below must be added together with a
regenerated `schema.gql` + codegen output in one change** (CI fails on drift), so
they land in task 3 (source adapters) where the resolver first returns real data —
not piecemeal.

## Decision recap (task 1)

Primary v1 surface is **GraphQL query + subscription** (Option A), not REST.
Rationale: reuses the graphql‑ws transport + bearer/`connectionParams` auth, the
global `@nestjs/throttler` `GqlThrottlerGuard`, and the developer app's existing
`executeGraphqlWithAuth` + graphql‑ws client. Mirrors the established
`planOutputStreamChunks` (query) + `planOutputChunkAdded` (subscription) pair in
`src/graphql/plan-output-stream/`.

## Source of truth

Per‑job BullMQ run transcripts written by `KeyedJsonlWriter`
(`packages/nestjs-logging/src/services/keyed-jsonl-writer.ts`) to
`{BULLMQ_RUN_OUTPUT_DIR}/{queueSegment}/{jobSegment}.jsonl` — append‑only, one
file per `(queueName, jobId)`. (Env var is **`BULLMQ_RUN_OUTPUT_DIR`**; the plan
prose's `OT_BULLMQ_RUN_OUTPUT_DIR` is stale.) When the var is unset the feature is
disabled and the query returns an empty page / the subscription completes
immediately.

On‑disk JSONL record shape (`KeyedJsonlRunRecord`):

```jsonc
{ "timestamp": "2026-05-04T23:00:00.000Z", "type": "stdout" | "stderr" | "meta", "data": "<string | object>", "source": "workflow-ralph" }
```

These keyed files are intentionally **not** on the global Socket.IO log hub (see
`packages/nestjs-logging/docs/bullmq-run-output-discovery.md`).

## GraphQL SDL (what the code‑first types must generate)

```graphql
"""
Severity bucket for a log event (derived; see mapping below).
"""
enum QueueJobLogLevel {
  debug
  info
  warn
  error
}

"""
A single sanitized log line from a BullMQ keyed per-job run transcript.
"""
type QueueJobLogEvent {
  timestamp: Date!
  level: QueueJobLogLevel!
  message: String!
  "Origin layer, e.g. plans-queue | workflow-queue | ralph-shim."
  source: String!
  queueName: String!
  jobId: String!
  "Opaque cursor positioned AFTER this event; pass as `after` to resume."
  cursor: String!
}

type QueueJobLogPage {
  events: [QueueJobLogEvent!]!
  "Opaque cursor for the next page; null when caught up to end-of-file."
  nextCursor: String
  hasMore: Boolean!
}

input QueueJobLogsInput {
  queueName: String!
  jobId: String!
  "ISO-8601 lower bound (inclusive). Mutually exclusive with `after`."
  since: Date
  "Opaque cursor from a prior page. Mutually exclusive with `since`."
  after: String
  "Max events; server-capped (default 200, hard max 1000)."
  limit: Int
  "Optional severity filter; empty/omitted = all levels."
  levelIn: [QueueJobLogLevel!]
}

extend type Query {
  "Historical / catch-up read of a job's keyed run transcript."
  queueJobLogs(input: QueueJobLogsInput!): QueueJobLogPage!
}

extend type Subscription {
  "Live tail of new keyed run-output lines for a (queueName, jobId)."
  queueJobLogTail(queueName: String!, jobId: String!): QueueJobLogEvent!
}
```

`Date` is the repo's existing ISO date scalar (same one `plan-output-stream`
object types use via `@Field(() => Date)`).

## Field semantics & mappings

- **timestamp** ← record `timestamp` (ISO‑8601).
- **message** ← `data` when string (trimmed); when `data` is an object, prefer its
  `message`/`msg` field, else `JSON.stringify(data)`. Always passed through the
  redactor (task 6) before return.
- **level** (derived — keyed lines carry no native level):
  - if `data` is an object with a recognized `level` (`debug|info|warn|error`), use it;
  - else by `type`: `meta → debug`, `stdout → info`, `stderr → warn`.
  - `error` is only produced when an explicit `level: "error"` is present in
    structured `data` (we do **not** blanket‑map `stderr → error`, since many tools
    write normal progress to stderr). This is documented as a heuristic; revisit if
    producers start emitting structured levels.
- **source** ← record `source` when present, else the queue's logical name
  (`plans-queue` / `workflow-queue`).
- **queueName / jobId** ← echoed from the request (the keyed file identity).
- **cursor** ← opaque, see below.

## Pagination & cursor (no unbounded memory)

Files are append‑only, so a cursor is just a **line index**. Encode opaquely:
`base64url(JSON.stringify({ v: 1, line: <0-based count consumed> }))`. The resolver
streams the file line‑by‑line (readline over a read stream), skips to the cursor
line (or to the first line with `timestamp >= since`), then collects up to the
capped `limit`, applying `levelIn` after derivation. It never buffers the whole
file. `nextCursor` is the index after the last returned line; `hasMore` is true if
the stream had more lines. `since` and `after` are mutually exclusive (validation
error if both set).

## Live tail (subscription)

Topic convention mirrors `plan:<id>:output`: **`bullmq:<queueName>:<jobId>:logs`**
(instance‑scoped). In task 3 the publish is wired alongside
`KeyedJsonlWriter.appendRunChunk(...)` in `PlansProcessor` / `WorkflowProcessor`,
so each appended chunk is also `pubSub.publish`ed as a mapped+redacted
`QueueJobLogEvent`. The subscription resolver filters by topic (server‑side, like
the plan‑output precedent); clients first call `queueJobLogs` for catch‑up, then
subscribe for new lines (dedupe by cursor).

## Auth (task 4)

- **Query**: covered by the global `GlobalAuthGuard` (service‑account bearer +
  JWT); anonymous rejected. No `@Public()`.
- **Subscription**: authed at the graphql‑ws `onConnect` handshake (bearer in
  `connectionParams`); the resolver reads `context.userId` and rejects when absent
  — identical to `planOutputChunkAdded`.
- No separate token family (plan AC satisfied).

## Rate limiting (task 5)

- **Query**: `@Throttle({ default: { limit, ttl } })` on the resolver (proposed
  default 30 requests / 60s per subject; final number documented in the impl PR).
- **Subscription**: cap concurrent connections per subject at `onConnect`
  (proposed max 5); `limit` hard‑cap (1000) already bounds per‑response size.
- Production policy: same caps enabled in prod; documented in task 5.

## Sanitization (task 6)

Before returning/publishing any `message`, redact tokens, `Authorization`,
cookies, and env‑var values, aligned with the client sink redaction rules. No
field ever carries raw secrets or full request headers. Tests assert secrets never
appear in emitted events.

## Developer‑app integration note (task 7)

Every `QueueJobLogEvent` carries `queueName` and `jobId`, so the
`openthrottle-developer` log viewer can deep‑link each line to that job's detail
page — **no new route or path logic is needed**, the target already exists:

- **Route:** `applications/openthrottle-developer/app/routes/queues.$queueId.$jobId.tsx`
  (URL `/queues/:queueId/:jobId`).
- **Path helper:** `queueJobDetailPath(queueName, jobId)` in
  `app/routing/queues/utils/queue-job-detail-path.ts` →
  `/queues/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}`
  (segments are URL‑encoded, so queue names / job ids with slashes or spaces are
  safe). This matches the server's `planRunJobDetailPath` in
  `build-workflow-ralph-argv` — same shape, both produce `/queues/<q>/<j>`.

**Integration:** when rendering a log event, wrap it in a link to
`queueJobDetailPath(event.queueName, event.jobId)` (e.g. a `<Link to={...}>` on
the line's source/queue badge). `queueName`/`jobId` are always present for keyed
per‑job lines, so the link is unconditional for this API's events; if a future
non‑keyed source is added that omits them, guard the link on both being non‑empty.

No server‑side change is required for this — it is a developer‑app consumption
note. It is satisfied once the log viewer (Settings > Logs, the parent product
plan) renders events with that link.

## Acceptance‑criteria mapping

- [x] Documented API matches the query/response sketch — this file.
- [ ] Auth required; anonymous rejected — task 4.
- [ ] Rate limits in non‑prod + prod policy documented — task 5.
- [x] Deep‑link integration note — task 7 (this section).
