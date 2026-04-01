# OpenThrottle payments: provider choice and integration approach

This document records the **narrowed provider choice** and **integration approach** for OpenThrottle payments. It closes the “TBD” in the admin portal plan: no implementation until this is agreed; implementation follows the existing plan task “Payments: API integration in openthrottle-server (after TBD)” (and any detailed-spec task).

**Plan-Id:** 39aeaefe-7d37-4906-950b-e63526006bb0 · **Task:** Payments: research provider and document choice (c5a03001-5738-47f6-895a-8515b9f359c3)

---

## 1. Integration approach (locked in)

**Approach: Hybrid (Solution C).**

- **Rationale:** Aligns with [payments-review-and-next-step.md](./payments-review-and-next-step.md): OpenThrottle keeps product/plan and entitlement semantics in its own API (openthrottle-server); the provider handles payment UI and (optionally) tax/compliance. Balance of control vs effort; no full “own API” lifecycle/dunning unless needed later.
- **Flow:** NestJS creates a checkout session (or equivalent); React Router shows pricing/plan UI and “Upgrade” / “Manage” actions that call openthrottle-server; server talks to the provider and returns redirect URL or opens provider overlay; after payment, provider webhooks hit openthrottle-server; server updates entitlement/plan state and keeps mapping provider customer/subscription IDs to Cortex users.

---

## 2. Provider choice

**Recommended default: Stripe.**

| Criterion            | Stripe                                                             | Paddle                                        | Lemon Squeezy                                                       |
| -------------------- | ------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------- |
| **SDK / NestJS fit** | Strong Node SDK; widely used with NestJS                           | Node SDK; good fit                            | REST only; no official Node SDK                                     |
| **Tax / compliance** | You handle tax; optional [Stripe Tax](https://stripe.com/docs/tax) | **Merchant of record** — provider handles tax | **Merchant of record** — provider handles tax                       |
| **Docs / examples**  | Most examples and community content                                | Good                                          | Adequate                                                            |
| **Checkout**         | Checkout (hosted or embedded), Payment Links                       | Paddle.js overlay                             | Hosted Checkout page                                                |
| **License keys**     | Not built-in                                                       | Not built-in                                  | [License API](https://docs.lemonsqueezy.com/) if needed for CLI/IDE |

**When to choose an alternative:**

- **Paddle:** Prefer when you want **merchant of record** (tax and compliance fully handled by the provider) and are fine with overlay checkout and Paddle’s data model.
- **Lemon Squeezy:** Prefer when you want **MoR** and **license-key-style entitlements** (e.g. for CLI or IDE activation); otherwise Stripe or Paddle is sufficient.

**Shortlist for implementation:** Stripe (default), Paddle, Lemon Squeezy. Proceed with **one** provider for the first implementation; the Hybrid approach keeps entitlement logic in openthrottle-server so switching or adding a second provider later is feasible at the checkout/webhook boundary.

---

## 3. Integration approach (summary)

- **openthrottle-server (NestJS):**
  - **Checkout:** Module that creates a checkout session (Stripe Checkout Session, Paddle overlay params, or Lemon Squeezy Checkout) with the chosen provider; returns URL or client payload for redirect/overlay.
  - **Webhooks:** Dedicated endpoint(s) (e.g. `POST /webhooks/stripe`) to receive provider events; verify signatures; update subscription/entitlement state in Cortex (or openthrottle DB); keep handlers idempotent.
  - **Entitlements:** Product/plan and “current subscription” are owned by your API; map provider customer/subscription IDs to your user/plan model; expose via GraphQL for admin and developer UIs.
- **Frontend (React Router — openthrottle-admin and/or openthrottle-developer):**
  - Pricing/plan UI and “Upgrade” / “Manage” actions call openthrottle-server GraphQL (or REST); server creates session and returns redirect/overlay info; user completes payment on provider’s page/overlay; return URLs point back to your app; webhook updates state so UI reflects new plan.
- **Auth:** Same JWT and user store as today; entitlement checks (e.g. “has Pro”) are resolved server-side from subscription/plan data, not from client.

Details (webhook contract, exact GraphQL shape, rollout) belong in a **detailed spec and implementation plan** (see follow-up tasks below).

**Environment (openthrottle-server):** `STRIPE_SECRET_KEY` (required for checkout and webhooks). `STRIPE_WEBHOOK_SECRET` (required when handling webhooks; use Stripe CLI or dashboard to get the signing secret for `POST /webhooks/stripe`). Optional: `OPENTHROTTLE_APP_URL` or `APP_URL` for success/cancel URLs.

---

## 4. Follow-up tasks

No implementation of payments in openthrottle-server or admin UI until the provider (and any MoR preference) is confirmed. After that:

1. **Detailed spec and implementation plan (recommended next step)**  
   Create a spec for the Hybrid approach with the chosen provider: NestJS modules (checkout session, webhooks), webhook contract, React Router flows (pricing/plan UI, upgrade/manage), entitlement model, and rollout steps. This can be tracked as a dedicated Cortex task (e.g. “Payments: detailed spec and API design”) if not already covered.

2. **API integration in openthrottle-server**  
   Implement the payments provider integration in openthrottle-server (GraphQL or internal services for subscriptions/billing) per the plan task **8eeeaba2-0f2a-4cd7-ab3c-7aee38fb028b** (“Payments: API integration in openthrottle-server (after TBD)”). Do this after (or in parallel with) the detailed spec so that webhook contract and entitlement model are agreed.

---

## 5. Related docs

| Topic                     | Document                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Providers and models      | [payments-research-providers-and-models.md](./payments-research-providers-and-models.md) |
| Trade-offs by approach    | [payments-trade-off-matrix.md](./payments-trade-off-matrix.md)                           |
| Solution sketches (A/B/C) | [payments-solution-sketches.md](./payments-solution-sketches.md)                         |
| Review and recommendation | [payments-review-and-next-step.md](./payments-review-and-next-step.md)                   |
| Admin portal phasing      | [admin-portal-architecture.md](./admin-portal-architecture.md)                           |
