# Enforcement

Every placement and shape rule in this skill is caught by something. This file
maps each guardrail to the checker, the severity it carries **today**, its
opt-out, the command that runs it, and the doc that explains it.

Severities are read from `tools/dotfiles/src/index.ts`; verify there rather than
trusting this table if the two ever disagree.

## The matrix

| Rule or check                            | Where it applies (glob)                      | Severity today                            | Opt-out                           | Command                                        | Canonical doc                                     |
| ---------------------------------------- | -------------------------------------------- | ----------------------------------------- | --------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| `openthrottle/component-primitive-shape` | `**/components/**/*.tsx`                     | **error**                                 | `component-shape: opt-out`        | `pnpm run audit:component-shape:strict`        | `docs/monorepo/component-primitive-shape.md`      |
| …same rule, `primitive` profile          | `**/packages/react-router-shadcn/**/*.tsx`   | **error**                                 | `component-shape: opt-out`        | `pnpm run audit:component-shape:shadcn:strict` | `docs/monorepo/component-shape-shadcn-variant.md` |
| `openthrottle/route-primitive-shape`     | `**/app/routes/**/*.{ts,tsx}`                | **warn** (per-project ratchet → error)    | `route-shape: opt-out — reason`   | `pnpm run audit:route-shape:strict`            | `docs/monorepo/route-primitive-shape.md`          |
| `openthrottle/pre-hooks-unpack`          | both surfaces above                          | **warn** (both)                           | either pragma                     | `pnpm exec eslint <path>`                      | `docs/monorepo/component-primitive-shape.md`      |
| `max-lines` (210)                        | components                                   | **error**                                 | `component-shape: opt-out`        | `pnpm exec eslint <path>`                      | `docs/monorepo/component-primitive-shape.md` (R6) |
| `max-lines` (210)                        | routes                                       | **warn**                                  | `route-shape: opt-out — reason`   | `pnpm exec eslint <path>`                      | `docs/monorepo/route-primitive-shape.md` (R4)     |
| `max-lines`                              | `react-router-shadcn`                        | **off** — primitive families multi-export | n/a                               | n/a                                            | `docs/monorepo/component-shape-shadcn-variant.md` |
| `@nx/enforce-module-boundaries`          | all projects, via `type:`/`production:` tags | **error**                                 | none — fix the tags or the import | `pnpm nx affected --target=lint`               | `docs/monorepo/NX/tags.md`                        |
| `@nx/dependency-checks`                  | package `package.json` deps                  | **error**                                 | none                              | `pnpm nx affected --target=lint`               | `MONOREPO.md`                                     |
| `nx-validate-tags`                       | every project's `tags`                       | **error**                                 | none                              | `pnpm run nx:validate-tags`                    | `docs/monorepo/NX/tags.md`                        |
| `nx-validate-projects`                   | project configuration                        | **error**                                 | none                              | `pnpm run nx:validate-projects`                | `MONOREPO.md`                                     |
| `nx-validate-configurations`             | target configuration                         | **error**                                 | none                              | `pnpm run nx:validate-configurations`          | `MONOREPO.md`                                     |
| `check-package-entrypoints`              | package `main`/`types`/`exports`             | **error**                                 | none                              | `pnpm run check:local:package-entrypoints`     | `MONOREPO.md`                                     |
| `check-catalog-coverage`                 | pnpm catalog dependency versions             | **error**                                 | none                              | `pnpm run check:catalog`                       | `CONTRIBUTING.md`                                 |
| `audit-templates-compliance`             | `.tsx` vs generator templates                | advisory                                  | n/a                               | `pnpm run audit:templates-compliance`          | `docs/tools/templates/AGENT_USAGE.md`             |
| `audit-test-coverage`                    | repo-wide test coverage                      | advisory (warn-mode)                      | n/a                               | `pnpm run audit:test-coverage`                 | `docs/monorepo/test-coverage-audit.md`            |

**`--strict` gates R4/R5 only.** The shape audits exit non-zero on hoist
violations and multi-component files. The R6 line count is reported but never
fails the audit — ESLint's `max-lines` owns that cap, and the audit counts one
line higher than ESLint does, so a file the audit lists at 211 can be at the cap
and pass lint.

`pnpm run nx:validate` runs all three `nx:validate-*` scripts, but
`nx:validate-configurations` currently exits 1 in a clean checkout when
`.cursor/plans/` is absent — the audit passes and only the report write fails.
`pnpm run audit:strict` runs every `audit:*:strict` except test-coverage.

**What actually gates locally:** `check:local` runs `check:local:component-shape`
(component + shadcn strict) but **not** `check:local:audit` — so route-shape
strict is _not_ part of `check:local`. That matches the rule's `warn` severity
and the warn-first rollout. See `docs/monorepo/CI-quality-gates.md` for what
blocks a merge.

## The six section markers

Both the component and the route rule enforce the same six line-comment markers,
in this order:

```tsx
// Hooks

// Setup

// Handlers

// Markup

// Life Cycle

// 🔌 Short Circuit
```

Three things are checked, and each has its own error:

- **`missingMarker`** — all six must be present.
- **`markerOutOfOrder`** — the markers that are present must appear in the order
  above.
- **`markerMissingBlankLine`** — each marker must be preceded by **exactly one
  blank line**. The single exception is a marker on the first line of the
  function body, directly after the opening `{`.

Keep the markers even when a section is empty — the generator scaffolds all six
and the rule expects all six.

### The pre-Hooks unpack block

`props` must be unpacked **before** the `// Hooks` marker — between the signature
and the first marker, never after it:

```tsx
const PlanCard = ({ plan, onSelect }: PlanCardProps) => {
  const { title, status } = plan;

  // Hooks
  const navigate = useNavigate();
```

The rule follows nested unpacks to any depth, so a chain like
`const { loaderData } = props; const { repository } = loaderData;` is walked
through. Route keys (`loaderData`, `actionData`, `params`, `matches`) are not a
special case — they are just a props shape, which is why one shared rule covers
both authored components and route default Components. Wired at `warn` on both
surfaces, graduating to `error` independently per surface.

## Route module exports

A file under `app/routes/` may export only these fourteen values, plus its
default component:

`ErrorBoundary`, `HydrateFallback`, `Layout`, `action`, `clientAction`,
`clientLoader`, `clientMiddleware`, `handle`, `headers`, `links`, `loader`,
`meta`, `middleware`, `shouldRevalidate`

Type-only exports are fine. Any other **value** export is an R1 violation and
must hoist to:

```
~/routing/<area>/{utils,config,data,hooks}
```

That is the rule's own hint string, and it is also the placement answer: a helper
that a route needs is area code, not route code.

## Opt-out pragmas

For the genuinely irreducible file only — a first-line **block** comment:

```tsx
/* component-shape: opt-out — <reason> */
```

```tsx
/* route-shape: opt-out — <reason> */
```

`pre-hooks-unpack` honors **either** pragma, since it runs on both surfaces.
The matcher looks for `component-shape: opt-out` / `route-shape: opt-out`, so the
em-dash reason is convention rather than syntax — write it anyway. An opt-out
without a reason is an unexplained exemption, and the next person cannot tell
whether it still applies.
