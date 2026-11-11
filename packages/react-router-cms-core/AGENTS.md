# @openthrottle/react-router-cms-core — agent notes

Foundation library for the OpenThrottle CMS: content-model types (fragments, layouts, schemas),
Jotai editor-state atoms, fragment-tree and schema utils, drag-to-reorder primitives, the
component registry, the page renderers and the schema-driven fragment form. Ported from
visormatt/monorepo — `packages/rocketcms/core` (OT plan `9a1f8a93`) and
`applications/rocketcms/app/services/rocket` (OT plan `79144d51`) — re-scaffolded with
`@tools/generators` rather than copied.

**Consumed by:** `applications/openthrottle-cms` (not imported yet — the app is still a scaffold).
**Depends on:** `@openthrottle/react-router-cms-ui` for the content blocks in the registry. Keep it
one-way: cms-ui must never import cms-core.

## Layout

- [src/index.ts](src/index.ts) — public entry point; every export carries a `@public` JSDoc tag.
- [src/types/](src/types/) — `CmsFragment` (the layout tree), the stored row types (`CmsLayout`,
  `CmsFragmentRecord`, `CmsSchema`), `CmsJsonSchema`, `CmsReorderListSource`, and the render/form
  types in `cms-render.ts` (`CmsComponentRegistry`, `CmsRenderProps`, `CmsFormChildrenBindings`, …).
- [src/config/](src/config/) — `CMS_STATUS`, `CMS_DEVICE` (`as const` objects).
- [src/data/](src/data/) — Jotai atoms (`data.atom.*.ts`), `CoreFormContext`, copy, preview sizes,
  `CORE_COMPONENTS` (`data.registry.ts`), `FORM_FIELDS` (`data.form-fields.ts`, internal) and
  `mock.*.ts` fixtures (specs only, not exported).
- [src/utils/](src/utils/) — breadcrumbs, reorder, schema (`getSchemaProperty`, `shrinkSchema`, …),
  `getFormFieldKind`, the `read*` property narrowers and the per-block `to*Props` adapters.
- [src/hooks/](src/hooks/) — `useReorderList`, `useReorderItem`, `useFormField`,
  `useCoreFormContext`.
- [src/components/](src/components/) — flat, no sub-folders: `Reorder*`, the `Core*` renderers and
  form, `Form*` fields, `Layout*` and `Logic*` blocks.

## Invariants & gotchas

- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).
- **Consumers must render reorder components (and `FormChildren`, and a `CoreFormRenderer` whose
  schema has a `children` property) under a `DndProvider`** (`react-dnd-html5-backend`). The
  package deliberately doesn't mount one: a nested provider breaks drag-and-drop for any other
  react-dnd surface on the page.
- **`react-dnd` is the only drag-and-drop library.** Upstream mixed `react-dnd`, `framer-motion`
  and `@popmotion/popcorn`; do not reintroduce the other two (or `immutability-helper` —
  `moveListItem` replaces it).
- `ReorderHandle` is the only drag source; the rest of a row stays clickable. Keep `rowRef` on the
  row (drop target + preview) and `handleRef` on the handle.
- `CmsFragment.children` is always an array (upstream allowed one-or-many). Normalise at the data
  boundary, not in consumers.
- **Registered components narrow their own props.** A registry entry receives
  `{ properties, children }` — the stored, untrusted JSON — and `registerComponent(Block, toProps)`
  turns that into typed props with fallbacks. Adding a block means adding a `to*Props` adapter in
  `utils/registry-props.ts`; never widen the registry type or cast.
- **Renderers take the registry as a prop** (`CORE_COMPONENTS` or `createComponentRegistry(...)`);
  upstream accepted one and silently used its own.
- **No app routes or form intents in the package.** Hrefs (`getFragmentHref`, `addHref`), the submit
  `intent`, the remove/reorder handlers and the phone-preview `previewUrl` all come from the caller.
- **`src/index.ts` is the only barrel.** Import concrete files inside the package — sub-folder
  barrels were removed, and `data.registry.ts` / `data.form-fields.ts` import components that
  import `data/data.copy.ts`, so a `data/` barrel would reintroduce an import cycle. Stories live in
  `react-router-shadcn`, not here.
- The form edits `atomFragmentDraft` (properties only), which replaces upstream's untyped
  `atomComponent`. The app seeds it with the selected fragment's properties; `CoreFormRenderer`
  posts it as JSON in `properties`; `CoreRendererDevelopment` merges it over the selected fragment
  for a live preview.
- Name map from upstream: `Rocket*` types → `Cms*`; `Rocket*` components → `Core*`
  (`RocketRenderer` → `CoreRenderer`, `RocketFormRenderer` → `CoreFormRenderer`, …);
  `RocketComponents` → `CORE_COMPONENTS`; `RocketBaseComponentProps` → `CmsRenderUnknown`;
  `FormBaseProps` → `CmsFormBaseProps`. `Form*`, `Layout*` and `Logic*` keep their names. Field
  props renamed for outsiders: `label` → `name` (it is the property key), `parent` → `hideLabel`,
  `FormLabel` `copy` → `text`; the form posts `intent` (not `_action`), and `CoreFormRenderer`
  takes the `children` field's props as `children`.
- Dropped on purpose — do not port without a plan: `atomComponent`; the demo presets and popmotion
  `findIndex` from `utils/reorder.ts`; `utils/library-loader.ts` (evaluates DB-stored code with
  `new Function` and queries Supabase directly); `utils/validators.server.ts` (ajv, server-only);
  `utils/forms.ts` (dead formik WIP); `components/library.ts` and the `LayoutComponents` path
  tuples (a Vite transpile shim); `SurveyRenderer`; TinyMCE in `FormWysiwyg`, which shipped an API
  key in source. `FormWysiwyg` edits HTML source in a `TextArea` until an editor is chosen.
- The react `component` generator's stub fails `no-empty-pattern` as generated; give the props a
  `className` before linting.

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout, `@public` tags,
  source-first pattern).
