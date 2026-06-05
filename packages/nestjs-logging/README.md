# @openthrottle/nestjs-logging

NestJS logging utilities: durable **JSON Lines** log files plus optional **WebSocket** streaming (OpenClaw-style hybrid). Status: in active development; see [docs/openclaw-style-contract.md](./docs/openclaw-style-contract.md) for the frozen JSONL schema and Socket.IO control/push contract.

## Maintainer docs

- [BullMQ run output: placement discovery (keyed JSONL vs global sink)](./docs/bullmq-run-output-discovery.md) — where keyed per-job writers live, hub/rotation/DI tradeoffs.
- [BullMQ run output: path, sanitization, FD limits, flush/close](./docs/bullmq-run-output-spec.md) — normative spec for keyed writer implementation and processor lifecycle.
- [OpenClaw-style contract (JSONL + WebSocket)](./docs/openclaw-style-contract.md) — line schema, `logs.*` messages, backpressure, and upstream OpenClaw reference.

## Quick start (`AppModule`)

**Static options** — JSONL only (WebSocket gateway not registered):

```typescript
import { Module } from '@nestjs/common';
import { NestjsLoggingModule } from '@openthrottle/nestjs-logging';

@Module({
  imports: [
    NestjsLoggingModule.forRoot({
      logDirectory: '/var/log/my-app',
      fileBasename: 'application',
    }),
  ],
})
export class AppModule {}
```

**WebSocket tail/replay** — register the gateway on the same HTTP server / Socket.IO adapter as the rest of your app (`websocket.enabled: true`):

```typescript
NestjsLoggingModule.forRoot({
  logDirectory: '/var/log/my-app',
  websocket: {
    enabled: true,
    namespace: '/ot-logging',
  },
});
```

**Async registration** — typical pattern: read paths and feature flags from your own env or `ConfigService`. This package does **not** read `process.env` itself; wire flags in `useFactory`.

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestjsLoggingModule } from '@openthrottle/nestjs-logging';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NestjsLoggingModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      registerWebsocketGateway: true,
      websocketGatewayNamespace: '/ot-logging',
      useFactory: (config: ConfigService) => {
        const maxReplayRaw = config.get<string>('OT_LOG_MAX_REPLAY_LINES');
        const maxReplayBytesRaw = config.get<string>('OT_LOG_MAX_REPLAY_BYTES');
        const maxPendingRaw = config.get<string>('OT_LOG_WS_MAX_PENDING');

        return {
          logDirectory: config.getOrThrow<string>('OT_LOG_DIRECTORY'),
          maxReplayBytes:
            maxReplayBytesRaw !== undefined && maxReplayBytesRaw !== ''
              ? Number(maxReplayBytesRaw)
              : undefined,
          maxReplayLines:
            maxReplayRaw !== undefined && maxReplayRaw !== ''
              ? Number(maxReplayRaw)
              : 10_000,
          websocket: {
            enabled: config.get<string>('OT_LOG_WS_ENABLED') === 'true',
            maxPendingRecordsPerSocket:
              maxPendingRaw !== undefined && maxPendingRaw !== ''
                ? Number(maxPendingRaw)
                : 1_000,
            namespace:
              config.get<string>('OT_LOG_WS_NAMESPACE') ?? '/ot-logging',
          },
        };
      },
    }),
  ],
})
export class AppModule {}
```

**Important:** With `forRootAsync`, Nest must know at **module compile time** whether to include the gateway class. Set `registerWebsocketGateway: true` when your factory can return `websocket.enabled: true` in any environment you care about; keep `websocketGatewayNamespace` aligned with the resolved `websocket.namespace` (both default to `/ot-logging`).

## Writing to JSONL

After `NestjsLoggingModule` is registered, the active file lives under **`logDirectory`** (created on startup). Names follow **`fileBasename`** and optional **`rotation`** / **`fileNamePattern`**; the default is append-only **JSON Lines**—one **JSON object per line**, not a single editable JSON document.

**Programmatic writes:** inject the **`LOG_JSONL_SINK`** token (type **`LogJsonlSink`**), call **`append`** with a **`StructuredLogRecord`**, then **`flush()`** when you need the line on disk immediately (the sink also flushes on an interval).

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type {
  LogJsonlSink,
  StructuredLogRecord,
} from '@openthrottle/nestjs-logging';
import { LOG_JSONL_SINK } from '@openthrottle/nestjs-logging';

@Injectable()
export class ExampleService {
  constructor(
    @Inject(LOG_JSONL_SINK)
    private readonly logJsonlSink: LogJsonlSink,
  ) {}

  writeSample(): void {
    const record: StructuredLogRecord = {
      context: 'ExampleService',
      correlationId: undefined,
      level: 'log',
      message: 'Structured line appended to JSONL.',
      timestampIso: new Date().toISOString(),
      traceId: undefined,
    };

    this.logJsonlSink.append(record);
    void Promise.resolve(this.logJsonlSink.flush());
  }
}
```

Only records whose **`level`** is included in the module’s **`levels`** option are written; others are ignored by the sink. Optional **`correlationId`** / **`traceId`** are persisted when set.

**Not wired automatically:** your app’s usual Nest **`LoggerService`** / Winston setup (for example from `@openthrottle/nestjs-modules`) does **not** stream into these files unless you build that bridge yourself. Use **`LOG_JSONL_SINK`** (or integrate at the transport layer) to emit JSONL lines.

### BullMQ per-job run transcripts (`KeyedJsonlWriter`)

Per-queue, per-job Ralph **stdout/stderr** is a **separate** concern from the single application JSONL stream: use **`KeyedJsonlWriter`** (same package) with its own base directory, lazy open, LRU FD cap, and per-job `close` after the processor finishes. Lines are JSON objects with `timestamp`, `type` (`stdout` | `stderr`), and `data` (string). Do **not** point `runOutputBaseDirectory` at the same tree as `logDirectory` unless you intend to mix artifacts—see [bullmq-run-output-spec.md](./docs/bullmq-run-output-spec.md).

**openthrottle-server:** set **`OT_BULLMQ_RUN_OUTPUT_DIR`** to an absolute or cwd-relative directory. When set, `PlansProcessor` appends spawn/worktree Ralph chunks to `{base}/{sanitizedQueue}/{sanitizedJobId}.jsonl` and call **`close(queueName, jobId)`** in a `finally` block after each job. On worker shutdown they best-effort call **`closeAll()`**. When the env var is unset, no writer is registered and behavior matches the previous logger-only path.

**Retention (optional):** export **`pruneKeyedRunOutputDirectory`** from this package for custom cron or ops scripts. OpenThrottle’s API also supports **throttled post-job pruning** when `OT_BULLMQ_RUN_OUTPUT_DIR` is set and at least one of **`OT_BULLMQ_RUN_OUTPUT_MAX_AGE_MS`** or **`OT_BULLMQ_RUN_OUTPUT_MAX_TOTAL_BYTES`** is set; see the BullMQ run output table below and [bullmq-run-output-spec.md](./docs/bullmq-run-output-spec.md) §7.

### Example environment flags (app-defined)

This package does not read environment variables directly. Map the names below (or your own) inside `useFactory` / config as shown above.

| Variable                  | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `OT_LOG_DIRECTORY`        | Directory for `*.jsonl` files (required in options as `logDirectory`).  |
| `OT_LOG_WS_ENABLED`       | When `true`, enable the logging Socket.IO namespace.                    |
| `OT_LOG_WS_NAMESPACE`     | Override namespace path (must start with `/`).                          |
| `OT_LOG_MAX_REPLAY_LINES` | Cap for `logs.history` / `logs.tail` / `logs.replay` line counts.       |
| `OT_LOG_MAX_REPLAY_BYTES` | Approximate max bytes read per tail/replay window from disk (optional). |
| `OT_LOG_WS_MAX_PENDING`   | Per-socket pending `log.record` buffer before oldest lines are dropped. |

**BullMQ run output (openthrottle-server only):**

| Variable                                     | Purpose                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `OT_BULLMQ_RUN_OUTPUT_DIR`                   | Base directory for per-job JSONL transcripts from plan/workflow workers. Unset = disabled.                   |
| `OT_BULLMQ_RUN_OUTPUT_MAX_AGE_MS`            | Delete run transcript files older than this age (mtime), when set with a run output dir.                     |
| `OT_BULLMQ_RUN_OUTPUT_MAX_TOTAL_BYTES`       | After age pruning, cap total bytes of remaining `*.jsonl` / `*.log` under the run output dir (oldest first). |
| `OT_BULLMQ_RUN_OUTPUT_PRUNE_MIN_INTERVAL_MS` | Minimum milliseconds between prune passes after job close (default 300000).                                  |

In production, also wire **handshake authentication** for the logging namespace (for example validate `socket.handshake.auth.token` against a secret from `OT_LOG_WS_TOKEN` or your existing auth module) and restrict **CORS origin** on the host Socket.IO adapter; the gateway in this package sets `cors: { origin: true }` for developer convenience—tighten at the application level when exposing beyond localhost.

## WebSocket streaming and `@openthrottle/nestjs-websockets`

The Socket.IO gateway in this package follows the same Nest patterns as `@openthrottle/nestjs-websockets` (`@WebSocketGateway`, `@SubscribeMessage`, ack payloads). It does **not** import that package at runtime; keep your app on one Socket.IO adapter and one HTTP server bootstrap.

- **Peer (optional):** `@openthrottle/nestjs-websockets` is listed as an **optional** peer so consumers can align versions and reuse the same workspace wiring as the scaffold gateway. JSONL file logging works without WebSockets.
- **Enable:** `NestjsLoggingModule.forRoot({ logDirectory: '…', websocket: { enabled: true } })`, or `forRootAsync({ registerWebsocketGateway: true, … })` when the async factory returns `websocket.enabled: true` (Nest needs the gateway class at module definition time; set `websocketGatewayNamespace` to match your resolved `websocket.namespace`).

See [docs/openclaw-style-contract.md](./docs/openclaw-style-contract.md) for event names and payloads.

## Limits and operational notes

- **Deterministic emission:** Each JSONL line’s **root** object is written with the canonical top-level key order in [§1.2.2](./docs/openclaw-style-contract.md#122-canonical-top-level-key-order-writers) so the same logical fields serialize to the same bytes; nested `extra` is unchanged. Readers stay order-agnostic and forward compatible—see [Determinism](./docs/openclaw-style-contract.md#determinism-writers-vs-readers) and §4.2 in the contract doc.
- **Forward compatibility:** JSONL lines may include extra top-level keys not listed in the contract. `parseJsonlLineToStructuredRecord` ignores unknown keys and still returns a valid record when required fields are present (normative readers rule in §4.2). The contract reserves an optional future top-level `schemaVersion` (§4.3) without invalidating lines that omit it. Maintainers bump this contract doc when introducing **required** fields or breaking semantics (§4.1)—see [Versioning and forward compatibility](./docs/openclaw-style-contract.md#4-versioning-and-forward-compatibility).
- **Replay:** `maxReplayLines` (default 10,000) caps history/tail/replay responses; large values increase memory while serving a client.
- **Backpressure:** `websocket.maxPendingRecordsPerSocket` (default 1,000) bounds buffered `log.record` events per socket; overflow drops the oldest pending records and emits `log.notice` with `type: 'backpressure'`.
- **Rotation:** Size and daily rotation are supported on the JSONL sink; replay reads the **active** file (see contract doc for multi-file behavior).
- **Security:** WebSocket streaming is **off** unless `websocket.enabled` is `true`. Use handshake auth, strict CORS/origin, and a reverse proxy path in production (see prior plan tasks / contract doc).

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-logging
```

**npm:**

```bash
npm install @openthrottle/nestjs-logging
```

## Tests

From the repo root:

```bash
pnpm nx run @openthrottle/nestjs-logging:test
```

Vitest covers:

- **JSONL payload** (`jsonl-payload`): serialize/parse round-trip, optional fields, and forward compatibility (unknown top-level keys still parse core fields per contract §4).
- **JSONL sink** (`FileLogJsonlSink`): append/flush, level filter, basename / pattern, size and daily rotation, optional `correlationId` / `traceId` on disk.
- **File-backed hub** (`FileBackedLogStreamHub`): tail and byte-offset replay, missing file, partial leading line when tailing from a mid-file window, fan-out and subscriber error isolation, integration with the sink for live + replay consistency.
- **Socket.IO gateway**: filter matching, connection guard when WebSocket is disabled, subscribe/unsubscribe/history/replay/tail acks, backpressure `log.notice`, and lifecycle (`handleDisconnect`, `onModuleDestroy`) using a **mock Socket.IO client** and mock `LogStreamHub` I/O.
- **Module** (`NestjsLoggingModule`): `forRoot` / `forRootAsync` token wiring and dynamic registration of the gateway when enabled.
