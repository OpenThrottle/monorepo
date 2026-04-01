# OpenThrottle payments: providers and integration models

Research for **subscription-based** pricing (recurring + yearly lump-sum). This doc lists relevant providers and how each fits: **own API**, **hosted checkout/links**, or **hybrid** (embedded/overlay UI + your API). Subscriptions and one-time/yearly support are noted.

_Plan-Id: 48afab10-3ce9-4d7b-8f13-27fcea1a32b4 · Task: Research providers and integration models_

---

## 1. Provider overview

| Provider          | Direct API (NestJS + SDK) | Hosted checkout / links          | Hybrid (embedded/overlay + your API)                   | Subscriptions | One-time / yearly                      |
| ----------------- | ------------------------- | -------------------------------- | ------------------------------------------------------ | ------------- | -------------------------------------- |
| **Stripe**        | Yes (REST + Node SDK)     | Yes (Checkout, Payment Links)    | Yes (Checkout embedded, Elements)                      | Yes           | Yes (annual via subscription interval) |
| **Paddle**        | Yes (REST + Node SDK)     | Yes (Paddle.js overlay checkout) | Yes (open overlay from your app, API for state)        | Yes           | Yes (monthly/annual prices)            |
| **Lemon Squeezy** | Yes (REST API)            | Yes (Checkout API → hosted page) | Yes (create checkout, redirect/embed, webhooks to you) | Yes           | Yes (one-time + subscriptions)         |

---

## 2. Per-provider summary

### Stripe

- **Own API**: Full control via REST and [Stripe Node SDK](https://stripe.com/docs/api); NestJS can call Customers, Subscriptions, Invoices, Payment Intents, Checkout Sessions. You implement routes, webhooks, and subscription state.
- **Hosted**: [Checkout](https://stripe.com/docs/payments/checkout) (Stripe-hosted page) or [Payment Links](https://stripe.com/docs/payments/payment-links); minimal backend (create session/link, redirect; webhooks for fulfillment).
- **Hybrid**: Checkout can be used as **embedded form** on your site (Checkout Sessions, same API); or [Elements](https://stripe.com/docs/payments/elements) for fully custom UI with your backend creating PaymentIntents/SetupIntents.
- **Recurring vs one-time/yearly**: Subscriptions with configurable billing interval (monthly, yearly, etc.); one-time payments via Checkout or Payment Intents. Yearly = subscription with `interval: 'year'` or equivalent.

### Paddle

- **Merchant of record**: Handles tax, compliance, and payment methods across many markets.
- **Own API**: [Paddle Billing API](https://developer.paddle.com/) + [Node SDK](https://github.com/PaddleHQ/paddle-node-sdk); create customers, subscriptions, prices, and manage lifecycle from NestJS.
- **Hosted / hybrid**: [Paddle.js](https://developer.paddle.com/) `Paddle.Checkout.open({ items: [{ priceId, quantity }] })` opens an **overlay checkout** (hosted by Paddle); you pass price IDs from your backend. Fits “minimal backend” (you create prices in Paddle, frontend opens checkout) or “hybrid” (your API owns product/entitlement logic, Paddle handles payment UI and webhooks).
- **Recurring vs one-time/yearly**: Subscriptions and one-time products; supports monthly and annual pricing (e.g. separate price IDs for monthly vs yearly). Webhooks for subscription and invoice lifecycle.

### Lemon Squeezy

- **Merchant of record**: Tax and compliance handled by Lemon Squeezy.
- **Own API**: [REST API](https://docs.lemonsqueezy.com/) for Stores, Products, Variants, Prices, Customers, Orders, Subscriptions, Checkouts, Webhooks, and [License API](https://docs.lemonsqueezy.com/) for license-key validation (relevant if OpenThrottle uses license keys).
- **Hosted / hybrid**: Create a **Checkout** via API; customer is sent to a Lemon Squeezy–hosted page or can use hosted payment links. Your backend creates checkouts and subscribes to webhooks for orders/subscriptions; fits hosted or hybrid (your API for products/entitlements, their UI for payment).
- **Recurring vs one-time/yearly**: Subscriptions and one-time orders; supports different price intervals (e.g. monthly vs yearly). Good fit for digital products and SaaS.

---

## 3. Integration model fit (short)

- **Own API integration**: **Stripe** and **Paddle** have the strongest SDK/API surface for NestJS to own the full flow; **Lemon Squeezy** is API-first and works from NestJS but has no official NestJS SDK (use REST or community client).
- **Fully external (minimal backend)**: All three support “create session/link/checkout → redirect user → handle webhooks.” **Stripe** Payment Links and **Paddle** overlay need almost no custom UI; **Lemon Squeezy** Checkout links similarly.
- **Hybrid (embedded/overlay + your API)**: **Stripe** (Checkout embedded or Elements) and **Paddle** (overlay from your React app, API for state) are the most documented; **Lemon Squeezy** fits hybrid by creating checkouts from your API and using webhooks for entitlements.

---

## 4. Other providers (brief)

- **PayPal** (Braintree / PayPal Checkout): Subscriptions and one-time; hosted or SDK; more focus on PayPal brand and wallet.
- **Adyen**: Enterprise-oriented; full API and hosted options; higher integration effort.
- **Paddle Classic** (legacy): Being superseded by Paddle Billing; new work should use Billing + Paddle.js.

For OpenThrottle (React Router + NestJS, subscription + yearly), **Stripe**, **Paddle**, and **Lemon Squeezy** are the most relevant to compare in the trade-off matrix and solution sketches.
