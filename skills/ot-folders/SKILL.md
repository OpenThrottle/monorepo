---
name: ot-folders
description: >-
  Where OpenThrottle code goes, what it is named, what shape it must have, and
  how to prove it. USE WHEN adding, moving or renaming a file or folder;
  deciding between app/global/ and app/routing/<area>/ or between an
  application and a package; or when lint reports an openthrottle/*-shape rule,
  pre-hooks-unpack, max-lines or @nx/enforce-module-boundaries. Not for
  scaffolding: generate the file with ot-generators first.
metadata:
  author: openthrottle
  last-reviewed: '2026-11-22'
  version: '2.4.0'
---

# OpenThrottle Folders

## Neighbouring skills

| Need                                                       | Use                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| Scaffolding a new app, package, component or route         | **ot-generators** — needs `NX_ISOLATE_PLUGINS=false` |
| Project list, graph, targets, `affected`, running any task | **nx-workspace**                                     |
| `openthrottle-server` / `-developer` / GraphQL internals   | **ot-stack**                                         |

## Reference files

- `references/React-Router_Application.md` — read when placing a file under an app's `app/`: the
  tree, with `routing/<area>/` expanded
- `references/NestJS_Application.md` — read when placing a file in `openthrottle-server`
- `references/Packages.md` — read when creating a package or adding to one: the package flavours
  and the `src/index.ts` barrel rule
- `references/Enforcement.md` — read when a lint rule or audit fires: every rule, the six markers,
  allowed route exports, opt-out pragmas, and the tag tables
- `references/verification.md` — read before a PR: the four verification tiers and what blocks a
  merge

## Technology buckets

Every project in this Nx monorepo belongs to one of four stacks. The bucket decides
which folder vocabulary applies and, via `technology:` tags, what may import it.

| Bucket         | What lives there                                                 | Folder vocabulary                                          |
| -------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `nestjs`       | Applications and modules many NestJS applications may consume    | `modules` `services` `guards` `config` — no components     |
| `nodejs`       | Server/client-agnostic code consumed by both API and client apps | `config` `data` `utils` — no components, no hooks          |
| `react`        | Client code using React but **never** importing `react-router`   | `components` `config` `data` `hooks` `utils`               |
| `react-router` | Client code coupled to the React Router framework                | `components` `config` `data` `hooks` `utils` (+ `actions`) |

**The bucket rule:** the moment a file imports from `react-router`, it belongs to the
`react-router` bucket — never the `react` one. React-only packages must not reach for
router primitives to stay reusable outside a router tree.

> In practice every React package in `packages/` today is `react-router-*`; the
> `react` bucket is a valid `technology:` tag with no current instance. Do not
> create a bare `react-*` package without a deliberate reason to keep it
> router-free.

## Where does this file go?

Resolve top to bottom. The first row that matches wins.

| What you are writing                             | React Router application                           | NestJS application             | Package                            |
| ------------------------------------------------ | -------------------------------------------------- | ------------------------------ | ---------------------------------- |
| A component used by **one** route area           | `app/routing/<area>/components/`                   | n/a                            | `src/components/`                  |
| A component used by **2+** route areas           | `app/global/components/`                           | n/a                            | `src/components/`                  |
| A component reused across **applications**       | a `type:package` under `packages/react-router-*`   | n/a                            | — you are already here             |
| A pure function                                  | `app/routing/<area>/utils/` or `app/global/utils/` | `src/services/`                | `src/utils/`                       |
| Static or mock data                              | `.../data/`                                        | `src/config/`                  | `src/data/`                        |
| Service config, defaults, constants              | `.../config/`                                      | `src/config/`                  | `src/config/`                      |
| React state + logic                              | `.../hooks/`                                       | n/a                            | `src/hooks/`                       |
| A React Router `action`                          | `app/routing/<area>/actions/`                      | n/a                            | n/a                                |
| A route module                                   | `app/routes/` (registered in `app/routes.ts`)      | n/a                            | n/a                                |
| Types                                            | `.../types/`, or a sibling `types.ts`              | beside the module              | `.../types/` or sibling `types.ts` |
| Test helpers / fixtures                          | `app/routing/<area>/testing/`, `app/testing/`      | `tests/`                       | `tests/`                           |
| A NestJS module used by **one** app              | `src/modules/`                                     | `src/modules/`                 | n/a                                |
| A NestJS module used by **2+** apps              | n/a                                                | promote to `packages/nestjs-*` | — you are already here             |
| Server/client-agnostic helper used by both tiers | n/a                                                | n/a                            | `packages/nodejs-*`                |

### The promotion ladder

Placement is a reach question, and it only ever moves outward:

```
app/routing/<area>/     one route area uses it
        ↓ a second area needs it
app/global/             two or more areas in ONE application use it
        ↓ a second application needs it
packages/               two or more applications use it
```

Promote when the second consumer appears — not in anticipation of one. An
**application can never be imported**: if two applications need the same code, it
is a package, and that is the whole test.

`app/global/` carries only `{components,config,data,hooks,utils}`. There is no
`app/global/actions/`, `testing/`, or `types/` — those exist per area under
`app/routing/<area>/`, which carries all eight:
`{actions,components,config,data,hooks,testing,types,utils}`.

## The four standing rules

1. **Do not invent new folders.** Use the vocabulary above. If nothing fits, the
   code probably belongs in a different bucket, not a new directory.
   _Enforced_ for packages' top-level `src/` folders by `check-folder-vocabulary`.
2. **Bucket utils by theme**, per AGENTS.md § Code style ("prefer a bucket module").
3. **Do not delete empty folders or their `.gitkeep`.** They are placeholders for
   functionality that is coming, and removing them makes the next generator run
   noisier than it needs to be.
4. **No junk-drawer folder names: `lib`, `helpers`, `common`, `shared`, `misc`.**
   `lib` is the main offender. In this monorepo **a package is the lib** — a
   `type:package` under `packages/`. A `lib/` inside an app, a package or `scripts/`
   is a vaguer second word for the same idea, and it grows without bound because
   nothing in the name says what belongs there. Ask "which vocabulary word
   describes what's in here?"; if none does, see rule 1.

   | You reached for              | Use instead                                                                  |
   | ---------------------------- | ---------------------------------------------------------------------------- |
   | `lib/`, `helpers/`, `misc/`  | `utils/` (pure functions), `config/` (constants, defaults), `data/` (static) |
   | `shared/`, `common/`         | the [promotion ladder](#the-promotion-ladder): `app/global/`, then a package |
   | "it's reusable library code" | a package — scaffold it with `ot-generators`                                 |
   | a tool's own specific term   | fine — Maestro `subflows/` is specific; vagueness is the problem             |

## The folder vocabulary

- **`components`** — the building blocks of the UI, the smallest unit worth
  reusing. Keep them simple, testable, and generated rather than hand-written.
  React Router applications and React / React Router packages only.
- **`config`** — configuration of services, default values, constants. Not
  behavior, not data.
- **`data`** — mock or hard-coded data. Easier to type and to work with than the
  same literal embedded in a component.
- **`hooks`** — composed logic and state. React Router applications and React /
  React Router packages only.
- **`utils`** — logic lifted out of components so it can be tested in isolation.
  A function that takes params and does not depend on external state is always a
  candidate to move here.
- **`actions`** — React Router actions for one route area.
- **`testing`** — helpers and fixtures for the tests of that area.

## Naming

- Name functions verb-first (`parseX`, `formatY`), and pass a configuration object once there are
  more than three parameters.
- **Let the folder carry the kind.** A file never repeats its folder in its name: `utils/auth.ts`,
  not `utils/utils.auth.ts` or `utils/auth-utils.ts`. The mandated forms are the exception:
  `data.<name>.ts`, `mock.<name>.ts` and NestJS `<folder>.<kind>.ts`. Existing `utils.<x>.ts` files
  are legacy; do not add new ones. A folder's first code goes in its `index.ts`; split it into
  subject files (`utils/formatters.ts`) once it grows ([the barrel rule](references/Packages.md#the-barrel-rule)).
- **A component file's export name matches its file name.** The
  `component-primitive-shape` rule computes the expected name as the basename
  without extension — except for `index.tsx`/`index.ts`, where it resolves to the
  **parent directory name**. So `plans/components/PlanCard/index.tsx` must export
  `PlanCard`.

Component, hook, NestJS file and `data/` naming and export rules are normative in
[AGENTS.md § Code style](https://github.com/openthrottle/monorepo/blob/main/AGENTS.md#code-style); rationale in
[`code-style.md`](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/code-style.md).
Hook contract: [hook-primitive-shape.md](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/hook-primitive-shape.md).

## Tags decide what may import what

Placement is no longer only a directory decision. A new project is unusable until it is tagged,
and its tags decide who is allowed to import it. Every project carries exactly one `type:`
(`application`, `infrastructure`, `package`, `tool`), one or more `technology:`, one
`production:` and — packages and tools only — one `publish:`. Validate with
`pnpm run nx:validate-tags`; the full cardinality table and the closed `technology:` set are in
`references/Enforcement.md` § Tags.

`@nx/enforce-module-boundaries` (`depConstraints` in `tools/dotfiles/src/index.ts`) allows
`type:application` → `type:package` only, `type:package` → `type:package`, `type:tool` →
`type:package` or `type:tool`, and never `production:true` → `production:false`.

### What that means when you are placing code

- **An application can never be imported.** Nothing may depend on a
  `type:application`. The moment a second application needs the code, it is a
  package — that is the entire test, and it is enforced, not advisory.
- **A package imported by a production application must itself be
  `production:true`.** Tagging a package `production:false` and then importing it
  from a shipping app fails lint. Decide the tag when you create the package, not
  when the build breaks.
- **Only tools may depend on tools.** If a package reaches for something in
  `tools/`, that something is in the wrong place — move it to a package.
- **A new package needs a `publish:` tag**, `true` or `false`. `type:application`
  and `type:infrastructure` must not carry one.

A boundary error is a placement error. Fix the tags or move the code — never
reach past the boundary with a deep import or a relative path that climbs out of
the project.

## Verify before you commit

Cheapest first; stop at the tier that covers what you touched:
`pnpm exec eslint <file>`, then the shape audits (`pnpm run audit:component-shape:strict`,
`audit:route-shape:strict`, `pnpm nx run monorepo:check-folder-vocabulary`), then
`pnpm run nx:validate-tags` for new or retagged projects, then `pnpm run check:local`
before a PR. Blocking gates: component and hook shape, the component `max-lines` cap,
module boundaries, tag validation. Route shape and `pre-hooks-unpack` are `warn` but
not optional.

Read [references/verification.md](references/verification.md) when you need the exact
commands per tier or what each audit gates.

**Report the outcome when the tier you stopped at passes** ([why](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/skill-usage-telemetry-scope.md#reporting-an-outcome-from-a-skill)): `success`; `error` if you
end with a gate still failing; `abandoned` if the change turned out to need no placement call.

```bash
r="$(command -v skill-usage-outcome.cjs || echo "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/openthrottle/bin/skill-usage-outcome.cjs")"; if [ -f "$r" ]; then node "$r" --skill ot-folders --outcome success; fi
```

## Gotchas

- `eslint` exits 0 on warnings: `route-primitive-shape` and `pre-hooks-unpack` will not
  fail it. Read the output, not the exit code.
- lint-staged runs `eslint --fix` before `prettier --write`, so prettier can reflow a
  component past the 210-line cap after lint passed. Check the line count after formatting.
