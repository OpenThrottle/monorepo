# @openthrottle/react-router-ui-global

Shared `Global*` app-shell UI for the React Router apps: layout, sidebar, header,
providers, theme, error boundary, metrics, and **per-row table actions** via
`GlobalPopover`.

**Consumers:** `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`,
`openthrottle-website` (and any other app that already depends on this package).

## Installation

This monorepo already wires the workspace dependency. Prefer pnpm:

```bash
pnpm add @openthrottle/react-router-ui-global
```

```bash
npm install @openthrottle/react-router-ui-global
```

## GlobalPopover — table row Actions

Use `GlobalPopover` for per-row action columns instead of hand-rolling a
`DropdownMenu` (or a cluster of inline buttons) in each `*Table` /
`*-table-columns` file.

Despite the name, the primitive is built on the shadcn **`DropdownMenu`** family
(menu roles, typeahead, arrow keys). Pair it with
`GlobalPopoverActionsHeader` so every Actions column shares the same
right-aligned header.

### Action kinds

`GlobalPopoverAction` is a discriminated union on `kind`:

| `kind`     | Use for                                      | Notes                                                                                                            |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `'submit'` | Route `Form` posts (intents + hidden fields) | Optional `confirm` opens an `AlertDialog` before submit; `pending` / `pendingLabel` for per-row submitting state |
| `'link'`   | Navigate with `react-router` `Link`          | Prefer when the row already has a detail link elsewhere and you still want View in the menu                      |
| `'select'` | Client callback (`onSelect`)                 | Pause/resume-style controls that stay on the page                                                                |

Destructive submits set `destructive: true` and usually `confirm`. Put
`separatorBefore: true` on the first item of a new group (e.g. before
destructive or before ops controls).

### Canonical Actions header

```tsx
import { GlobalPopoverActionsHeader } from '@openthrottle/react-router-ui-global';

// TanStack ColumnDef
{ header: () => <GlobalPopoverActionsHeader />, id: 'actions', /* cell: … */ }

 // or
header: () => <GlobalPopoverActionsHeader />,
```

Copy for the label lives in `GLOBAL_POPOVER_COPY.actionsHeader` (`'Actions'`).
Do not hand-roll `header: () => 'Actions'` or one-off padding wrappers.

### When not to use it

- **Exactly one action and no detail link on the row** — keep a single inline
  button/link; a one-item overflow menu is worse UX.
- **Bulk / toolbar surfaces** (`*BulkActions`, plan toolbars) — different
  surface; do not force them through `GlobalPopover`.

### Example (queues column)

Copy-pasteable shape from the `/queues` table (link + select). Labels belong in
the area `data/data.copy.ts`, not inline in the column file.

```tsx
import {
  GlobalPopover,
  GlobalPopoverActionsHeader,
} from '@openthrottle/react-router-ui-global';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { QUEUES_ROW_ACTIONS_COPY } from '~/routing/queues/data/data.copy';

// inside a ColumnDef cell:
const actions: GlobalPopoverAction[] = [
  {
    id: 'view',
    kind: 'link',
    label: QUEUES_ROW_ACTIONS_COPY.view,
    to: href,
  },
  {
    icon: <PauseIcon aria-hidden={true} className="size-4" />,
    id: 'pauseQueue',
    kind: 'select',
    label: QUEUES_ROW_ACTIONS_COPY.pauseQueue,
    onSelect: () => onControl(queue.name, 'pauseQueue'),
    separatorBefore: true,
  },
  {
    icon: <PlayIcon aria-hidden={true} className="size-4" />,
    id: 'resumeQueue',
    kind: 'select',
    label: QUEUES_ROW_ACTIONS_COPY.resumeQueue,
    onSelect: () => onControl(queue.name, 'resumeQueue'),
  },
];

return (
  <GlobalPopover
    actions={actions}
    ariaLabel={`${QUEUES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${displayName}`}
    heading={QUEUES_ROW_ACTIONS_COPY.heading}
  />
);

// column header:
header: () => <GlobalPopoverActionsHeader />,
```

For `kind: 'submit'` (intents, pending labels, confirm before remove), see
`RepositoryRowActions` under
`applications/openthrottle-developer/app/routing/settings/repositories/`.

### Workbench / Storybook

`openthrottle-workbench` only loads stories from
`packages/react-router-shadcn`. `GlobalPopover` depends on React Router
(`Form` / `Link`), so it is **not** in the workbench today. Discoverability is
this README, `AGENTS.md`, Vitest under
`src/components/__tests__/GlobalPopover*.test.tsx`, and the coding rule in
[`.agents/rules/coding/frontend-design-openthrottle.mdc`](../../.agents/rules/coding/frontend-design-openthrottle.mdc).
Expanding the workbench to `react-router-ui-global` (router decorator + story
glob) is a follow-up if visual browsing becomes worth the wiring cost.

### Guarding against regression

**Recommendation: do not add a lint rule or `audit:` script yet.**

| Option                                                                                  | Benefit                              | Cost / false positives                                                                      |
| --------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| ESLint: ban `DropdownMenu` imports inside `*Table.tsx` / `*-table-columns.tsx`          | Catches the most common re-invention | High FP — tables still use `DropdownMenu` for column visibility, filters, and non-row menus |
| `audit:` script: require `GlobalPopoverActionsHeader` whenever an Actions column exists | Keeps header markup consistent       | Needs AST/heuristic for “Actions column”; brittle across TanStack `header` shapes           |
| Docs + coding rule (current)                                                            | Cheap, already where agents look     | Relies on review / Ralph following the rule                                                 |

Ship docs + the frontend-design rule for now. Revisit a narrow audit (e.g. flag
`header: () => 'Actions'` string literals in table files) only if regressions
show up after migration.

## Validation

```bash
pnpm nx run @openthrottle/react-router-ui-global:lint
pnpm nx run @openthrottle/react-router-ui-global:typecheck
pnpm nx run @openthrottle/react-router-ui-global:test
```

Source-first package (no `build` target) — integration check is a consumer app
build (e.g. `pnpm nx run openthrottle-developer:build`).
