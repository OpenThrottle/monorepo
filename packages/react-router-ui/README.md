# @openthrottle/react-router-ui

React Router UI components and primitives for forms, layout, and navigation.

## Installation

**In this monorepo:** add `"@openthrottle/react-router-ui": "workspace:*"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.

---

## Tabs: controlled (URL param) vs link (route)

OpenThrottle ships **two separate tab APIs**. Do not merge them into one component—each matches a different navigation model.

| Approach                       | When to use                                                                                     | Package exports                              | Panel content                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| **A — Controlled / URL param** | Sections on the **same route**; active tab in search params (plan detail, settings)             | `OpenThrottleTabs`, `useUrlSyncedTabValue`   | Radix `TabsContent` on the same page             |
| **B — Link / route**           | Each tab is a **real path** (`/plans` vs `/plans/tasks`); active from `NavLink` / `useLocation` | `OpenThrottleTabsNav`, `OpenThrottleTabLink` | Nested routes, layout `Outlet`, or parent render |

**Param naming:** use stable, feature-prefixed search keys and delete the param when the default tab is active. See [URL-first UI state](../../docs/monorepo/url-first-ui-state.md) (sections 1–6). Example in openthrottle-developer: `tab` with values `overview`, `tasks`, … (`PLANS_DETAIL_TAB_SEARCH_PARAM` in `parsers.ts`).

### Import map

| Need                                       | Import from                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Radix tab root, list, trigger, content     | `@openthrottle/react-router-shadcn` — `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| Shared trigger/list styles (custom markup) | `@openthrottle/react-router-shadcn` — `tabsTriggerVariants`, `tabsListVariants`        |
| OT wrapper + URL sync hook                 | `@openthrottle/react-router-ui` — `OpenThrottleTabs`, `useUrlSyncedTabValue`           |
| Link tab bar (not Radix `Tabs`)            | `@openthrottle/react-router-ui` — `OpenThrottleTabsNav`, `OpenThrottleTabLink`         |

Approach A still uses shadcn primitives as children of `OpenThrottleTabs`. Approach B does **not** use `Tabs` / `TabsList`; the nav is a semantic `<nav>` with `NavLink` children styled like triggers.

---

### Approach A — `OpenThrottleTabs` + `useUrlSyncedTabValue`

Thin wrapper around shadcn `Tabs` with optional URL sync. Pass `urlSync` to drive `value` / `onValueChange` from a search param; omit it for normal controlled or uncontrolled tabs. If you pass both `value` and `onValueChange` **and** `urlSync`, explicit `value` / `onValueChange` win (fully controlled).

`useUrlSyncedTabValue` is also available standalone when you already own the `Tabs` root (e.g. legacy call sites).

- Deletes the param when the active tab equals `defaultValue` (canonical URL for the default tab).
- Uses `setSearchParams(..., { preventScrollReset: true })` for param-only updates ([URL-first UI state §6](../../docs/monorepo/url-first-ui-state.md#6-scroll-and-focus)).

```tsx
import * as React from 'react';
import {
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleTabs } from '@openthrottle/react-router-ui';

const TAB_PARAM = 'tab';

export const PlanDetailTabs = () => (
  <OpenThrottleTabs urlSync={{ defaultValue: 'overview', param: TAB_PARAM }}>
    <TabsList variant="line">
      <TabsTrigger value="overview">Details</TabsTrigger>
      <TabsTrigger value="tasks">Tasks</TabsTrigger>
    </TabsList>
    <TabsContent value="overview">{/* … */}</TabsContent>
    <TabsContent value="tasks">{/* … */}</TabsContent>
  </OpenThrottleTabs>
);
```

Optional `parse` when the URL token needs validation:

```tsx
import {
  OpenThrottleTabs,
  useUrlSyncedTabValue,
} from '@openthrottle/react-router-ui';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';

const parseTab = (raw: string | null) =>
  raw === 'tasks' || raw === 'overview' ? raw : undefined;

// Hook only
const { onValueChange, value } = useUrlSyncedTabValue({
  defaultValue: 'overview',
  param: 'tab',
  parse: parseTab,
});

// Or same config via OpenThrottleTabs urlSync prop
```

---

### Approach B — `OpenThrottleTabsNav` + `OpenThrottleTabLink`

Link-based tab bar for **route** navigation. Not a Radix `Tabs` instance.

- **`OpenThrottleTabsNav`:** `<nav>` with `tabsListVariants` layout (`variant`: `default` | `line`, same as shadcn `TabsList`).
- **`OpenThrottleTabLink`:** `NavLink` with `tabsTriggerVariants` plus active classes via `aria-current="page"` (mirrors `data-[state=active]` on triggers).

Panel content is **not** `TabsContent`. Use child routes (`<Outlet />`), separate route modules, or conditional render in the parent. For path-based tabs vs query overlays, see [URL-first UI state §8](../../docs/monorepo/url-first-ui-state.md#8-optional-path-segments-vs-query-overlays).

```tsx
import * as React from 'react';
import { Outlet } from 'react-router';
import {
  OpenThrottleTabLink,
  OpenThrottleTabsNav,
} from '@openthrottle/react-router-ui';

export const PlansLayoutTabs = () => (
  <>
    <OpenThrottleTabsNav aria-label="Plans views" variant="line">
      <OpenThrottleTabLink to="/plans" end>
        List
      </OpenThrottleTabLink>
      <OpenThrottleTabLink to="/plans/board">Board</OpenThrottleTabLink>
    </OpenThrottleTabsNav>
    <Outlet />
  </>
);
```

Use `prefetch` on `OpenThrottleTabLink` the same as on `NavLink` when you want intent-based preloading.

---

### Style parity (shadcn)

`tabsTriggerVariants` lives in `@openthrottle/react-router-shadcn` (`Tabs/tabsTriggerVariants.ts`). `TabsTrigger` and `OpenThrottleTabLink` both use it so link tabs match controlled triggers. `OpenThrottleTabsNav` uses `tabsListVariants` from `TabsList`.

---

## Related docs

- [URL-first UI state](../../docs/monorepo/url-first-ui-state.md) — search param namespacing, `preventScrollReset`, debounced search, overlays vs nested routes.
- [§ Tabs (search param vs routes)](../../docs/monorepo/url-first-ui-state.md#12-tabs-search-param-vs-routes) — quick pointer back to this README.
