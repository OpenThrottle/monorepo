# OpenThrottle payments: review and next step

Review of the three solution approaches and recommended next action. Context: [provider research](./payments-research-providers-and-models.md), [trade-off matrix](./payments-trade-off-matrix.md), [solution sketches](./payments-solution-sketches.md).

---

## 1. Summary of the three approaches

| Approach              | One-line                                                                                                | Best when                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **A. Own API**        | NestJS owns full payment surface (routes, webhooks, subscription state); provider SDK in backend.       | You need max control, portability, and are willing to invest in lifecycle/dunning/tax.                  |
| **B. Fully external** | Minimal backend: create session/link, redirect; one webhook handler for entitlements.                   | You want to ship fastest and can accept provider UX and data lock-in.                                   |
| **C. Hybrid**         | Provider checkout/overlay; your API owns products, plans, and entitlements; webhooks map to your state. | You want a balance: your product/plan semantics and access control, provider payment UI and compliance. |

---

## 2. Recommendation

**Default recommendation: Solution C (Hybrid)** for OpenThrottle:

- **Product/entitlement ownership**: OpenThrottle already has plans, tasks, and access semantics; keeping “plans” and “current subscription” in your API (NestJS) fits the existing model and keeps auth/entitlement checks server-side.
- **Effort vs control**: Hybrid avoids the full lifecycle and dunning work of Own API while giving more control and portability than Fully external. Lock-in is at the checkout boundary; entitlement and plan model stay in your API.
- **React Router + NestJS**: NestJS creates checkout session (or opens overlay); React Router shows your pricing/plan UI and calls your API to “upgrade” or “manage”; webhooks update entitlement state. Fits the current stack without redesign.

**Consider Solution B (Fully external)** if the only goal is to accept payments as fast as possible and you are comfortable with provider-owned UX and minimal backend.

**Consider Solution A (Own API)** only if you have a clear need for full control (e.g. custom dunning, multi-provider strategy, or strict data residency) and capacity for the higher dev and maintenance cost.

---

## 3. Open questions for follow-up (if not ready to lock in)

- **Provider choice**: Within the chosen approach (e.g. Hybrid), which provider to use first? Stripe (strong SDK, Stripe Tax), Paddle (MoR, tax handled), or Lemon Squeezy (MoR, simpler API, license keys if needed).
- **Merchant of record**: Do you want tax/compliance handled by the provider (Paddle, Lemon Squeezy) or by you with Stripe Tax? Affects provider shortlist.
- **Time-to-market vs control**: If the priority is “live in weeks,” B is fastest; if “own plan/entitlement semantics and still ship in a few months,” C is the better default.
- **License keys**: If OpenThrottle will use license-key-style entitlements (e.g. for CLI or IDE), Lemon Squeezy’s License API may be relevant; otherwise Stripe or Paddle are sufficient.

---

## 4. Decision and next step

**Decision:** Recommend **Solution C (Hybrid)** for OpenThrottle. Proceed to a detailed spec and implementation plan for C unless open questions (provider choice, MoR) need to be resolved first.

- **Next action (recommended):** Create a **detailed spec and implementation plan** for the Hybrid approach: provider choice (Stripe / Paddle / Lemon Squeezy), NestJS modules (checkout session, webhooks), webhook contract, React Router flows (pricing/plan UI, upgrade/manage), entitlement model, and rollout steps.
- **If open questions block:** Resolve provider/MoR and time-to-market preferences (see §3), then lock A, B, or C and create the detailed spec.
