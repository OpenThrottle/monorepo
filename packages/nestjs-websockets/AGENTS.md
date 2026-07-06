# @openthrottle/nestjs-websockets — agent notes

Transport-agnostic notification emission: the `@EmitNotification` method decorator,
`EmitNotificationInterceptor`, and the `EMIT_NOTIFICATION_EMITTER` injection token. Despite
the name, there is **no socket/gateway code here** — delivery is whatever the consumer binds
to the token.

**Consumed by:** `openthrottle-server` — interceptor bound as a global `APP_INTERCEPTOR` in
`app.module.ts`; `src/notifications/` binds the emitter token to an adapter over graphql-ws
PubSub. Also declared as an optional `peerDependency` of `@openthrottle/nestjs-logging`
(no code import there today).

## Layout

- `src/emit-notification.decorator.ts` — metadata only (`SetMetadata`), no DI; single entry,
  object form, or array form for multiple events per method.
- `src/emit-notification.interceptor.ts` — reads the metadata after the handler resolves and
  calls the injected emitter; defines `EMIT_NOTIFICATION_EMITTER` + `EmitNotificationEmitter`.

## Invariants & gotchas

- Built package (real `build`/`dev` targets, `exports` → `dist/`) — see [../AGENTS.md](../AGENTS.md).
- Wherever the interceptor is instantiated, a provider for `EMIT_NOTIFICATION_EMITTER` must be
  resolvable or Nest DI fails at bootstrap — test modules using the interceptor need a stub.
- A publish failure must never break the originating mutation: the interceptor catches, logs,
  and swallows emitter throws. `EmitNotificationEmitter.emit` is declared **synchronous**
  (`void`) — an async adapter must handle its own rejections; the interceptor won't see them.
- Nullish handler results (or a payload mapper returning nullish) skip emission silently by
  design — don't add warnings for that path.
- Keep this package transport-free: graphql-ws specifics (ws contexts have no `req`; the
  validated user rides `userId`) are the server's concern and are documented in
  [applications/openthrottle-server/AGENTS.md](../../applications/openthrottle-server/AGENTS.md).

## Pointers

- [docs/openthrottle/notifications-websockets-plan.md](../../docs/openthrottle/notifications-websockets-plan.md)
  — the platform contract: event names, payload types, resolver usage.
- [README.md](./README.md).
