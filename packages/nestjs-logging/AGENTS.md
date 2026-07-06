# @openthrottle/nestjs-logging — agent notes

Durable JSONL file logging (`NestjsLoggingModule.forRoot`/`forRootAsync`) with an optional
Socket.IO tail/replay gateway, plus `KeyedJsonlWriter` for per-queue/per-job BullMQ run
transcripts (a deliberately separate concern from the single app log stream).

**Consumed by:** `openthrottle-server` — `app.module.ts`, the `queue-job-logs` GraphQL
module, and `src/queues/bullmq-run-output.module.ts` / `bullmq-keyed-run-logging.ts`.

## Layout

- `src/nestjs-logging.module.ts` — `forRoot`/`forRootAsync`, dynamic gateway registration.
- `src/config/nestjs-logging.options.ts` — module options + defaults.
- `src/services/` — `FileLogJsonlSink`, `FileBackedLogStreamHub`, `KeyedJsonlWriter`,
  `pruneKeyedRunOutputDirectory` retention.
- `src/gateways/nestjs-logging-websocket.gateway.ts` — Socket.IO `logs.*` control/push.
- `docs/` — the frozen contract and the BullMQ run-output spec (normative).

## Invariants & gotchas

- Built package (real `build` target; the leftover `__build-package` placeholder key does
  not make it source-first — see [../AGENTS.md](../AGENTS.md)).
- `forRootAsync` gateway registration is a **compile-time** decision: Nest needs the
  gateway class at module definition time, so set `registerWebsocketGateway: true` and keep
  `websocketGatewayNamespace` aligned with the resolved `websocket.namespace` (both default
  `/ot-logging`). The factory returning `websocket.enabled: true` alone is not enough.
- The package never reads `process.env`. All `OT_LOG_*` / `BULLMQ_RUN_OUTPUT_*` names in
  the README are app-defined and wired in the consumer's `useFactory`.
- `@openthrottle/nestjs-websockets` is an **optional** peer (`peerDependenciesMeta`) for
  version alignment only — never imported at runtime; JSONL logging works without it.
- The JSONL line schema and Socket.IO message contract are frozen in
  [docs/openclaw-style-contract.md](./docs/openclaw-style-contract.md): writers emit the
  canonical top-level key order, readers ignore unknown keys; bump the contract doc before
  adding required fields or breaking semantics.
- The app's Winston `LoggerService` (from `@openthrottle/nestjs-modules`) does **not**
  auto-bridge into these files — inject the `LOG_JSONL_SINK` token and `append`/`flush`.
- The gateway ships `cors: { origin: true }` for local dev; consumers must add handshake
  auth and tighten CORS before exposing beyond localhost.

## Pointers

- [README.md](./README.md) — quick start, env-flag tables, backpressure/replay limits.
- [docs/bullmq-run-output-spec.md](./docs/bullmq-run-output-spec.md) — keyed-writer
  lifecycle (lazy open, FD cap, `close` in `finally`, prune throttling).
