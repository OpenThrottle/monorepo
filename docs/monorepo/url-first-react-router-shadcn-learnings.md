# URL-first overlays for `@openthrottle/react-router-shadcn` — learnings and outcomes

**Plan ID:** `6bb89ac6-630f-4e99-be8b-05122f3ce64c`  
**Title:** URL-first state for react-router-shadcn (research & game plan)  
**Review artifact:** this file (generated from Ralph workflow output and task scope).

---

## Executive outcomes

- **Primitives:** `Dialog` and `Sheet` in `react-router-shadcn` are thin wrappers around **Radix Dialog** (`open` / `onOpenChange` / `defaultOpen`). **Drawer** wraps **Vaul**. There is **no** generic app-level overlay provider in the package; the notable provider-driven overlay pattern in-tree is **Sidebar → mobile Sheet** (`openMobile` / `setOpenMobile`).
- **Apps today:** Overlays are mostly **local or lifted React state** inside route modules; **search params** are used for lists/filters, **not** for sheet/dialog open flags. **GlobalModal** (`@openthrottle/react-router-ui-global`) already demonstrates **search-param–bound** dialog behavior with `preventScrollReset`.
- **Direction:** URL-first behavior is achieved by **controlled root state** wired to `useSearchParams` / `navigate` / loaders—not by replacing Radix. Optional **wrapper/hook** (`UrlSyncedOverlay`) centralizes param hygiene and replace-vs-push policy once patterns repeat.
- **Rollout:** Prefer **conventions → docs/examples → pilot routes → optional additive package helpers**. Avoid changing primitive defaults until adoption proves the abstraction (breaking-change risk).

---

## Task learnings (by task id)

### `a4fbe494-dc47-438a-ac10-606416c22742` — Inventory overlay primitives

- Dialog and Sheet share Radix **Dialog.Root** semantics; Drawer uses Vaul’s root API.
- **AlertDialog** follows the same controlled/uncontrolled pattern (separate primitive family).
- **Sidebar.tsx** is the clearest **context + Sheet** example: mobile branch renders **controlled** `Sheet` with `open={openMobile}` and `onOpenChange={setOpenMobile}`.

### `ef2b021b-3843-448d-979f-50fa171e1fc7` — Survey app usage

- **openthrottle-developer / admin / email:** mix of uncontrolled dialogs, controlled sheets/alerts, and parent-driven “confirm” flows—**no** `?modal=` / `?sheet=` patterns found.
- **GlobalScreen** is layout-only; **no** global overlay provider.
- **Pain points:** no deep link or refresh continuity for overlays; back button does not dismiss unless wired; SSR first paint does not reflect open overlay from URL; inconsistent controlled vs uncontrolled usage.

### `26a9a468-9798-425f-bbd3-12d60fe2163b` — React Router v7 URL patterns

- **`useSearchParams`:** use for same-route overlay state; functional updaters **do not queue** like React `setState`.
- **Parallel routes (Next-style slots):** not the RR7 model—use **nested routes + `Outlet`** when the overlay is a real route with loaders; use **search params** for transient same-page panels.
- **Optional path segments:** fit optional steps in the path; different tradeoffs vs query overlays.
- **`replace` vs `push`:** affects whether **browser back** closes the overlay; **`preventScrollReset`** aligns with existing `GlobalModal` usage for param-only updates.

### `c36c0374-f05a-48f8-9f90-df08e5191df3` — Adapter vs controlled vs wrapper

- **(A) Controlled at call site:** lowest abstraction, incremental migration, repeated boilerplate.
- **(B) Thin URL-sync wrapper/hook:** consolidates param namespacing, nested key cleanup, and navigation policy—best after 2+ similar flows.
- **(C) Dual provider / test harness:** strong for **tests and Storybook**; not a substitute for production deep linking unless the provider reads the real URL.

### `b83e0a86-aa23-4e11-91ed-0f434a400876` — Example sketches (pseudocode)

- Single-feature toggle: one param opens sheet; optional `id` for selection; close deletes keys (often with `replace: true`).
- **Nested flows:** closing a parent must delete **child-only** params (e.g. confirm) to avoid orphan query state.
- **Namespacing:** prefer stable, feature-prefixed keys or a small registry to avoid collisions across teams/routes.

### `e279b003-3d9c-4e96-9b53-d9525b0da1fb` — Phased game plan and risks

- **Phase 0:** agree param vocabulary, replace vs push rules, and nested overlay conventions.
- **Phase 1:** documentation and non-breaking examples only.
- **Phase 2:** pilot high-value routes; optional PR checklist for shareable overlays.
- **Phase 3:** additive helpers in package only after pilots validate API shape.
- **Risks:** breaking defaults on primitives, param explosion, history UX confusion, SSR/hydration mismatch—mitigate with wrappers, namespacing, explicit QA matrices, and loader-derived initial open state.

---

## Source note

Detailed agent prose, tables, and full pseudocode lived in the **Ralph workflow stdout** for plan `6bb89ac6-630f-4e99-be8b-05122f3ce64c` (workflow bullmq output). This document condenses those outcomes for offline review. OpenThrottle **plan output** rows for this plan currently store run metrics only; use this file or the workflow log for narrative detail.
