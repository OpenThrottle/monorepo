# OpenThrottle payments: three solution sketches

Three high-level approaches for **subscription + yearly lump-sum** pricing. Context: React Router frontend (openthrottle-developer), NestJS backend (openthrottle-server). See [payments-research-providers-and-models.md](./payments-research-providers-and-models.md) for providers and [payments-trade-off-matrix.md](./payments-trade-off-matrix.md) for the trade-off matrix.

_Plan-Id: 48afab10-3ce9-4d7b-8f13-27fcea1a32b4 · Task: Define three high-level solution sketches_

---

## Solution A: Own API integration (NestJS + provider SDK)

NestJS owns the full payment surface: your API defines routes for creating customers, subscriptions, and (if needed) checkout sessions; you integrate the provider’s SDK (e.g. Stripe Node, Paddle Billing) inside NestJS services. The React Router app calls your backend to “start subscription” or “create checkout”; your backend talks to the provider, stores subscription and customer IDs in your DB, and exposes entitlements via your own GraphQL or REST. Webhooks from the provider hit NestJS endpoints that you implement; you verify signatures, update subscription state (active, past_due, canceled), and keep logic idempotent. Billing intervals (monthly vs yearly) are modeled in your schema and mapped to provider price IDs; you own dunning, retries, and (unless you use a merchant-of-record) tax/compliance or delegate via Stripe Tax / Paddle.

**Pros:** Full control over UX (your routes and flows), data (your DB is source of truth), and portability (abstract the provider behind your subscription API). Best fit if you want to swap providers or own every edge case later.
**Cons:** Highest dev effort (routes, webhooks, lifecycle, idempotency, dunning). PCI scope if you ever touch raw card data (avoid by using provider Checkout/tokens). Tax/compliance on you unless you use MoR (Paddle, Lemon Squeezy) or Stripe Tax.

---

## Solution B: Fully external (hosted checkout / payment links)

Minimal backend: NestJS only creates a session, payment link, or checkout URL from the provider (e.g. Stripe Payment Links, Paddle overlay link, Lemon Squeezy Checkout) and returns it to the frontend. The React Router app redirects the user to the provider’s hosted page (or opens the provider’s overlay); the user pays there and is sent back to your app via success/cancel URLs. NestJS does not implement full subscription CRUD; instead, a single webhook endpoint receives provider events (subscription created, renewed, canceled, payment failed) and updates your entitlement/plan state (e.g. “this user is now Pro monthly”). Product and price setup lives in the provider’s dashboard; recurring and yearly are configured as separate products or prices there.

**Pros:** Fastest to ship; minimal code (create link/session + one webhook handler). No PCI burden; provider handles payment UI and often tax (Paddle, Lemon Squeezy as MoR).
**Cons:** Low control over UX (provider’s page/overlay) and data (provider holds billing details; you get webhook payloads and IDs). Highest lock-in to one provider’s flow and data model; portability is poor.

---

## Solution C: Hybrid (embedded/overlay checkout + your API for products and access)

Checkout is still the provider’s UI (e.g. Stripe Checkout embedded or redirect, Paddle overlay, Lemon Squeezy hosted page), but your NestJS API owns product and entitlement logic. You define “products” or “plans” in your API (or in the provider’s dashboard and mirror in your DB); NestJS creates a checkout session or opens the overlay with the right price ID and success/cancel URLs. After payment, the provider sends webhooks to NestJS; you map provider customer/subscription IDs to your users and update entitlements. The React Router app shows your own pricing/plan UI and “Upgrade” or “Manage” actions that call your API, which in turn talks to the provider to create the session or open the overlay. Recurring vs yearly is represented in your API (e.g. plan tiers) and mapped to provider price IDs; you do not implement full subscription CRUD against the provider, but you own the mapping and access checks.

**Pros:** Balance of effort and control: provider handles payment UI and compliance; your API owns product/plan semantics and entitlements. Easier to change provider later than fully external (only checkout creation and webhook parsing change; entitlement model stays).
**Cons:** Medium dev effort (webhook handler, product/entitlement API, session creation). Lock-in at the checkout boundary (provider-specific session/overlay APIs). You still depend on provider for billing lifecycle (renewals, failures) unless you add more “own API” logic over time.

---

## Next step

Review these three with the [trade-off matrix](./payments-trade-off-matrix.md) and pick one for a **detailed spec and implementation plan**, or capture open questions for a follow-up decision (see task “Review and decide next step”).
