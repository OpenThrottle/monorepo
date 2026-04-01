# @openthrottle/nestjs-stripe

NestJS-oriented Stripe integration for OpenThrottle: environment-based config, checkout session creation, product catalog helpers (`StripeProductsService`), webhook handling (REST and a code-first GraphQL mutation), and injection tokens so subscription and user persistence stay in the app or `@openthrottle/nestjs-repositories`. The host app merges the GraphQL schema from this package when it registers Nest GraphQL.

## Installation

From the monorepo workspace:

```bash
pnpm add @openthrottle/nestjs-stripe -w
```

Or add `"@openthrottle/nestjs-stripe": "workspace:*"` in a consuming package and run `pnpm install` from the repository root.

This package is **private** to the workspace and is not published to the public registry.

Ensure peer dependencies are satisfied (see below). The `stripe` npm package is a **direct dependency** of this library.

## Environment variables

| Variable                | Required     | Description                                                                                                                                                              |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `STRIPE_SECRET_KEY`     | Yes          | Stripe API secret key (`sk_live_...` or `sk_test_...`). Read by `getStripeConfig()` from `process.env`. Throws at runtime if missing when config is resolved.            |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Webhook signing secret from the Stripe Dashboard (`whsec_...`). May be unset until webhooks are configured; the webhook handler must reject requests when it is missing. |

Optional / app-level (not read by `getStripeConfig()`):

| Variable               | Notes                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `OPENTHROTTLE_APP_URL` | Used by the server for checkout redirect base URL resolution via `ConfigService` (fallback chain may include `APP_URL`). |
| `APP_URL`              | Fallback public app URL when `OPENTHROTTLE_APP_URL` is unset.                                                            |

## Public API

Exports are defined from the package root (`@openthrottle/nestjs-stripe`).

| Export                          | Kind      | Description                                                                                                                          |
| ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `CheckoutService`               | class     | Creates Stripe Checkout sessions; wired via `StripeModule.forRootAsync`.                                                             |
| `StripeProductsService`         | class     | Lists active products and retrieves by id (`stripe.products.list` / `retrieve`); wired via `StripeModule.forRootAsync`.              |
| `StripeProductObject`           | class     | GraphQL `@ObjectType` for catalog fields; map from API with `stripeProductToGql`.                                                    |
| `stripeProductToGql`            | function  | Maps `Stripe.Product` to `StripeProductObject`.                                                                                      |
| `getStripeConfig`               | function  | Loads trimmed `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from `process.env`. Throws if the secret key is missing.               |
| `ProcessStripeWebhookInput`     | class     | GraphQL input type for `processStripeWebhook` (`rawPayloadBase64`, `stripeSignature`).                                               |
| `STRIPE_CHECKOUT_USER_PORT`     | token     | Injection token for `StripeCheckoutUserPort` (user lookup for checkout).                                                             |
| `STRIPE_SUBSCRIPTIONS_PORT`     | token     | Injection token for `StripeSubscriptionsPort` (subscription persistence from webhooks).                                              |
| `StripeConfig`                  | type      | `{ secretKey: string; webhookSecret: string }` — webhook secret may be `''` when not configured.                                     |
| `StripeModule`                  | class     | Dynamic module: `forRootAsync` registers checkout, `WebhooksController`, `StripeWebhookHandlerService`, and `StripeWebhookResolver`. |
| `StripeModuleAsyncOptions`      | interface | `useFactory` and related options for async registration.                                                                             |
| `StripeWebhookHandlerService`   | class     | Verifies signatures and handles Stripe events; single entrypoint `handleRawStripeWebhook(rawBody, signature)`.                       |
| `StripeWebhookProcessedPayload` | class     | GraphQL object returned by `processStripeWebhook`.                                                                                   |
| `StripeWebhookResolver`         | class     | GraphQL mutation `processStripeWebhook` (base64 raw body + signature).                                                               |
| `WebhooksController`            | class     | HTTP `POST …/webhooks/stripe` adapter; preferred for Stripe Dashboard delivery.                                                      |

## Migration and compatibility

Webhook **business logic** lives in `StripeWebhookHandlerService` only. The **HTTP route** (`WebhooksController`) and the **GraphQL mutation** (`processStripeWebhook`) both delegate to that service—there is no duplicated handler code.

- **Stripe Dashboard:** keep using **`POST {publicOrigin}/webhooks/stripe`** (plus any global API prefix). This path is **not deprecated**; it is the recommended way to receive native Stripe `POST` bodies and `Stripe-Signature` headers.
- **GraphQL:** use `processStripeWebhook` when a gateway or client forwards the same raw bytes (e.g. base64 in variables) and signature; required for integrations that cannot expose a dedicated raw-body HTTP route.

See sections **HTTP webhook route** and **GraphQL** below for configuration details.

## Peer dependencies

| Package           | Range      | Role                                                                                  |
| ----------------- | ---------- | ------------------------------------------------------------------------------------- |
| `@nestjs/common`  | `^11.0.0`  | Decorators, `Injectable`, HTTP exceptions, controllers.                               |
| `@nestjs/config`  | `^4.0.0`   | `ConfigService` for app URLs and non-Stripe config in checkout flows.                 |
| `@nestjs/core`    | `^11.0.0`  | `DynamicModule` / module lifecycle for `StripeModule`.                                |
| `@nestjs/graphql` | `^13.0.0`  | Code-first GraphQL types and `StripeWebhookResolver` (optional if you only use REST). |
| `graphql`         | `^16.11.0` | Required when using the GraphQL mutation.                                             |

## Raw body (webhooks)

Stripe signature verification needs the **raw** request body. The consuming Nest app must enable raw body preservation for the webhook route (e.g. `rawBody: true` where supported) so the handler receives a `Buffer`, not a parsed JSON object. OpenThrottle’s `openthrottle-server` enables this in `main.ts` when creating the Nest application.

## HTTP webhook route (Stripe Dashboard)

Point the Stripe Dashboard webhook destination at:

- **`POST {publicOrigin}/webhooks/stripe`** — same path the `WebhooksController` in this package registers (`@Controller('webhooks')` + `@Post('stripe')`). If the host sets a global prefix (e.g. `app.setGlobalPrefix('api')`), include it: `POST {publicOrigin}/api/webhooks/stripe`.

Stripe sends the **`Stripe-Signature`** header; the controller passes it and `req.rawBody` to `StripeWebhookHandlerService`. Unless you intentionally proxy raw bytes into the GraphQL mutation below, **use this HTTP URL** as the operational webhook endpoint.

## GraphQL (`processStripeWebhook`)

`StripeModule.forRootAsync` registers `StripeWebhookResolver`, which exposes mutation `processStripeWebhook`. Arguments are wrapped in `ProcessStripeWebhookInput`:

- **`rawPayloadBase64`** — standard base64 encoding of the **exact** bytes Stripe signed (same buffer as the native `POST` body).
- **`stripeSignature`** — value of the `Stripe-Signature` HTTP header.

The resolver decodes the payload to a `Buffer` and calls `StripeWebhookHandlerService.handleRawStripeWebhook` (same path as the REST controller). For Stripe Dashboard delivery, prefer the HTTP webhook route unless a gateway forwards raw bytes into this mutation. The host must configure Nest GraphQL so resolvers registered by `StripeModule` are part of the schema (see peer dependencies table).
</think>

<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
Read
