# OpenThrottle payments: trade-off matrix

One-page comparison for **subscription + yearly lump-sum** pricing. Context: React Router frontend (openthrottle-developer), NestJS backend (openthrottle-server). See [payments-research-providers-and-models.md](./payments-research-providers-and-models.md) for provider details.

_Plan-Id: 48afab10-3ce9-4d7b-8f13-27fcea1a32b4 · Task: Build trade-off matrix for OpenThrottle context_

---

## 1. Trade-off matrix (by integration approach)

| Dimension                     | Own API (NestJS + provider SDK)                                                                      | Fully external (hosted checkout / links)                                                                  | Hybrid (embedded/overlay + your API)                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Control over UX**           | High — your routes, forms, and flows.                                                                | Low — provider’s hosted page or overlay.                                                                  | Medium — checkout/overlay is provider’s; product/entitlement UI is yours.                           |
| **Control over data**         | High — you store and own customer/subscription state; sync from webhooks.                            | Low — provider holds billing data; you get webhook payloads and IDs.                                      | Medium — provider holds payment data; you own product/entitlement and user mapping.                 |
| **Dev effort**                | High — routes, webhooks, subscription lifecycle, idempotency, edge cases.                            | Low — create session/link, redirect; webhook handler for entitlements.                                    | Medium — webhook + product/entitlement API; optional embedded UI wiring.                            |
| **Compliance (PCI)**          | You avoid card data if using provider tokens/Checkout; direct card = PCI scope.                      | Provider handles — no card data on your side.                                                             | Provider handles payment UI — no card data on your side.                                            |
| **Compliance (tax)**          | You or provider: Stripe Tax / Paddle / Lemon Squeezy as MoR shifts tax to them.                      | Typically provider (Paddle, Lemon Squeezy as MoR; Stripe Tax if you enable).                              | Same as fully external when payment is provider-hosted.                                             |
| **Provider lock-in**          | Medium–high — API and webhook shapes are provider-specific; abstraction helps.                       | High — hosted UX and links are provider-specific.                                                         | Medium–high — checkout/overlay is provider-specific; your API can stay portable.                    |
| **Portability**               | Best if you abstract provider behind your own subscription/entitlement API.                          | Hardest — flow and UX tied to one provider.                                                               | Moderate — swap provider by changing checkout creation and webhooks; entitlements stay in your API. |
| **Recurring vs yearly**       | Full control — model both as subscriptions or one-time in your schema.                               | Supported by all (Stripe, Paddle, Lemon Squeezy) via products/prices.                                     | Same — provider products/prices; your API maps to plans (monthly/yearly).                           |
| **React Router + NestJS fit** | NestJS owns routes and webhooks; React Router can drive “upgrade”/“manage” pages that call your API. | React Router links to hosted URL or opens overlay; NestJS only creates link/session and handles webhooks. | React Router embeds/opens checkout; NestJS creates session and handles webhooks + entitlements.     |

---

## 2. React Router + NestJS fit (short)

- **Webhooks**: All approaches need a NestJS endpoint (e.g. `POST /webhooks/stripe`) to receive provider events. Verify signatures; update subscription/entitlement state; keep idempotent.
- **Server-side session vs client redirect**:
  - **Own API**: Session created in NestJS; React Router can stay on your domain and post to your API; redirect to provider only if using their hosted page for payment.
  - **Fully external**: NestJS returns redirect URL or payment link; user leaves your site, returns via success/cancel URL; session can be keyed by query param or cookie set on return.
  - **Hybrid**: NestJS creates Checkout Session (or equivalent); React Router redirects to provider URL or opens overlay; return URL points back to your app; NestJS webhook confirms and your app shows updated entitlement.
- **Auth**: Entitlements and “current plan” should be resolved server-side in NestJS (e.g. from JWT/session + subscription DB), not trusted from client.

---

## 3. Summary for choosing an approach

- **Own API**: Maximum control and portability; highest dev effort and ongoing maintenance (lifecycle, dunning, tax if not using MoR).
- **Fully external**: Fastest to ship; minimal backend; lowest control and highest lock-in to provider UX and data model.
- **Hybrid**: Balance of effort and control; your API owns products and access; provider owns payment UI and compliance; lock-in mainly at checkout boundary.

Use this matrix together with the [three solution sketches](./payments-solution-sketches.md) to pick one approach for a detailed spec. See [payments-review-and-next-step.md](./payments-review-and-next-step.md) for the review, recommendation, and next actions.
