# @openthrottle/nestjs-stripe — agent notes

NestJS Stripe module: config, Checkout sessions, product/price GraphQL, and webhook handling
over both a REST controller and a GraphQL mutation. Persistence is inverted — the app supplies
implementations of the ports in `tokens/stripe-ports.ts` via `forRootAsync`.

**Consumed by:** `openthrottle-server` only.

## Layout

- `src/modules/stripe.module.ts` — `StripeModule.forRootAsync({ useFactory, inject })`; the
  factory returns the port implementations (user lookup, subscriptions, processed-events).
- `src/tokens/stripe-ports.ts` — the port interfaces the host must implement, incl.
  `StripeProcessedEventsPort` (idempotency/replay protection).
- `src/controllers/webhooks.controller.ts` — `POST /webhooks/stripe` raw-body adapter.
- `src/graphql/stripe-webhook.resolver.ts` — `processStripeWebhook` mutation (base64 raw body).
- `src/config/stripe-config.ts` — `getStripeConfig()`, reads `STRIPE_SECRET_KEY` /
  `STRIPE_WEBHOOK_SECRET` from `process.env`.

## Invariants & gotchas

- Webhook signature verification needs the **raw** request bytes. This package assumes the
  host bootstraps Nest with `rawBody: true` so `req.rawBody` is a `Buffer`; the controller
  passes those exact bytes plus the `Stripe-Signature` header to the handler. The server-side
  bootstrap requirement is documented in
  [../../applications/openthrottle-server/AGENTS.md](../../applications/openthrottle-server/AGENTS.md);
  do not route the webhook body through a JSON parser first.
- Stripe delivers at-least-once and retries any non-2xx, so the handler records each
  `event.id` via `StripeProcessedEventsPort.markProcessed` before dispatch. The host's
  implementation must be race-safe (unique-constrained insert or Redis `SET NX`).
- The GraphQL resolvers/objects only load if the host registers this module's types in its
  schema — hence `@nestjs/graphql` + `graphql` are peer dependencies.
- Built, not source-first: real `build` target, `exports` → `dist`; see [../AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](./README.md) — full env var and public-API tables, REST vs GraphQL webhook paths.
