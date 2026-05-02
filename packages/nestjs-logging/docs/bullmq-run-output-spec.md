# Spec: BullMQ keyed run output (path, sanitization, FD limits, flush/close)

**Audience:** implementers of `KeyedJsonlWriter` (or chosen name) and BullMQ processors. **Non-goals:** WebSocket tail of per-job files, merging run lines into `LOG_STREAM_HUB` / application JSONL.

**Depends on:** [bullmq-run-output-discovery.md](./bullmq-run-output-discovery.md) (placement: new service in `@openthrottle/nestjs-logging`).

---

## 1. Path layout

### 1.1 Base directory

- **Configurable root** `runOutputBaseDirectory` (exact option name TBD in implementation), **separate** from `logDirectory` used by `FileLogJsonlSink`.
- On first write for any key, the implementation **MUST** `mkdir(runOutputBaseDirectory, { recursive: true })` (same pattern as `FileLogJsonlSink.onModuleInit`).
- **No** writing run files under the active application JSONL basename or rotation stem; avoids tooling that tails “the app log” from ingesting Bull transcripts.

### 1.2 Relative path from key

Logical key parts (see §2):

- `queueName` — Bull queue name (string).
- `jobId` — Bull job id (string; may be numeric on wire but treat as opaque string).

**Layout (v1):** one file per job, nested by queue:

```text
{runOutputBaseDirectory}/{queueSegment}/{jobSegment}.jsonl
```

- **`queueSegment`:** sanitized `queueName` (§2).
- **`jobSegment`:** sanitized `jobId` (§2).
- **Extension:** `.jsonl` when `lineFormat === 'jsonl'` (§5); `.log` when `lineFormat === 'raw'` if we want a visual distinction—otherwise keep `.jsonl` for “line-delimited UTF-8” in both modes. **Recommendation:** use `.jsonl` only for JSONL mode; use `.log` for raw line capture to avoid mis-parsing as JSON.

### 1.3 Collision policy

If sanitization maps two different `(queueName, jobId)` pairs to the same `(queueSegment, jobSegment)`:

- **MUST NOT** silently overwrite without detection.
- **Resolution:** include a **short stable suffix** derived from a hash of the original `(queueName, jobId)` (e.g. first 8 hex chars of SHA-256 over `queueName\0jobId`) **only when** a collision is detected or when a segment would exceed max length (§2.3). File name example: `{jobSegment}~a1b2c3d4.log`.

---

## 2. Sanitization

### 2.1 Goals

- Safe on **POSIX** and **Windows**: no `..`, no path separators, no reserved device names on Windows (`CON`, `PRN`, …), no NUL.
- **Deterministic:** same inputs → same path (modulo explicit collision suffix).
- **Bounded length:** filesystem limits (~255 name components); trim with stable hash suffix when needed.

### 2.2 Character rules

Apply to both `queueName` and `jobId` **before** combining:

1. Reject **NUL** in input; if present, strip or replace with `_` (implementation choice documented in code; tests should cover).
2. Replace **path separators** (`/`, `\`), **control chars** (U+0000–U+001F, U+007F), and **Windows-forbidden** `<>:"|?*` with `_`.
3. Trim leading/trailing `.` and spaces (Windows); collapse repeated `_` optionally (cosmetic).
4. If the segment is empty after rules, use **`_`** as minimum non-empty segment.
5. **Reserved Windows names** (case-insensitive): if the whole segment matches `CON`, `PRN`, `AUX`, `NUL`, `COM1`…`COM9`, `LPT1`…`LPT9`, append `_` (e.g. `CON_`).

### 2.3 Max length

- Per segment cap **120 UTF-16 code units** (conservative under 255-byte limits for typical UTF-8). If truncation occurs, append `~` + 8-hex hash of **full original** string for that segment (same hash as §1.3).

### 2.4 Invalid logical key

- **`queueName` or `jobId` is empty string (after trim):** **MUST** throw a synchronous, documented error (e.g. `KeyedRunOutputWriterError`) with a stable `code` field. Callers must not enqueue writes without a valid job context.
- **Whitespace-only:** treat as empty after trim → same error.

---

## 3. Open FD cap and LRU eviction

### 3.1 Configuration

- **`maxOpenFiles`:** integer ≥ 1, default **64** (tunable). Represents maximum concurrently open `FileHandle`s for run output keys.

### 3.2 LRU semantics

- Each **open key** `(queueName, jobId)` maps to at most one `FileHandle`.
- On `append` / `write` for key **K**:
  - If **K** is already open, mark **K** as most-recently-used and write.
  - Else open **K**; if open count **> maxOpenFiles**, **close** (flush + `close`) the least-recently-used **other** key **before** opening **K**, or immediately after opening then evict—either order acceptable if cap is never exceeded by one.
- **Eviction:** `fd.sync()` then `fd.close()` (same durability expectation as explicit flush; see §4).

### 3.3 Module / process shutdown

- On provider `OnModuleDestroy` (if registered as Nest provider): **`closeAll()`** — flush+close every open handle, clear LRU. No background timer required for v1 unless periodic flush is enabled (§4.2).

---

## 4. Flush / close contract (API semantics)

All operations for a given key **MUST** be **serialized** (single-writer chain per key, analogous to `FileLogJsonlSink`’s `tail` promise) so lines are not interleaved and `close` does not race `append`.

### 4.1 Methods (normative intent)

| Method           | Behavior                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `appendRunChunk` | Lazy-open file for key; append one **line** or **record** per §5; update LRU.                                  |
| `flush(key)`     | If open: `fd.sync()`; no-op if never opened. Resolves when sync completes.                                     |
| `close(key)`     | If open: `flush` then `fd.close()`, remove from LRU; idempotent if already closed.                             |
| `flushAll()`     | `flush` for every open key (implementation may parallelize per key chains only if ordering per key preserved). |
| `closeAll()`     | `close` every open key; used on module destroy and optional test teardown.                                     |

### 4.2 BullMQ processor lifecycle (recommended)

1. **Job starts:** optional explicit no-op; first `appendRunChunk` opens the file.
2. **During job:** call `appendRunChunk` for stdout/stderr or structured events; optionally `flush` after **N** chunks or on **progress** events for crash visibility.
3. **Job completes or fails:** **`finally`** block calls **`close(jobId context)`** so FD is released and LRU slot freed even if the job throws.
4. **Worker shutdown:** Nest `OnModuleDestroy` runs `closeAll()`.

### 4.3 Errors

- **Disk full / permission denied:** propagate from `write` / `open` / `sync` on the serialized chain; do not swallow (processors can fail the job or retry per app policy).
- **Invalid key (§2.4):** throw before touching fs.

---

## 5. UTF-8 line format

Two supported modes (config-time, not per-call):

### 5.1 `jsonl` (default for structured run logs)

- Each `appendRunChunk` appends **one or more complete JSON lines** (implementation may batch, but each **line** is one JSON value).
- **Line delimiter:** `\n` only (Unix). No `\r` normalization required in v1; callers may normalize.
- **Object shape (minimum):** `timestamp` (ISO 8601 string), `type` (string enum, e.g. `stdout`, `stderr`, `meta`), `data` (string or object). Exact field names frozen in implementation + tests.
- **Serialization:** use `JSON.stringify(obj) + '\n'` in UTF-8. **Do not** use `serializeStructuredLogLine` unless we intentionally align with `StructuredLogRecord` / OpenClaw app log schema—**default is a separate schema** for run transcripts to avoid coupling.

### 5.2 `raw`

- Append **caller-supplied UTF-8 string** as-is; caller **MUST** include trailing `\n` if line-based; writer does not auto-add unless documented as “line helper” overload.
- Use for **literal process stdout** capture when JSON wrapping is undesirable.
- **Encoding:** UTF-8 only; invalid surrogate pairs → replacement char or throw (pick one in implementation; tests lock the choice).

---

## 6. Testing checklist (for implementation task)

- Sanitization matrix: `.`, `..`, `/`, `\`, Windows reserved, long Unicode, collision after truncation.
- LRU: open N+1 distinct keys with cap N; assert oldest closed (fd leak tests via open handle count or temp dir file lock where applicable).
- `close` idempotent; `closeAll` after partial failure.
- `jsonl` vs `raw` bytes on disk; `flush` visible before `close`.

---

## 7. Follow-ups (out of scope for this spec)

- Retention / TTL / disk quotas: separate task.
- Per-job Socket.IO: explicit non-goal for initial plan.
