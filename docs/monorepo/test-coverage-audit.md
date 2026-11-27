# Test-coverage audit

The single, enforceable contract for **which source files must ship a
co-located spec** and what "tested" means. It is the testing-layer sibling of
the [component primitive shape](./component-primitive-shape.md) and
[route primitive shape](./route-primitive-shape.md): where those keep authored
files thin and template-shaped, this one keeps every route, component, hook, and
util paired with a spec that starts from the shape our generators scaffold.

The generator spec templates are the source of truth; this document is their
written contract; `scripts/audit-test-coverage.ts` is the enforcer.

> **Operating principle — the gap cannot grow.** We split the UI into many small,
> easy-to-work-with files and moved a lot around: great for maintainability, but
> it opened a large test gap. The existing gap is frozen in a shrink-only
> allowlist, [`scripts/audit-test-coverage.allowlist.ts`](../../scripts/audit-test-coverage.allowlist.ts),
> and `--strict` runs in the blocking `audit:strict` aggregate (CI's `gates` job
> and `check:local`). A **new** route, component, hook or util without a spec
> fails; an allowlisted file that gains a spec must leave the list in the same
> change. Remediation plans burn the list down; nobody adds to it.

## Categories

Every in-scope source file is classified into exactly one category by its
on-disk location.

### Enforced (gated against the allowlist)

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
| `data`   | `applications/*/app/**/data/**/*.{ts,tsx}` · `packages/*/src/**/data/**/*`     | Mostly static (`data/copy.ts` `*_COPY as const`, option lists, status maps). |

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

- Report-only (exit 0) by default; allowlisted misses are tagged `[allowlisted]`.
- `--strict` exits non-zero (`process.exit(1)`) when an **enforced-category file
  is `missing` and not in the allowlist**, or when an **allowlist entry is
  stale** — the file now has a spec, opts out, moved or no longer exists. Delete
  a stale entry; never add one to get a new file past the gate.
- `--categories` scopes the stale check too: only entries in the scanned
  categories can be stale.
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
pnpm run audit:test-coverage:strict                # exit 1 on an unlisted miss or a stale allowlist entry
```

The audit is a repo-root `tsx` script mirroring the other `audit:*` guard-rails.
Cross-file / repo-wide dimensions (does a sibling spec exist?) live in the
script; per-file structural dimensions live in `@tools/dotfiles` ESLint rules.
`audit:test-coverage:strict` is part of the blocking `audit:strict` aggregate
(`/^audit:.*:strict$/`), which CI's `gates` job and `check:local:audit` both
run. It is not in the `.husky/` pre-commit / pre-push gate.

### Burn down the allowlist

Write the missing spec (from the generator template above), then delete the
file's entry from `scripts/audit-test-coverage.allowlist.ts` in the same
change — `--strict` fails on the stale entry otherwise. When the list is empty,
delete the weekly scheduled workflow, which only exists to track the burn-down.

## Baseline

The current gap is the output of the audit itself — there is **no committed
baseline**. Generate the full inventory (grouped by project and category, with
the complete `missing` and `stub` file lists) when you need one:

```bash
pnpm run --silent audit:test-coverage:json > docs/monorepo/test-coverage-baseline.json
```

That path is gitignored, so a local regen never lands in a diff. The weekly
[scheduled audit](../../.github/workflows/test-coverage-audit-scheduled.yml)
also uploads the same JSON as a `test-coverage-baseline-<run>` artifact (kept
90 days), so remediation planning can start from a snapshot without a local run.

### Why it is not committed

A committed copy used to live at that path. Nothing gated it, so it rotted: by
November 2026 it listed 97 files under names the data-file and NestJS naming
renames had retired, and was missing 866 newer files. Every rename PR had to
hand-patch entries and rollups that no reader relied on.

A drift gate was the alternative and was rejected. The inventory changes with
every added, renamed or newly tested file, so a gate comparing the regen with a
committed copy would fail most UI PRs and force a regen commit on each — a
blocking tax on an audit whose whole operating principle is report-only until a
category's gap closes. When a category does flip to `--strict`, the strict run
is the gate; it needs no snapshot to compare against. The allowlist is not that
snapshot: it holds only the frozen misses, changes only when one is fixed, and
the strict run itself fails when it drifts.
