# OpenClaw-style logging contract (maintainer reference)

This document freezes the **hybrid model** for `@openthrottle/nestjs-logging`: append-only **JSON Lines (JSONL)** on disk for durability and replay, plus **real-time** delivery over **WebSockets** (Socket.IO, aligned with `@openthrottle/nestjs-websockets`). It is a **contract for this package**, not a claim of wire compatibility with OpenClaw.

## OpenClaw reference (upstream)

OpenClaw documents gateway file logs as **one JSON object per line**, optional rotation, and Control UI / CLI tailing via the gateway (e.g. `logs.tail` over the same authenticated channel as other RPC). Canonical maintainer reading:

- [Gateway logging — OpenClaw](https://docs.openclaw.ai/gateway/logging)

Official project entry points (naming, repo, docs hub) live with the upstream OpenClaw project.

**What we borrow conceptually:** durable JSONL on disk + tail/replay over a live channel + clear separation between **file log level** and **console / debug verbosity** (OpenClaw stresses that file logs follow `logging.level`, while extra console noise can be orthogonal).

**What we implement differently:** NestJS integration (`LoggerService` levels, DI, optional `@openthrottle/nestjs-websockets` gateway), our own event/RPC names, and security defaults (see later tasks in the plan).

---

## 1. JSONL file format (frozen minimum)

Each **line** is one **complete JSON object** (UTF-8, no pretty-printing, `\n` line terminator). Writers **must** end every record with `\n` so tail readers can treat `\n` as record boundaries. After a crash, readers **may** encounter a final **partial line**; they should **skip or buffer** until a full line is available on the next read (same resilience expectation as generic JSONL tailers).

### Determinism (writers vs readers)

Writers in `@openthrottle/nestjs-logging` serialize the **root** JSON object with **canonical top-level key order** (§1.2.2) so equivalent logical records produce **identical** serialized lines for the same field values—stable for diffs, aggregation, and byte comparisons. Key order inside nested objects (for example `extra`) is not normalized unless the contract says otherwise. **Parsers** must not rely on object key order (§4.2); they **ignore** unknown top-level keys and remain forward compatible when new optional fields appear.

### 1.1 Required fields

| Field       | Type   | Description                                                                                             |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `timestamp` | string | ISO 8601 UTC with millisecond precision (e.g. `2026-05-02T12:00:00.000Z`).                              |
| `level`     | string | One of Nest `LogLevel` string values this package supports: `error`, `warn`, `log`, `debug`, `verbose`. |
| `message`   | string | Human-oriented message (single line preferred; if multiline, JSON string escaping applies).             |

### 1.2 Optional fields (stable names)

| Field           | Type   | Description                                                                                     |
| --------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `context`       | string | Nest logger context (class or custom label).                                                    |
| `correlationId` | string | Correlation id from inbound request or async context, when configured.                          |
| `traceId`       | string | Distributed trace id when present (e.g. W3C `traceparent` / OTLP), when configured.             |
| `spanId`        | string | Span id when trace tooling supplies it.                                                         |
| `pid`           | number | Process id (useful when aggregating multi-process).                                             |
| `hostname`      | string | Host name (optional; may be omitted in tests).                                                  |
| `extra`         | object | Arbitrary structured payload; **must** be JSON-serializable. Implementations may omit if empty. |

### 1.2.1 Parser vs writer notes (alignment)

**Required minimum on the wire:** A valid line **must** include `timestamp`, `level`, and `message` (§1.1). All fields listed under §1.2 are **optional** on the wire, including `context`.

**`context`:** Writers **may omit** this key when no Nest logger context applies, or **may emit** `""` for an explicit empty context. JSONL readers **must** accept omission and **should** normalize a missing `context` to an empty string for in-process APIs that use a string slot, so that lines with only the three required fields still parse successfully.

**Implementation status (maintainers):** The TypeScript `StructuredLogRecord` type and `parseJsonlLineToStructuredRecord` historically treated `context` as required; aligning code with §1.1–§1.2 is an explicit package goal (optional `context` on write, tolerant parse).

### 1.2.2 Canonical top-level key order (writers)

**Decision:** Use an **explicit ordered list** derived from §1.1 then §1.2 (not lexicographic key sort). Lexicographic order would reorder keys alphabetically (for example `timestamp` would appear after `pid` and `spanId`), which is worse for human scanning, diffs, and alignment with the contract tables.

Writers in this package **must** serialize the root JSON object with top-level keys in this order, omitting absent optional keys:

1. `timestamp` — §1.1
2. `level` — §1.1
3. `message` — §1.1
4. `context` — §1.2
5. `correlationId` — §1.2
6. `traceId` — §1.2
7. `spanId` — §1.2
8. `pid` — §1.2
9. `hostname` — §1.2
10. `extra` — §1.2

When this contract adds a new optional top-level field, **append** it to this list (and to §1.2) in the same revision so emission order stays documented in one place.

**Parsers:** Unchanged — §4.2 still applies; readers **ignore** unknown top-level keys and **must not** depend on key order inside the JSON object.

### 1.3 Ordering and rotation

- **Ordering:** Records are **append-only** in file order; `timestamp` should reflect emission order but must not be relied on for strict causality across threads without additional sequencing. **Per-object key order** on the wire is defined in §1.2.2 (deterministic emission for writers in this package).
- **Rotation:** File sink configuration (separate spec in implementation) may rotate by date and/or size; rotated files remain JSONL. Consumers **must** tolerate **file switch** notices delivered on the WebSocket (see §2.3).

### 1.4 Redaction

Follow OpenClaw’s principle: **sensitive values must not hit JSONL or WS payloads** once redaction is enabled. Exact policy is implementation-defined but should be applied **before** serialization to disk or fan-out.

---

## 2. WebSocket API (Socket.IO)

Use a **dedicated namespace** (default suggestion: `/ot-logging`, configurable) so hosts can mount the gateway without colliding with app domains. All names below are **logical**; final code may prefix with a short constant.

Security is **opt-in** and documented in the implementation (handshake auth, origin, localhost-only defaults). This section only defines **protocol shape**.

### 2.1 Connection lifecycle

1. Client connects to the logging namespace (with auth if required).
2. Client issues **control** messages (subscribe / history / tail). Server responds with **acks** (Socket.IO callback) for RPC-style operations where a result or error code is needed.
3. Server pushes **log** events asynchronously as new JSONL records are committed (after flush policy allows).

### 2.2 Client → server (control)

| Message / event    | Payload (JSON)                                       | Ack result                                                                                         | Description                                                                                                                                                                                         |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `logs.subscribe`   | `{ "levels"?: string[], "contexts"?: string[] }`     | `{ "ok": true, "subscriptionId": string }` \| `{ "ok": false, "error": string }`                   | Register interest in live records; server pushes matching lines as `log.record`. Empty filters mean all levels/contexts allowed by server policy.                                                   |
| `logs.unsubscribe` | `{ "subscriptionId": string }`                       | `{ "ok": true }`                                                                                   | Stop fan-out for that subscription.                                                                                                                                                                 |
| `logs.history`     | `{ "maxLines": number, "maxBytes"?: number }`        | `{ "ok": true, "lines": object[] }` \| error                                                       | Return up to `maxLines` **parsed** records from the **end** of the active JSONL file (bounded by `maxBytes` total serialized size if provided).                                                     |
| `logs.replay`      | `{ "fromByteOffset"?: number, "maxLines"?: number }` | `{ "ok": true, "nextByteOffset": number, "lines": object[] }` \| error                             | Read forward from a byte offset in the active file (for late joiners resuming). If `fromByteOffset` omitted, start at beginning of active file subject to `maxLines` cap.                           |
| `logs.tail`        | `{ "follow": boolean, "maxLines"?: number }`         | `{ "ok": true, "lines"?: object[], "cursor"?: { "path": string, "byteOffset": number } }` \| error | **OpenClaw-analog:** snapshot last `maxLines` (default bounded) then, if `follow`, same stream as subscribe for new records. Implementation may implement `follow` by auto-creating a subscription. |

**OpenClaw analog:** `logs.tail` matches the idea of the Control UI / CLI tailing the JSONL file via the gateway; see [Gateway logging](https://docs.openclaw.ai/gateway/logging).

### 2.3 Server → client (push)

| Event        | Payload                                                                                    | Description                                                                              |
| ------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `log.record` | `{ "record": object }`                                                                     | One logical log line; `record` matches §1 schema (parsed object, not a raw string line). |
| `log.notice` | `{ "type": "truncate" \| "rotate" \| "backpressure", "detail"?: string, "path"?: string }` | Out-of-band signals: truncation, file rotation, or subscriber throttling.                |
| `log.error`  | `{ "code": string, "message": string }`                                                    | Non-fatal channel errors (e.g. replay range invalid).                                    |

### 2.4 Backpressure rules (normative for implementers)

1. **Per-connection queue:** Each subscribed socket has a **bounded queue** of pending `log.record` events. Default bound is implementation-defined (e.g. 1000 records or N MB); must be documented in README.
2. **On overflow:** Drop oldest **or** coalesce **warn**/**debug** (policy choice), then emit `log.notice` with `type: "backpressure"` so UIs can show degraded mode. **Never** block the application logging thread indefinitely waiting for slow WS clients.
3. **Socket.IO buffers:** If the underlying engine buffer is full, treat as backpressure; do not grow unbounded heap for a single peer.
4. **History / replay:** Responses **must** respect `maxLines` / `maxBytes` caps; large replays should be **chunked** in a later revision if needed (document if single-frame ack remains limited).

---

## 3. Mapping to `@openthrottle/nestjs-websockets`

- Prefer a **gateway class** in this package (or sub-module) using `@WebSocketGateway`, `@SubscribeMessage`, and **ack callbacks** for `logs.*` control messages, mirroring the existing scaffold in `NestjsWebsocketsGateway` (`events` handler pattern) but with the names above.
- **Do not** duplicate HTTP server bootstrap; consume the same Socket.IO adapter instance the host app already configures when `nestjs-websockets` (or the app) registers the adapter.
- **Peer dependency:** `@openthrottle/nestjs-websockets` (and Nest websockets packages) are documented as **optional / peer** for the streaming feature; JSONL file sink remains usable without WS.

---

## 4. Versioning and forward compatibility

### 4.1 Document bumps (breaking vs additive)

- **Bump this document** (and note the change in package changelog when shipping) when you add new **required** JSONL fields, **rename** or **repurpose** existing fields, tighten validation in a way that rejects lines previously accepted, or change WebSocket event names or payload semantics in §2.
- **Additive changes** that stay backward compatible for readers following §4.2—new **optional** §1.2 fields, new ignored top-level keys—still belong in §1 and should be documented here so writers and parsers agree; they do not require consumers to change code unless they opt into new fields.

### 4.2 Readers: ignore unknown top-level keys (normative)

For each JSONL object line, parsers **must** map only the fields defined in §1.1–§1.2 (and any optional field explicitly added in a future revision). Any **additional top-level keys**—for example vendor-specific metadata, experimental keys, or **§4.3 `schemaVersion`** until this package defines parsing rules for it—**must** be **ignored**. They **must not** cause a line to be rejected when `timestamp`, `level`, and `message` satisfy §1.1 and optional fields present match their documented types.

Unknown keys are **not** surfaced on `StructuredLogRecord`; callers that need raw vendor keys must read the JSON line outside this mapping.

### 4.3 Writers and optional future `schemaVersion` (reserved)

- **Reserved name:** `schemaVersion` is reserved for a future optional top-level field (e.g. string or number identifying the contract snapshot used when writing the line). Existing JSONL files and writers that **omit** `schemaVersion` remain valid; omission means “implicit legacy / pre-versioned line” until a revision documents interpretation.
- Until documented here, **`schemaVersion` is treated like any other unknown key**: readers **ignore** it and still produce `StructuredLogRecord` from §1 fields only.
- When this document later defines semantics for `schemaVersion`, writers **may** emit it without breaking old readers that continue to ignore unknown keys.

**Writers (general):** May emit forward-compatible optional keys; old readers keep working until they opt into new semantics via an updated contract revision.
