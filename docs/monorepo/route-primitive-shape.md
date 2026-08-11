# Route primitive shape

The single, enforceable standard every React Router **route module** under
`app/routes/*.tsx` must follow. It is the routing-layer sibling of the
[component primitive shape](./component-primitive-shape.md): where that standard
keeps authored components thin and template-shaped, this one keeps _route files_
thin and aligned with the route generator template. The generator is the source
of truth, this document is its written contract, and the enforcers (a custom
ESLint rule + an optional repo-wide audit script) implement _this_ document.

- **Generator template (SSOT):**
  `tools/generators/src/generators/react-router/files/route/__name__.tsx`.
- **Scaffold a conforming route instead of hand-writing one:**

  ```bash
  NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
    --subGenerator=route --application=<app> --name=<route.segment>
  ```

> Why a fixed shape at all? A route file is a **thin adapter** between the
> framework (React Router's `loader` / `action` / `meta` / `Component`) and the
> feature's own code. When helpers, constants, mappers, and config accrete at the
> module top level, the route stops being an adapter and starts being a junk
> drawer — logic that is harder to find, harder to test, and duplicated across
> routes. Keeping the route thin means there is exactly one obvious place for each
> kind of code, and that place is the feature folder under `app/routing/<area>/`.
> The default is always to **conform**, never to exempt (see [Opt-out](#opt-out--last-resort)).

## The canonical shape

A route file exports the **framework surface** and nothing else of substance.
Everything that is not a React Router route export or a type alias lives under
`app/routing/<area>/` and is imported back in.

```tsx
import * as React from 'react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/foo';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Foo',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Foo | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <GlobalHeading heading="h1" title="Foo" />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
```

## Rules (normative)

These are the exact checks the enforcers apply. Each has a stable id so
violations can be referenced.

### R1 — Only the allowed route exports

A route module may export **only** the React Router framework surface plus
type-only declarations. The allowed named exports are:

| Export             | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `handle`           | Route handle (breadcrumbs, layout metadata).                   |
| `loader`           | Server data loader.                                            |
| `clientLoader`     | Client data loader.                                            |
| `action`           | Server mutation handler.                                       |
| `clientAction`     | Client mutation handler.                                       |
| `middleware`       | Server route middleware.                                       |
| `clientMiddleware` | Client route middleware.                                       |
| `links`            | `<link>` descriptors.                                          |
| `meta`             | `<meta>` / `<title>` descriptors (compose with `SITE_TITLE`).  |
| `headers`          | HTTP response headers.                                         |
| `shouldRevalidate` | Revalidation control.                                          |
| `Layout`           | Route layout wrapper.                                          |
| `ErrorBoundary`    | Error UI (`export const ErrorBoundary = GlobalErrorBoundary`). |
| `HydrateFallback`  | Hydration fallback UI.                                         |
| `default`          | The route **Component** (default export).                      |

- **Type-only exports are always allowed** — `export type`, `export interface`.
- **No other named export.** A helper function, constant, config object, data
  array, or mapper exported from a route file is an R1 violation: it must move
  into `app/routing/<area>/{utils,config,data,hooks}` and be imported back.
- The route Component is the **default** export (`export default function
Component`). Library units (components, hooks, utils) are named exports; a
  route's Component is the one place a default export is correct.

### R2 — The default Component keeps the six markers, in order

The default `Component` follows the exact same body shape as an authored
component (see [component R3](./component-primitive-shape.md#r3--the-six-markers-in-order-with-the-fixed-whitespace)):
the six section markers, in order, each preceded by one blank line.

1. `// Hooks`
2. `// Setup`
3. `// Handlers`
4. `// Markup`
5. `// Life Cycle`
6. `// 🔌 Short Circuit`

Keep every marker even when its section is empty. The `props` destructure sits
between the signature and `// Hooks`, separated by one blank line. This is the
same contract, applied to the route's default component instead of a named one.

### R3 — Hoist module-scope helpers, constants, config, and data out of the route file

This is the **high-value rule**. A route file contains the framework exports
(R1) and type aliases — nothing else at module scope. Helper functions,
constants, config objects, and data literals that get sprinkled in above or
around the exports are harder to find and harder to test where they sit, so they
move to the feature's sibling folders under `app/routing/<area>/` — the same
subtree the `folders` generator scaffolds (see
[`CANONICAL_ROUTING_SUBTREE.md`](../../tools/generators/src/generators/folders/CANONICAL_ROUTING_SUBTREE.md)):

- **Utilities / pure logic** (module-scope functions, mappers) →
  `~/routing/<area>/utils/`, then imported back. Example: the
  `toSkillDetailUsageData` mapper in `skills.$slug.tsx` →
  `~/routing/skills/utils/`.
- **Configuration** (tunables, windows, thresholds, feature flags) →
  `~/routing/<area>/config/`. Example: `SKILL_USAGE_RANGE_DAYS = 30` →
  `~/routing/skills/config/`.
- **Hardcoded data** (option lists, column definitions, static arrays/maps) →
  `~/routing/<area>/data/`.
- **Copy / user-facing strings** → `~/routing/<area>/data/data.copy.ts`.
- **Stateful / behavioral logic** (state, derived values, effects, handlers
  that outgrow the Component) → a co-located `use<Name>` hook in
  `~/routing/<area>/hooks/`.

`<area>` is the route's feature slug — for `skills.$slug.tsx` and
`skills._index.tsx` that is `skills`, so their extracted code lives under
`app/routing/skills/`.

This targets **module-scope** declarations, not values computed _inside_ the
loader, action, or Component. A `const start = new Date(...)` inside the `loader`
body stays there; a `const SKILL_USAGE_RANGE_DAYS = 30` at module scope moves to
`config/`. If a helper or constant lives at the route file's top level, it moves.

> **Worked example — `skills.$slug.tsx`:** the route defined
> `SKILL_USAGE_RANGE_DAYS` (a config constant) and `toSkillDetailUsageData` (a
> pure query→prop mapper) at module scope. The fix moves the constant to
> `~/routing/skills/config/` and the mapper to `~/routing/skills/utils/` (with
> its own unit test), then imports both back — the route file is once again just
> `handle` / `loader` / `links` / `meta` / `Component` / `action` /
> `ErrorBoundary`.

### R4 — Route file stays thin (size cap)

A route file may not exceed a line cap enforced by ESLint `max-lines` scoped to
`app/routes/**`. A file that grows past the cap is almost always carrying
loader/action logic, helpers, data, or config that belongs under
`app/routing/<area>/` — hoist per R3 (and extract sub-components into
`~/routing/<area>/components/`) until it fits.

**Starting value: 210 lines**, matching the component cap. The baseline
inventory (task 2) scanned 124 route files across the four RR apps: 50 exceed
120 lines, 43 exceed 150, and 20 exceed 210. A 120-line cap would flag ~40% of
routes at once, which is why the shape rule and this cap roll out **warn-first**
(see [rollout](#rollout--warn-first)) — the cap is a visible tripwire, not an
immediate build break, until the tail is remediated. Routes are adapters and
should trend materially shorter than components; the cap can be tightened toward
120 once the baseline is worked down. Genuinely irreducible routes use the
[opt-out](#opt-out--last-resort) pragma with a written reason.

### Rollout — warn-first

The baseline shows **39 route files** with R1/R3 violations (28 in
`openthrottle-developer`, 5 each in `admin`/`email`, 1 in `website`), so the rule
is enabled at **`warn`** first, scoped to `app/routes/**`. Warnings surface every
violation in `nx lint` and the editor without breaking the build, letting the
tail be remediated route-by-route. Once `openthrottle-developer` is clean it can
graduate to `error` there (with the opt-out pragma as the escape hatch), app by
app.

### R5 — Opt-out pragma (last resort)

There is a single, documented escape hatch for the genuinely-impossible case: a
file-top pragma on the first line of the file.

```tsx
/* route-shape: opt-out — <written reason> */
```

The enforcer honors it and disables every check for that file. It is a **last
resort**, requires a written reason, and is expected to see **near-zero** use. It
is _not_ a convenience for "this route is special" or "I'll get to it later" —
those conform. Every opt-out is a visible, reviewable exception in the diff.

## Scope

The standard applies to React Router **route modules**: `*.ts` / `*.tsx` files
directly under an app's `app/routes/` directory (React Router file-based
routing). It applies first to `openthrottle-developer`; the other React Router
apps (`openthrottle-admin`, `openthrottle-email`, `openthrottle-website`) adopt
it as they grow route files with the same `app/routes/` + `app/routing/` layout.

**Excluded:**

- `**/__generated__/**`, `**/.react-router/**` — codegen / framework output.
- `**/__tests__/**`, `**/*.test.tsx` — tests.
- `root.tsx` and other framework-root modules that legitimately co-locate
  `Layout` / `App` / `HydrateFallback` (handled by their own carve-outs).
- Resource routes (`resources.*.tsx`) that export only a `loader`/`action` and
  no Component still conform to R1/R3 — they simply have no default Component for
  R2 to check.

### Currently-exempt files

_None._ (No route is exempt from the shape today.)

## How this is enforced

- **ESLint rule** `openthrottle/route-primitive-shape` (per-file: R1 allowed
  exports, R2 markers on the default Component, R3 module-scope hoist) with clear
  messages pointing at `~/routing/<area>/{utils,config,data,hooks}`, plus **R4**
  via ESLint `max-lines` scoped to route files. Runs in `nx lint`, the editor,
  and CI.
- **Optional audit script** `audit:route-shape` (repo-wide inventory + a
  `--strict` gate for `check:local`) mirrors `audit:component-shape` for CI
  parity when the baseline is clean or intentionally allowlisted.

A contract test asserts a freshly-generated route passes the rule — so the
template (the source of truth) and the enforcer can never drift.

When the rule fails, **fix the R1/R3 violation** it lists by moving the code
under `app/routing/<area>/` — do not bypass the hook with `git commit
--no-verify` (CLAUDE.md prohibits `--no-verify` and bypassing Husky).

## Related conventions

- [component-primitive-shape.md](./component-primitive-shape.md) — the
  component-layer sibling; R2 here reuses its six-marker contract verbatim.
- [component-data-file-boundaries](./component-primitive-shape.md#related-conventions-the-generators-encode)
  — the wider copy/data/config separation the generators encode.
- [`CANONICAL_ROUTING_SUBTREE.md`](../../tools/generators/src/generators/folders/CANONICAL_ROUTING_SUBTREE.md)
  — the `app/routing/<area>/{components,config,data,hooks,utils}` destination map
  R3 hoists into.
