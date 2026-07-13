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
(built by `queueJobLogTopic(queueName, jobId)` in `@openthrottle/nestjs-graphql`).

**Publish point (as implemented).** Rather than editing each processor, the
publish is wired at the **writer boundary**: `KeyedJsonlWriter` takes an optional
dep‑free `onAppend(queueName, jobId, record, lineIndex)` observer (invoked
synchronously per `jsonl` append, never in `raw` mode). The
`BULLMQ_RUN_OUTPUT_WRITER` factory (`queues/bullmq-run-output.module.ts`) injects
`PUB_SUB` and passes `createQueueJobLogTailPublisher(pubSub)`
(`graphql/queue-job-logs/queue-job-log-publisher.ts`), which maps + redacts the
record through the **same** `mapRecordToQueueJobLogEvent` the query uses and
fire‑and‑forget `pubSub.publish`es a `QueueJobLogEvent`. This gives every keyed
producer (`PlansProcessor`, `WorkflowProcessor`, doc‑ingestion, …) live tail for
free with zero processor changes, and guarantees the two surfaces never drift in
shape or redaction. Publish never blocks or breaks the durable write (the writer
wraps the observer in try/catch; the publish promise is intentionally not awaited).

**Cursor / dedupe.** The observer receives the writer's 0‑based per‑key append
index and stamps `cursor = encode(lineIndex + 1)` — the same encoding the query
uses for a physical line — so a client that called `queueJobLogs` for catch‑up can
dedupe live events by cursor. Caveat: the index tracks append order within one
writer instance; a job whose keyed file is resumed by a **second process** would
see the live index drift from the on‑disk line. That is the same single‑process
constraint as below, not a supported topology.

**Delivery is single‑process.** `PUB_SUB` is the in‑memory `graphql-subscriptions`
`PubSub`, so a `queueJobLogTail` subscriber only receives events when it is served
by the **same process** that runs the BullMQ processor doing the append (identical
to `planOutputChunkAdded`). In a split web/worker deployment the historical
`queueJobLogs` query still works (reads the shared on‑disk file); only the live
push is process‑local. Cross‑process fan‑out (Redis `PubSub`) is a documented
follow‑up, not in v1 — swapping the `PUB_SUB` provider is the only change needed.

## Auth (task 4)

- **Query**: covered by the global `GlobalAuthGuard` (service‑account bearer +
  JWT); anonymous rejected. No `@Public()`.
- **Subscription**: authed at the graphql‑ws `onConnect` handshake (bearer in
  `connectionParams`); the resolver reads `context.userId` and rejects when absent
  — identical to `planOutputChunkAdded`.
- No separate token family (plan AC satisfied).

## Rate limiting (task 5)

- **Query (implemented)**: `@Throttle({ default: { limit: 30, ttl: 60_000 } })` on
  `queueJobLogs` — 30 requests / 60s per subject, well under the global default of
  1000/60s (`nestjs-throttler` `DEFAULT_THROTTLER_LIMIT`). Enforced by the global
  `GqlThrottlerGuard` (`APP_GUARD`), keyed per authenticated subject. The `limit`
  argument is additionally hard‑capped server‑side (default 200, max 1000), so a
  single response can never be unbounded.
- **Subscription (policy — documented, not a resolver decorator)**: `@Throttle`
  does **not** fire for a graphql‑ws subscription (the throttler guard runs on the
  GraphQL HTTP request context, not the persistent ws connection). The correct
  control is a **per‑subject concurrent‑connection cap at the graphql‑ws
  `onConnect` handshake** (proposed max 5 connections/subject), which lives in the
  shared `nestjs-graphql` subscription transport and governs **all** subscriptions,
  not just this one. It is therefore scoped as a shared‑infra follow‑up rather than
  landed here to avoid changing the auth handshake for every existing subscription.
  Until then, live tail is bounded by: auth (rejects anonymous), the single‑process
  delivery constraint, and the per‑subject query throttle for catch‑up.
- **Production policy**: the same 30/60s query throttle applies in prod (env‑agnostic
  decorator). When the `onConnect` connection cap lands it should be enabled in all
  environments; production additionally sits behind the standard ingress limits.

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
- [x] Auth required; anonymous rejected — task 4. Query: global `GlobalAuthGuard`
      (not `@Public`). Subscription: `context.userId` check (authed at `onConnect`).
      Covered by `queue-job-logs.resolver.test.ts`.
- [x] Rate limits applied + prod policy documented — task 5. Query `@Throttle`
      30/60s (applied); subscription connection‑cap documented as a shared‑infra
      follow‑up (see Rate limiting).
- [x] Deep‑link integration note — task 7 (this section).
