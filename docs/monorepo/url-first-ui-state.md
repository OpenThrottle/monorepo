# URL-first UI state (Remix / React Router)

Conventions and **copy-paste examples** for backing **dialogs, sheets, drawers**, **multi-step flows**, and **list/search** UI with the URL in Remix and React Router 7 apps. This doc supports plan `6a062008-7cae-4922-8152-89f9f17ed257` (URL-first UI state) and aligns with research outcomes in [URL-first overlays learnings](../plans/6bb89ac6-url-first-react-router-shadcn-learnings.md) (research plan `6bb89ac6-630f-4e99-be8b-05122f3ce64c`).

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

## 9. Copy-paste examples (documentation only)

The snippets below are **patterns for app code**, not changes to `@openthrottle/react-router-shadcn` primitives. They mirror the approach in [`GlobalModal`](../../packages/react-router-ui-global/src/components/GlobalModal.tsx): **`open` / `onOpenChange`** driven by **`useSearchParams`**, with **`preventScrollReset: true`** on param-only updates. Prefer importing **`GlobalModal`** when a single dialog matches that shape.

Adjust **param names** to your feature prefix (see section 1).

### 9.1 Dialog

```tsx
import * as React from 'react';
import { Dialog, DialogContent } from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';

const DIALOG_PARAM = 'plansHelpDialog';
const DIALOG_OPEN = 'open';

export const PlansHelpDialog = (props: React.PropsWithChildren) => {
  const { children } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.get(DIALOG_PARAM) === DIALOG_OPEN;

  const onOpenChange = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set(DIALOG_PARAM, DIALOG_OPEN);
    else next.delete(DIALOG_PARAM);
    setSearchParams(next, { preventScrollReset: true });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
};
```

### 9.2 Sheet

Same wiring as Dialog; `Sheet` uses Radix dialog root semantics (`open` / `onOpenChange`).

```tsx
import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';

const SHEET_PARAM = 'plansIssueSheet';
const SHEET_OPEN = 'open';

export const PlansIssueSheet = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.get(SHEET_PARAM) === SHEET_OPEN;

  const onOpenChange = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) {
      next.set(SHEET_PARAM, SHEET_OPEN);
    } else {
      next.delete(SHEET_PARAM);
      next.delete('plansIssueId');
      next.delete('plansIssueConfirm');
    }
    setSearchParams(next, { preventScrollReset: true });
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Issue details</SheetTitle>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
};
```

### 9.3 Drawer (Vaul)

```tsx
import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';

const DRAWER_PARAM = 'filtersMobileDrawer';
const DRAWER_OPEN = 'open';

export const FiltersMobileDrawer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.get(DRAWER_PARAM) === DRAWER_OPEN;

  const onOpenChange = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set(DRAWER_PARAM, DRAWER_OPEN);
    else next.delete(DRAWER_PARAM);
    setSearchParams(next, { preventScrollReset: true });
  };

  return (
    <Drawer onOpenChange={onOpenChange} open={isOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  );
};
```

### 9.4 Opening an overlay from UI (push vs replace)

Use **`navigate`** or **`setSearchParams`** with options that match product intent (section 2). Example: open sheet and set selection **in one** `URLSearchParams` mutation.

```tsx
import { useSearchParams } from 'react-router';

const SHEET_PARAM = 'plansIssueSheet';
const ID_PARAM = 'plansIssueId';
const SHEET_OPEN = 'open';

const openIssueSheet = (
  issueId: string,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  searchParams: URLSearchParams,
) => {
  const next = new URLSearchParams(searchParams);
  next.set(SHEET_PARAM, SHEET_OPEN);
  next.set(ID_PARAM, issueId);
  setSearchParams(next, { preventScrollReset: true });
};
```

To prefer **Back closes overlay**, omit `replace` when opening (stack grows). To avoid stacking repeated toggles, use **`replace: true`** for incidental sync-only updates.

### 9.5 Nested confirm dialog (child params)

Keep **child-only** keys in the same namespace; **delete them when the parent closes** (section 3). Example child toggle:

```tsx
import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';

const CONFIRM_PARAM = 'plansIssueConfirm';

export const PlansIssueDeleteConfirm = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.get(CONFIRM_PARAM) === '1';

  const onOpenChange = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set(CONFIRM_PARAM, '1');
    else next.delete(CONFIRM_PARAM);
    setSearchParams(next, { preventScrollReset: true });
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete issue?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

Closing the **sheet** (section 9.2) should still remove `plansIssueConfirm` so a refresh does not leave a stray confirm flag.

### 9.6 Multi-step flow in the URL (wizard / steps)

Use a **dedicated step param** (and optional entity id). Advance steps with **`replace: true`** if intermediate steps should not pollute history.

```tsx
import * as React from 'react';
import { useSearchParams } from 'react-router';

const STEP_PARAM = 'plansWizardStep';

export const usePlansWizardStep = (): readonly [
  number,
  (step: number) => void,
] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(STEP_PARAM);
  const step = Math.max(1, Number.parseInt(raw ?? '1', 10) || 1);

  const setStep = (nextStep: number) => {
    const next = new URLSearchParams(searchParams);
    next.set(STEP_PARAM, String(nextStep));
    setSearchParams(next, { preventScrollReset: true, replace: true });
  };

  return [step, setStep] as const;
};
```

Loaders should read **`plansWizardStep`** (and validate) so the first paint matches the URL.

### 9.7 Optional path segment + loader (real nested route)

When the overlay is a **first-class route** (own loader, SEO/share URL, error boundary), prefer a **child route** and **`Outlet`** instead of query-only state. With **file-based routes** (e.g. `@react-router/fs-routes`), add a child module such as `issues.$issueId.tsx` under a parent `issues.tsx`. The **parent** layout renders the list and an **`Outlet`** for the detail panel or parallel column.

```tsx
import * as React from 'react';
import { Outlet } from 'react-router';

export default function IssuesLayout() {
  return (
    <div className="flex gap-4">
      <aside>{/* list links to /issues/:issueId */}</aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
```

```tsx
import type { Route } from './+types/issues.$issueId';

export const loader = async ({ params }: Route.LoaderArgs) => {
  const issueId = params.issueId;
  if (!issueId) throw new Response('Not found', { status: 404 });
  return { issueId };
};

export default function IssueDetailPanel(props: Route.ComponentProps) {
  const { issueId } = props.loaderData;
  return <div>Issue {issueId}</div>;
}
```

Route filenames and generated `+types` paths depend on your app’s route config; see [learnings: parallel routes vs Outlet](../plans/6bb89ac6-url-first-react-router-shadcn-learnings.md).

### 9.8 Form-like flow: URL as committed state

For **text fields**, keep **local state** for typing; commit identifiers or filters to the URL on debounce, blur, or submit (section 7). Illustrative split:

- **Loader + action:** read `request.url` in the loader for SSR; use **`useSearchParams`** after navigation for the client.
- **Do not** mirror every keystroke to the URL (history and loader churn); the canonical debounced hook is tracked as separate task work in plan `6a062008-7cae-4922-8152-89f9f17ed257`.

---

## 10. Checklist (quick)

- [ ] Param keys are **feature-prefixed** and non-colliding.
- [ ] **replace vs push** matches whether Back should dismiss or history should stay minimal.
- [ ] Closing a **parent** clears **child** query keys.
- [ ] Param-only UI updates use **`preventScrollReset`** where scroll preservation matters.
- [ ] Loader reads **committed** params; search inputs use **local + debounced/blur/Enter** commit unless exempted.
