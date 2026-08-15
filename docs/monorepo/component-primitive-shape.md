# Component primitive shape

The single, enforceable standard every authored React component in this
monorepo must follow. It is derived **verbatim** from the component generator
template — the generator is the source of truth, this document is its written
contract, and the enforcers (a custom ESLint rule + a repo-wide audit script)
implement _this_ document.

- **Generator template (SSOT):**
  `tools/generators/src/generators/react/files/component/__name__.tsx` and
  `tools/generators/src/generators/react-router/files/component/__name__.tsx`
  (the two are byte-identical).
- **Scaffold a conforming component instead of hand-writing one:**

  ```bash
  NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
    --subGenerator=component --application=<app> --folder=<folder> --name=<PascalCaseName>
  ```

> Why a fixed shape at all? A single, predictable skeleton means every
> component reads the same way, the section order **structurally prevents
> Rules-of-Hooks violations**, and there is exactly one obvious place to put
> each kind of code. Consistency is the feature. The default is always to
> **conform**, never to exempt (see [Opt-out](#opt-out--last-resort)).

## The canonical shape

```tsx
import * as React from 'react';

export interface FooProps {
  // Empty is fine — its presence is the point.
}

export const Foo = (props: FooProps): React.ReactElement => {
  const {} = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="p-4" data-testid="Foo">
      <h2>Foo</h2>
    </div>
  );
};
```

## Rules (normative)

These are the exact checks the enforcers apply. Each has a stable id so
violations can be referenced.

### R1 — Export the component **and** its props interface

- The file exports `export const Foo` (the component) and
  `export interface FooProps` — where `FooProps` is exactly the component name
  suffixed with `Props`.
- **An empty interface is required, not optional.** We assume it is present in
  specs and it makes future prop additions a one-line, consistent change. Do
  **not** replace it with an inline type (`(props: { className?: string })`), a
  `type` alias, or a bare `React.FC` generic — it must be a named, exported
  `interface`.
- A component that legitimately takes no props still exports an empty
  `FooProps` and accepts it: `(props: FooProps)`.

### R2 — Explicit component signature

- `export const Foo = (props: FooProps): React.ReactElement => { … }`.
- The return type is **explicit** (`React.ReactElement`, or
  `React.ReactElement | null` when the component can short-circuit to nothing).
  Never rely on an inferred return type.
- A component always returns something or `null` — never `undefined`, never an
  implicit fall-through.

### R3 — The six markers, in order, with the fixed whitespace

Every component body contains all six section markers, **in this exact order**:

1. `// Hooks` — `useState` / `useRef` / `useContext` / custom hooks. Hooks live
   here and only here, first, so hook order is stable across renders.
2. `// Setup` — derived values, memoized selections, local constants computed
   from props/hooks.
3. `// Handlers` — event handlers and callbacks (`onClick`, `handleSubmit`, …).
4. `// Markup` — locally-composed JSX fragments/nodes assigned to variables for
   use in the return.
5. `// Life Cycle` — `useEffect` / `useLayoutEffect` and other lifecycle
   wiring.
6. `// 🔌 Short Circuit` — guard clauses and early returns (`if (!x) return
null;`), immediately before the main `return`.

Whitespace is part of the contract:

- Each marker sits on its own line and is preceded by **exactly one blank
  line**.
- **Keep every marker even when its section is empty** — an empty section is
  just the marker followed by one blank line before the next marker. Do not
  delete a marker because you have nothing to put under it yet.
- The `🔌 Short Circuit` marker is the emoji + text exactly: `// 🔌 Short
Circuit`.

#### The pre-Hooks unpack block

Between the signature and the first `// Hooks` marker (separated by one blank
line) is the **only** place `props` is unpacked. This block is _unpack_, never
_derive_:

- `const { … } = props;` — the identity destructure of `props` (unused keys
  prefixed `_`). An empty `const {} = props;` when the component takes no props
  is fine; its presence is the point.
- **Nested identity destructures** of those bindings: `const { id, name } =
item;` when `item` came from `props`, `const { repository } = loaderData;` when
  `loaderData` came from `props`. Peeling a nested value off a props-derived
  binding is still _unpacking_, so it stays here — not under `// Setup`.
- **Nothing derived** here. A formatted label, a `'x' in y` narrowing, a mapped
  or filtered array — anything _computed from_ those bindings — belongs under
  `// Setup`, never in this block.
- **Never** unpack `props` (or a nested identity destructure of a props-derived
  binding) after `// Hooks`, and especially not after `// 🔌 Short Circuit`
  immediately above the `return`. That after-Short-Circuit dump is the exact
  anti-pattern the enforcer flags.

Hooks stay first (right after the unpack) so Rules-of-Hooks order is stable;
`// Setup` can then read both the unpacked props and the hook results.

```tsx
// ✅ Good — identity unpack (incl. nested) before Hooks; derive under Setup.
export const RepositoryRow = (
  props: RepositoryRowProps,
): React.ReactElement => {
  const { repository } = props;
  const { id, name } = repository;

  // Hooks

  // Setup
  const label = `${name} (#${id})`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div data-testid="RepositoryRow">{label}</div>;
};

// ❌ Bad — props unpacked after Short Circuit, jammed above the return.
export const RepositoryRow = (
  props: RepositoryRowProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  const { repository } = props;
  const { id, name } = repository;

  return (
    <div data-testid="RepositoryRow">
      {name} (#{id})
    </div>
  );
};
```

> "Leave a line if there is no early return": the `Short Circuit` marker and its
> trailing blank line stay even when the component has no guard clause — the
> main `return` still follows one blank line after the marker.

### R4 — Hoist file-scope helpers, constants, and config out of the component file

A component file contains the component (and, per R1, its props interface) —
nothing else of substance. This rule is about the **module top level**: helper
functions, constants, and config objects that get sprinkled in above or around
the component. They are harder to find and harder to test where they sit, so
they move to dedicated sibling folders — one level up from `components/` —
where they are discoverable and independently testable (and where the generator
scaffolds them):

- **Utilities / pure logic** (module-scope functions) → sibling `utils/`, then
  imported back in. Example: `~/routing/plans/utils/group-plan-tasks-by-status.ts`
  imported by `~/routing/plans/components/PlanTasksBoard.tsx`.
- **Stateful / behavioral logic** (state, derived values, effects, handlers) →
  a co-located `use<Name>` hook in sibling `hooks/` (see [R7](#r7--keep-components-ui-focused--extract-logic-into-hooks)).
- **Hardcoded data** (option lists, column definitions, static arrays/maps) →
  sibling `data/`.
- **Configuration** (tunables, feature flags, thresholds) → sibling `config/`.
- **Copy / user-facing strings** → `data/data.copy.ts`.

This targets **file-scope** declarations, not values computed _inside_ the
component. Small derived values stay inline under `// Setup`; a `useMemo`
selection stays in the component. If a helper or constant lives at module scope
in a component file, it moves.

> In practice the [R6 file-size cap](#r6--component-file-size-cap) is what makes
> this bite: a component file that has accumulated enough top-level helpers,
> data, and config to blow past the line cap is exactly the file that needs
> those bits hoisted. R4 says _where_ they go; R6 is the tripwire that flags
> _when_.

### R5 — One component per file

- Exactly one exported component per file, named to match the file.
- Tiny private sub-components used only by the file's component are discouraged;
  prefer their own file. (The enforcer flags multiple _exported_ components; a
  single small private helper component is allowed but reported by the audit for
  review.)

### R6 — Component file-size cap

- A component file may not exceed **210 lines**. A file that grows past this is
  almost always carrying markup, helpers, data, or config that belongs
  elsewhere — extract sub-components, and hoist per R4, until it fits.
- **Starting value: 210 lines** — deliberately a first tripwire to "see what
  barks," not a proven ceiling. Once the baseline inventory (task 4) shows how
  many files exceed it and by how much, the cap can be tuned, and the
  blank-line / comment counting options settled (our mandated markers and
  blank-line whitespace mean a bare skeleton already spends lines on structure —
  the initial cap counts physical lines and will be revisited).
- This is a hard rule, enforced by ESLint `max-lines` scoped to component files,
  not a suggestion. Genuinely-irreducible files use the [opt-out](#opt-out--last-resort)
  pragma with a written reason, like any other rule.

### R7 — Keep components UI-focused; extract logic into hooks

A component's job is **UI**. When it accumulates state, derived values, effects,
and handlers beyond arranging presentation, that behavior belongs in a
**co-located `use<Name>` hook** in the sibling `hooks/` folder — generated, not
hand-rolled:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=hook --application=<app> --folder=<folder> --name=use<Name>
```

The extracted hook follows this same six-marker shape (the `hook` template is
shape-conformant) and returns exactly what the component's markup needs. The
component then reads as: call `use<Name>()` under `// Hooks`, and render. Pure
functions the hook uses go to `utils/`; data/config/copy go per R4. Logic in a
hook and utils is **independently and more fully testable** than logic tangled
into a component.

> **Worked example — `RuleForm.tsx` (492 lines, the current worst offender):**
> nearly all of it is a `useState` wall (~12 fields hydrated from
> `initialRule`), payload assembly, `submitDisabled` derivation, and the
> `parsePayloadField` / `splitList` utilities — none of it presentational.
> Extracting a generated `useRuleForm(initialRule)` hook (state + derived
> payload + handlers) and moving `parsePayloadField` / `splitList` to `utils/`
> would strip the component down to its form markup, drop it well under R6, and
> make the form logic testable on its own. **This is the intended fix for an
> oversized component — extract the hook, not just split the JSX.**

R7 is the guiding principle; its **enforceable proxy is R6** (the size cap) plus
**advisory audit signals** — the audit reports components with a high count of
hooks / state / body statements as "consider extracting a `use<Name>` hook."
The judgment of _what_ is logic vs. UI stays with the author; the cap and the
signals make the pressure visible.

## Marker semantics quick reference

| Marker                | Put here                                             |
| --------------------- | ---------------------------------------------------- |
| `// Hooks`            | `useState`, `useRef`, `useContext`, custom hooks     |
| `// Setup`            | derived values, `useMemo` selections, local consts   |
| `// Handlers`         | event handlers, callbacks                            |
| `// Markup`           | JSX assigned to vars for the return                  |
| `// Life Cycle`       | `useEffect`, `useLayoutEffect`                       |
| `// 🔌 Short Circuit` | guard clauses / early returns before the main return |

## Edge cases

- **`forwardRef`** — the wrapped render function still follows R2–R3 internally;
  the exported symbol is still `Foo` with an exported `FooProps`. Prefer the
  React 19 "ref as a prop" pattern (declare `ref` in `FooProps`) over
  `forwardRef` where possible so the shape stays flat.
- **`memo`** — wrap at export (`export const Foo = React.memo(FooImpl)`), keep
  `FooImpl` in the same file following R2–R3, and still export `FooProps`.
- **No props** — still export an empty `FooProps` and accept it (R1).
- **Multiple components in one file** — not allowed for exported components
  (R5); split them.
- **Providers / error boundaries / "pass-through" wrappers** — these are **not
  exempt**. They conform to the full shape. If a component is so trivial that
  conforming feels pointless, that is a signal to question whether it should
  exist at all (inline or delete it), not a reason to exempt it.

## Hooks: the parallel shape

The `hook` generator emits the **same skeleton** as a component, so an extracted
`use<Name>` hook (per [R7](#r7--keep-components-ui-focused--extract-logic-into-hooks))
is itself conformant. The parallel rules:

- Named export `export const useFoo` paired with an exported
  `export interface FooOptions {}` (the hook's analogue of `FooProps` — empty is
  fine), accepting `(options: FooOptions)`.
- The same six markers, same order, same whitespace.
- Returns a **named object** of what the consumer needs (`return { value, onX }`),
  not a bare tuple.
- Lives in the sibling `hooks/` folder and is tested with `renderHook`.

The audit applies R3 (markers) to `hooks/**/*.tsx` too; R1's naming check uses
the `use*` + `*Options` pairing there instead of `*Props`.

## Scope

The standard applies to **authored** components: `*.tsx` files whose path
matches `**/components/**` in `applications/*` and `packages/react-router-*`
(and other authored packages), **excluding** the paths below.

**Permanently excluded** (artifacts and vendored code — never audited):

- `**/dist/**` — build output.
- `**/__generated__/**` — codegen output.
- `**/__tests__/**`, `**/*.test.tsx` — tests.
- `**/*.server.tsx` — server-only modules (no component shape).
- `packages/react-router-shadcn/**` — **vendored** shadcn/ui primitives
  (cva/Radix, multi-export, `forwardRef`). "Vendored" = sourced from outside
  rather than hand-authored. These are held to a **separate** variant standard —
  [component-shape-shadcn-variant.md](./component-shape-shadcn-variant.md),
  tracked in its own plan (`Bring react-router-shadcn into the component-shape
standard`), _not_ this one.
- Story / example / fixture files (`*.stories.tsx`, `*.example.tsx`).

## Opt-out — last resort

There is a single, documented escape hatch for the genuinely-impossible case: a
file-top pragma on the first line of the file.

```tsx
/* component-shape: opt-out — <written reason> */
```

Both enforcers honor it. It is a **last resort**, requires a written reason, and
is expected to see **near-zero** use. It is _not_ a convenience for "this is
just a wrapper" or "I'll get to it later" — those conform. Every opt-out is a
visible, reviewable exception in the diff.

### Currently-exempt files

_None._ (No authored component is exempt from the shape today.)

## How this is enforced

Enforcement is **hard**, not a suggestion — two complementary enforcers built in
the plan `React component primitive-shape audit & continuous enforcement`:

- **ESLint rule** `component-primitive-shape` (per-file: R1, R2, R3 — exports,
  signature, markers, order, whitespace) with an autofix that scaffolds missing
  markers / normalizes whitespace / inserts an empty `FooProps`, plus **R6** via
  ESLint `max-lines` (210) scoped to component files. Runs in `nx lint`, the
  editor, and CI.
- **Audit script** `component-shape:check` (cross-file: R4, R5 — file-scope
  helper/data/config/hook hoisting and one-per-file) plus a repo-wide inventory
  that reports R6 line counts (so the cap can be tuned) and **R7 advisory
  signals** (hook/state/statement counts flagging "extract a `use<Name>` hook").
  Runs in `check:local` and CI.

Both share the scope globs and the opt-out pragma above so they can never
disagree, and a contract test asserts freshly-generated components pass both —
so the template and the enforcers can never drift.

### Where the strict audit runs (three surfaces, one command)

The strict audit is a **commit gate**, not just a push gate. It runs at three
lifecycle stages, all on the exact same single command so they can never drift:

- **pre-commit** (`.husky/pre-commit`) — every commit (human or agent) must
  pass; it runs after `lint-staged`.
- **pre-push** (`.husky/pre-push`) — every push must pass.
- **CI** — the `🧱 Component primitive-shape audit` step in
  `.github/workflows/continuous-integration.yml`.

All three source the same shared snippet (`.husky/lib/component-shape-gate.sh`)
/ run the same command; keep them in lockstep. Run it yourself with:

```bash
pnpm run audit:component-shape:strict
```

When it fails, **fix the R4/R5 violation** it lists — do not bypass the hook
with `git commit --no-verify` (CLAUDE.md prohibits `--no-verify` and bypassing
Husky). The autofix/scaffolding notes above and the rule references (R1–R7) tell
you how to reshape the offending file.

## Related conventions the generators encode

The generator templates encode a wider house style that the component shape sits
inside. These are documented here as the surrounding standard; several are
already enforced by `tools/generators/.../template-conventions.test.ts`, and the
rest are candidates for the audit or future rules. The generator remains the
source of truth for all of them.

- **Naming & exports** — library units (component, hook, util, table, form,
  modal) are **named exports**; only a React Router route's `Component` is a
  default export. Paired types: `FooProps` for components, `FooOptions` for
  hooks/utils, always an exported `interface`.
- **`interface` over `type`; no enums** — `type` only for genuine unions / yup
  `InferType`; config constants are `as const` objects.
- **`data-testid="<Name>"` on the root element** of every rendered component
  (component, modal, form, table).
- **Import style** — `import * as React from 'react'`; `import type` for
  type-only imports; path aliases (`~/…` app-relative, `@/app/…` for generated
  route types); alphabetized object keys and unused params prefixed `_`.
- **Copy / data / config separation** — the `folders` generator scaffolds the
  canonical sibling subtree `components/ config/ data/ hooks/ utils/` (+
  `types.ts`). Sentence-length UI copy → `data/data.copy.ts` (`*_COPY as const`);
  config constants → `config/defaults.ts`; form schemas → `config/form.*.ts`.
  This is the concrete backing for [R4](#r4--hoist-file-scope-helpers-constants-and-config-out-of-the-component-file).
- **Tests** — colocated in `__tests__/`; Vitest; render via
  `@testing-library/react` + `createRoutesStub`; **query off the `component`
  handle, never global `screen`**; `userEvent` not `fireEvent`; hooks via
  `renderHook`; the shared `setupReactRouterTest({ env })` setup — do not re-add
  `afterEach(cleanup)` / `ResizeObserver` per app.
- **React Router routes** — export the framework surface (`handle`, `loader`,
  `meta` composed with `SITE_TITLE`, `links`, default `Component`, `action`, and
  `export const ErrorBoundary = GlobalErrorBoundary`); UI stays in `Component`,
  data in `loader`/`action`.

### Template drift to normalize (the SSOT is currently inconsistent)

The survey found the templates disagreeing with each other — which means the
"source of truth" contradicts itself and would fail its own contract test. These
are tracked as a normalization task on this plan:

- **Modal and form templates emit `// 🔌 Short Circuit`s** (plural) while every
  other template is singular — the R3 marker set must be one canonical string.
- **The `react` hook template uses `any`** (`onCopy = (value: any)`) — violates
  the no-`any` rule and diverges from the RR hook's typed `string`.
- **Hook import style diverges** — RR hook uses `import * as React` +
  `React.useState`; the `react` hook uses a named `useState` import.
- **`rest-service` module class is literally `class Module`** (aliased decorator)
  instead of `<Name>Module`.
- **Static `.id` casing differs** — modal uses `nameKebab`, form uses `name`.
