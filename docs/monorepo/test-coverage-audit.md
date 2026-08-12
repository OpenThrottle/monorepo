# Test-coverage audit

The single, enforceable contract for **which source files must ship a
co-located spec** and what "tested" means. It is the testing-layer sibling of
the [component primitive shape](./component-primitive-shape.md) and
[route primitive shape](./route-primitive-shape.md): where those keep authored
files thin and template-shaped, this one keeps every route, component, hook, and
util paired with a spec that starts from the shape our generators scaffold.

The generator spec templates are the source of truth; this document is their
written contract; `scripts/audit-test-coverage.ts` is the enforcer.

> **Operating principle — warning mode first.** We split the UI into many small,
> easy-to-work-with files and moved a lot around: great for maintainability, but
> it opened a large test gap. This audit exists to _surface_ that gap, not to
> block on it yet. It ships **report-only** (exit 0) and runs in CI as a
> **non-blocking annotation**. A committed baseline JSON snapshots the current
> gap; separate remediation plans carve from it. Only once a category's gap
> closes do we flip _that category_ to `--strict` (and, later, into the husky
> three-surface gate the way the component-shape gate is mirrored). Never flip a
> category with an open gap.

## Categories

Every in-scope source file is classified into exactly one category by its
on-disk location.

### Enforced (warn now → strict later)

| Category     | Classifier (repo-relative)                                                            |
| ------------ | ------------------------------------------------------------------------------------- |
| `routes`     | `applications/*/app/routes/*.{ts,tsx}` (flat — direct children of `app/routes/` only) |
| `components` | `applications/*/app/**/components/**/*.tsx` · `packages/*/src/**/components/**/*.tsx` |
| `hooks`      | `applications/*/app/**/hooks/**/*.{ts,tsx}` · `packages/*/src/**/hooks/**/*.{ts,tsx}` |
| `utils`      | `applications/*/app/**/utils/**/*.{ts,tsx}` · `packages/*/src/**/utils/**/*.{ts,tsx}` |

`components` is `.tsx`-only (a component is always JSX); `hooks`/`utils` accept
both `.ts` and `.tsx`.

When a file sits under more than one category folder (e.g. a hook colocated as
`.../components/Foo/hooks/useBar.ts`), the **deepest** category folder wins — the
example is a `hook`, not a `component`.

### Informational outliers (counted, never gated)

| Category | Classifier                                                                     | Why informational                                                            |
| -------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `config` | `applications/*/app/**/config/**/*.{ts,tsx}` · `packages/*/src/**/config/**/*` | Mostly static (`defaults.ts`, feature flags, status maps).                   |
| `data`   | `applications/*/app/**/data/**/*.{ts,tsx}` · `packages/*/src/**/data/**/*`     | Mostly static (`data.copy.ts` `*_COPY as const`, option lists, status maps). |

`config` and `data` are **reported but never gate — not even under `--strict`.**
They are surfaced so remediation can decide case-by-case; most entries are static
content a spec would only restate.

## The "tested" predicate

A source file `dir/Name.ext` is **tested** when a matching spec exists in either
in-tree convention:

- a **sibling** spec — `dir/Name.test.tsx`, or
- a **`__tests__/` sibling folder** spec — `dir/__tests__/Name.test.tsx`.

The universal spec suffix is `.test.tsx` (even non-JSX utils and api-routes use
`.tsx`). **Loader / deep-link variants also count**: any
`Name<.anything>.test.{ts,tsx}` (e.g. `Foo.loader.test.ts`,
`route.settings.action.test.tsx`) in either the sibling or `__tests__/`
location matches. Formally, a spec matches when its basename matches
`^<Name>(\..+)?\.test\.(ts|tsx)$`.

## Stub detection

Two generator scaffolds — the **hook** and **util** templates — ship a
placeholder assertion:

```ts
test('FIXME: should be defined', () => {
  expect(useThing).toBeDefined();
});
```

A spec that still contains the literal marker `FIXME: should be defined` is
**stub coverage**, not real coverage. Stubs are counted and listed separately
from `tested`; they are the untouched starting point, not a real test. (Stubs are
surfaced today but not yet gated by `--strict`; folding them into the gate is a
deliberate later step, alongside the per-category strict flip.)

## Exclusions

Reused verbatim from `scripts/audit-component-shape.ts` and
`scripts/audit-route-shape.ts`. A path matching any of these is never treated as
a source file to require coverage for:

- `**/__tests__/**` (the specs themselves)
- `**/*.test.*`, `**/*.spec.*`
- `**/*.stories.tsx`, `**/*.example.tsx`
- `**/*-test-utils.tsx`
- `**/*.server.tsx` (and `.server.ts`)
- `**/__generated__/**`
- `**/*.graphql` — including `*.tsx.graphql` route sidecars
- `**/*.d.ts`
- `index.ts` / `index.tsx` barrels
- `root.tsx`
- `**/dist/**`

A `__tests__/` directory that holds only a `.gitkeep` contributes no specs, so it
never marks anything tested.

## Opt-out pragma

A source file whose **first line** contains the pragma

```ts
// test-coverage: opt-out — <reason>
```

is excluded from the missing set entirely; it is reported under `opt-out` and
never counted as `missing`, `tested`, or `stub`. Prefer conforming (write the
spec) over opting out — the default is always to cover.

## Status per file

Precedence, first match wins:

1. **opt-out** — first-line pragma present.
2. **stub** — a matching spec exists but still contains `FIXME: should be defined`.
3. **tested** — a matching spec exists with real assertions.
4. **missing** — no matching spec.

## `--strict` semantics

- Report-only (exit 0) by default.
- `--strict` exits non-zero (`process.exit(1)`) when **any enforced-category
  file is `missing`**.
- `config` and `data` never gate, even under `--strict`.
- `stub` does not fail `--strict` yet (see [Stub detection](#stub-detection)).

## Generator starting points (the shape to enforce)

Each enforced category's spec should start from the matching generator template:

- **routes** — `tools/generators/src/generators/react-router/files/route/__tests__/__name__.test.tsx`
  (and `route-api`, `table`, `modal`, `form` variants alongside it)
- **components** — `tools/generators/src/generators/react-router/files/component/__tests__/__name__.test.tsx`
  and `tools/generators/src/generators/react/files/component/__tests__/__name__.test.tsx`
- **hooks** — `tools/generators/src/generators/react-router/files/hook/__tests__/__name__.test.tsx`
  and `tools/generators/src/generators/react/files/hook/__tests__/__name__.test.tsx`
- **utils** — `tools/generators/src/generators/react/files/util/__tests__/__name__.test.tsx`

Scaffold a conforming spec instead of hand-writing one where a sub-generator
exists:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=hook --application=<app> --folder=<folder> --name=useThing
```

### Known template gaps

Two enforced/informational categories have **no scaffold to conform to** — flag
these as template gaps rather than inventing conformance we can't generate:

- **No `config` test template** exists in any generator.
- **No `react-router` `util` test template** exists — the only `util` spec
  template lives in the `react` generator
  (`tools/generators/src/generators/react/files/util/__tests__/__name__.test.tsx`).

## Running it

```bash
pnpm run audit:test-coverage                       # report-only rollup (exit 0)
pnpm run audit:test-coverage -- --categories=hooks # scope to one/some categories
pnpm run audit:test-coverage:json                  # full machine-readable inventory
pnpm run audit:test-coverage:strict                # exit 1 on enforced-category misses
```

The audit is a repo-root `tsx` script mirroring the other `audit:*` guard-rails.
Cross-file / repo-wide dimensions (does a sibling spec exist?) live in the
script; per-file structural dimensions live in `@tools/dotfiles` ESLint rules.
This audit is intentionally **not** in the `.husky/lib` / `.husky/pre-commit` /
`.husky/pre-push` gate yet — it runs in CI as a non-blocking warning only
(`continue-on-error`).

`audit:test-coverage:strict` is also **deliberately excluded** from the blocking
`audit:strict` aggregate: that script uses a negative-lookahead pattern
(`/^audit:(?!test-coverage).*:strict$/`) so the wide-open gap does not fail CI
while we baseline it.

### Flip a category to strict (later, per category)

Once a category's gap is closed:

1. Drop `test-coverage` from the negative lookahead in the `audit:strict` script
   so `audit:test-coverage:strict` rejoins the blocking aggregate (optionally
   scope with `--categories` first while other categories still have gaps).
2. Mirror it into the husky three-surface gate the way the component-shape gate
   is mirrored byte-identical across `.husky/lib`, `.husky/pre-commit`,
   `.husky/pre-push`, and CI.

## Baseline

The current gap is snapshotted at
[`docs/monorepo/test-coverage-baseline.json`](./test-coverage-baseline.json).
Regenerate it with:

```bash
pnpm run audit:test-coverage:json > docs/monorepo/test-coverage-baseline.json
```

That file is the **source of truth remediation plans carve from** — grouped by
project and category, with the full `missing` and `stub` file lists.
