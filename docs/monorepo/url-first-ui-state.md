# URL-first UI state (Remix / React Router)

Conventions for backing **dialogs, sheets, drawers**, **multi-step flows**, and **list/search** UI with the URL in Remix and React Router 7 apps. This doc implements the **define conventions** step for plan `6a062008-7cae-4922-8152-89f9f17ed257` and aligns with research outcomes in [URL-first overlays learnings](../plans/6bb89ac6-url-first-react-router-shadcn-learnings.md) (plan `6bb89ac6`).

**Default posture:** control overlay roots from **search params** (or real nested routes when the overlay is a first-class route). Keep **Radix/Vaul primitives** controlled via `open` / `onOpenChange`; do not change primitive defaults in `@openthrottle/react-router-shadcn` until shared helpers prove their API (see rollout phasing in the plan).

**Reference implementation:** [`GlobalModal`](../../packages/react-router-ui-global/src/components/GlobalModal.tsx) in `@openthrottle/react-router-ui-global` binds a `Dialog` to a single search param and uses `setSearchParams(..., { preventScrollReset: true })`.

---

## 1. Search param namespacing

- **Use stable, feature-prefixed keys** so routes and layouts do not collide (`plansIssueSheet`, `dashDailyStatsModal`, not bare `open` or `id` at the root without context).
- **One param per concern** where practical: e.g. `?plansSheet=open&plansIssueId=uuid` instead of overloading one token for multiple meanings.
- **Optional registry:** in larger apps, maintain a small module or table of reserved keys per area to avoid cross-team collisions.

---

## 2. Replace vs push

| Goal                                                                          | Prefer                                                                                                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser Back** should dismiss the overlay (each open is a discrete step)    | `push` (React Router default for `setSearchParams` / `navigate` when `replace` is not set)                                                         |
| **Avoid** growing the history stack for repeated toggles or sync-only updates | `replace: true`                                                                                                                                    |
| **Align** param-only updates with existing overlay behavior                   | Match product intent: product “Back closes modal” → prefer **push** on open; “don’t clutter history” → **replace** on close or for incidental sync |

**Team rule:** pick one primary story per surface (e.g. “Back closes this sheet” → push when opening; optionally replace when closing if you want Back to skip the closed state—document the choice per route).

---

## 3. Nested overlays and param cleanup

- **Child-specific keys** (confirm dialog, nested picker, step suffix) must be removed when the **parent** closes so the URL does not retain orphan state after refresh or share.
- **Close parent:** delete the parent’s param **and** every child-only key in one `setSearchParams` / `navigate` update.
- **Implementation sketch:** keep a list of param names owned by each layer; closing layer \(L\) deletes `keys(L)` and any deeper keys you register under \(L\).

---

## 4. SSR, loaders, and client writes

| Boundary      | Responsibility                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Loader**    | Read **committed** URL (`request.url` / `new URL(request.url).searchParams`) for data needed on first paint and for SSR. Return shapes that match what the URL implies (e.g. selected id from `?entityId=`). |
| **Client**    | Update the URL with `useSearchParams` / `navigate` for interactions after hydration. Use **`preventScrollReset: true`** for param-only updates that should not jump scroll (see `GlobalModal`).              |
| **Hydration** | Avoid a first paint that assumes “closed” if the URL says “open” unless the loader also signals open state or you accept a brief client-only correction (document if intentional).                           |

**Read vs write:** loaders **read**; components/handlers **write**. Avoid duplicating “source of truth” in React state for the same fact the URL already carries unless you are in the **debounced search** exception below.

---

## 5. React Router semantics (functional updates)

- **`setSearchParams(updater)`** functional updates **do not queue** the way React `setState` does. If multiple updates run in one tick, **merge from the latest** `URLSearchParams` or construct one object and call `setSearchParams` once.
- Prefer **single batched** `new URLSearchParams(searchParams)` mutations before calling `setSearchParams`, like `GlobalModal` does in `onToggle`.

---

## 6. Scroll and focus

- For **search-param-only** navigation that keeps the user on the same document position, pass **`preventScrollReset: true`** in the options object to `setSearchParams` / `navigate`, consistent with [`GlobalModal`](../../packages/react-router-ui-global/src/components/GlobalModal.tsx).

---

## 7. Carve-out: debounced search and filters

**Problem:** mirroring every keystroke to the URL without discipline floods history and triggers excessive loader/refetch churn.

**Canonical pattern:**

1. **Local React state** holds the **live** input value (`useState`), so typing stays instant and controlled.
2. **Committed filter value** lives in the URL on a **debounced schedule** (team-default interval, e.g. 250–400 ms), **or** on **blur**, **or** on **Enter** (pick at least one commit path in addition to debounce for accessibility).
3. **`replace: true`** for debounced URL commits is usually correct so intermediate values do not pollute Back.
4. **Loader and useFetcher subscriptions** key off the **committed** param only—the debounced value in the URL—so SSR and refetches stay coherent.

**Anti-patterns:**

- Updating the URL on **every** keystroke with **push** (history noise).
- Debouncing the URL but never aligning **initial** local state from the loader/URL on navigation (stale input after Back/Forward).

**Documentation cross-link:** the reusable hook / proof integration for this carve-out is tracked as task work (“canonical debounced search ↔ URL pattern”); until then, follow the rules above at call sites.

---

## 8. Optional path segments vs query overlays

- **Query overlays:** good for **transient** same-route panels (sheet/dialog) without a dedicated route module.
- **Optional path segments / nested routes:** use when the overlay needs its **own loader**, shareable URL as a “page”, or distinct error boundaries. Tradeoffs are summarized in the [learnings doc](../plans/6bb89ac6-url-first-react-router-shadcn-learnings.md) (parallel routes vs `Outlet`).

---

## 9. Checklist (quick)

- [ ] Param keys are **feature-prefixed** and non-colliding.
- [ ] **replace vs push** matches whether Back should dismiss or history should stay minimal.
- [ ] Closing a **parent** clears **child** query keys.
- [ ] Param-only UI updates use **`preventScrollReset`** where scroll preservation matters.
- [ ] Loader reads **committed** params; search inputs use **local + debounced/blur/Enter** commit unless exempted.
