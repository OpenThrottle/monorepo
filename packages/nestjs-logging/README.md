# @openthrottle/nestjs-logging

NestJS logging utilities: durable **JSON Lines** log files plus optional **WebSocket** streaming (OpenClaw-style hybrid). Status: in active development; see [docs/openclaw-style-contract.md](./docs/openclaw-style-contract.md) for the frozen JSONL schema and Socket.IO control/push contract.

## Maintainer docs

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

In production, also wire **handshake authentication** for the logging namespace (for example validate `socket.handshake.auth.token` against a secret from `OT_LOG_WS_TOKEN` or your existing auth module) and restrict **CORS origin** on the host Socket.IO adapter; the gateway in this package sets `cors: { origin: true }` for developer convenience—tighten at the application level when exposing beyond localhost.

## WebSocket streaming and `@openthrottle/nestjs-websockets`

The Socket.IO gateway in this package follows the same Nest patterns as `@openthrottle/nestjs-websockets` (`@WebSocketGateway`, `@SubscribeMessage`, ack payloads). It does **not** import that package at runtime; keep your app on one Socket.IO adapter and one HTTP server bootstrap.

- **Peer (optional):** `@openthrottle/nestjs-websockets` is listed as an **optional** peer so consumers can align versions and reuse the same workspace wiring as the scaffold gateway. JSONL file logging works without WebSockets.
- **Enable:** `NestjsLoggingModule.forRoot({ logDirectory: '…', websocket: { enabled: true } })`, or `forRootAsync({ registerWebsocketGateway: true, … })` when the async factory returns `websocket.enabled: true` (Nest needs the gateway class at module definition time; set `websocketGatewayNamespace` to match your resolved `websocket.namespace`).

See [docs/openclaw-style-contract.md](./docs/openclaw-style-contract.md) for event names and payloads.

## Limits and operational notes

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

**yarn:**

```bash
yarn add @openthrottle/nestjs-logging
```

## Tests

From the repo root:

```bash
pnpm nx run @openthrottle/nestjs-logging:test
```

Vitest covers:

- **JSONL sink** (`FileLogJsonlSink`): append/flush, level filter, basename / pattern, size and daily rotation, optional `correlationId` / `traceId` on disk.
- **File-backed hub** (`FileBackedLogStreamHub`): tail and byte-offset replay, missing file, partial leading line when tailing from a mid-file window, fan-out and subscriber error isolation, integration with the sink for live + replay consistency.
- **Socket.IO gateway**: filter matching, connection guard when WebSocket is disabled, subscribe/unsubscribe/history/replay/tail acks, backpressure `log.notice`, and lifecycle (`handleDisconnect`, `onModuleDestroy`) using a **mock Socket.IO client** and mock `LogStreamHub` I/O.
- **Module** (`NestjsLoggingModule`): `forRoot` / `forRootAsync` token wiring and dynamic registration of the gateway when enabled.
