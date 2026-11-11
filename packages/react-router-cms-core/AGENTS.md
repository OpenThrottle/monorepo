# @openthrottle/react-router-cms-core — agent notes

Foundation library for the OpenThrottle CMS: content-model types (fragments, layouts, schemas),
Jotai editor-state atoms, fragment-tree utils and drag-to-reorder primitives. Ported from
`@rocketcms/core` (visormatt/monorepo, `packages/rocketcms/core`), re-scaffolded with
`@tools/generators` rather than copied (OT plan `9a1f8a93`).

**Consumed by:** `applications/openthrottle-cms` (not imported yet — the app is still a scaffold).

## Layout

- [src/index.ts](src/index.ts) — public entry point; every export carries a `@public` JSDoc tag.
- [src/types/](src/types/) — `CmsFragment` (the layout tree), the stored row types (`CmsLayout`,
  `CmsFragmentRecord`, `CmsSchema`), `CmsJsonSchema` and `CmsReorderListSource`.
- [src/config/](src/config/) — `CMS_STATUS`, `CMS_DEVICE` (`as const` objects).
- [src/data/](src/data/) — Jotai atoms (`data.atom.*.ts`), `REORDER_HANDLE_COPY`,
  `CMS_REORDER_DRAG_TYPE`, and `mock.reorder.ts` (stories/specs only, not exported).
- [src/utils/](src/utils/) — `getLayoutBreadcrumbs`, `moveListItem`, `shouldReorderOnHover`.
- [src/hooks/](src/hooks/) + [src/components/](src/components/) — `useReorderList` /
  `useReorderItem` and `ReorderGroup` / `ReorderItem` / `ReorderHandle`.

## Invariants & gotchas

- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).
- **Consumers must render reorder components under a `DndProvider`** (`react-dnd-html5-backend`).
  The package deliberately doesn't mount one: a nested provider breaks drag-and-drop for any
  other react-dnd surface on the page.
- **`react-dnd` is the only drag-and-drop library.** Upstream mixed `react-dnd`, `framer-motion`
  and `@popmotion/popcorn`; do not reintroduce the other two (or `immutability-helper` —
  `moveListItem` replaces it).
- `ReorderHandle` is the only drag source; the rest of a row stays clickable. Keep `rowRef` on the
  row (drop target + preview) and `handleRef` on the handle.
- `CmsFragment.children` is always an array (upstream allowed one-or-many). Normalise at the data
  boundary, not in consumers.
- Upstream `Rocket*` names are `Cms*` here. Dropped on purpose: `atomComponent` (untyped, unused),
  the demo colour/height/z-index presets and popmotion `findIndex` from `utils/reorder.ts`, the
  hardcoded default list in `ReorderGroup`, and the skipped placeholder specs and snapshots.
- The react `util` generator uses `name` for both the identifier and the filename: pass camelCase
  and rename the file to kebab-case `.ts`.

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout, `@public` tags,
  source-first pattern).
