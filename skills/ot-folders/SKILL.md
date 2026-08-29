---
name: ot-folders
description: >-
  Where OpenThrottle code goes, what it is named, what shape it must have, and
  how to prove it. USE WHEN adding, moving or renaming a file; deciding between
  app/global/ and app/routing/<area>/; deciding whether something is an
  application or a package; or when lint reports
  openthrottle/component-primitive-shape, openthrottle/route-primitive-shape,
  openthrottle/pre-hooks-unpack, max-lines, or
  @nx/enforce-module-boundaries. NOT FOR scaffolding — generate the file with
  ot-generators first, then use this skill to place and shape it.
metadata:
  author: OpenThrottle
  version: '2.0'
---

# OpenThrottle Folders

Where code goes, what it is called, what shape it must have, and how to prove it
before you commit. This codebase evolves quickly; machines write more and more of
it, but humans still have to maintain it — consistent placement is what keeps that
possible.

Scaffold the file with **ot-generators** first, then use this skill to place and
shape it.

## How this fits other skills (no duplication)

| Need                                                       | Use                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| **Where code goes, naming, folder shape, shape rules**     | **this skill**                                       |
| Scaffolding a new app, package, component or route         | **ot-generators** — needs `NX_ISOLATE_PLUGINS=false` |
| Project list, graph, targets, `affected`, running any task | **nx-workspace**                                     |
| SQL migrations, table and column comments                  | **ot-postgres**                                      |
| `openthrottle-server` / `-developer` / GraphQL internals   | **ot-stack**                                         |
| Plans, tasks, `Plan-Id` / `Task-Id`                        | **ot-plans**                                         |
| Wiring a dependency between workspace packages             | **link-workspace-packages**                          |

This skill never tells you how to scaffold or how to run a task. If you find
yourself wanting a generator command here, you want `ot-generators`.

## Reference files

- `references/React-Router_Application.md` — the React Router app tree, `routing/<area>/` expanded
- `references/NestJS_Application.md` — the `openthrottle-server` tree
- `references/Packages.md` — the package flavours and the `src/index.ts` barrel rule
- `references/Enforcement.md` — every rule and audit, the six markers, allowed route exports, opt-out pragmas

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

## The three standing rules

1. **Do not invent new folders.** Use the vocabulary above. If nothing fits, the
   code probably belongs in a different bucket, not a new directory.
2. **Do not create a file per util.** Bucket by theme — one `dates.ts` beats six
   one-function files.
3. **Do not delete empty folders or their `.gitkeep`.** They are placeholders for
   functionality that is coming, and removing them makes the next generator run
   noisier than it needs to be.

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

- Follow the existing verb-first conventions:
  - good: `parseXxxx(param1)`, `formatYyyy(param1, param2)`, `validateZzzzz({ ... })`
  - bad: `must_get_this_done(param1, param2, param3, param4)`
- **Use a configuration object once the parameters exceed 3.**
- **One exported component per file, and its name must match the file name.** The
  `component-primitive-shape` rule computes the expected name as the basename
  without extension — except for `index.tsx`/`index.ts`, where it resolves to the
  **parent directory name**. So `plans/components/PlanCard.tsx` must export
  `PlanCard`, and `plans/components/PlanCard/index.tsx` must too.
- The component's props type is its name plus `Props` (`PlanCardProps`).

## Tags decide what may import what

Placement is no longer only a directory decision. A new project is unusable until
it is tagged, and its tags decide who is allowed to import it. Tags live in the
project's `project.json` / `package.json` `nx.tags` and are validated by
`pnpm run nx:validate-tags` (source: `scripts/nx-validate-tags.ts`).

| Tag           | Cardinality                                           | Values                                                                                                  |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `type:`       | **exactly one**, required                             | `application`, `infrastructure`, `package`, `tool`                                                      |
| `technology:` | one or more, required                                 | `llm`, `nestjs`, `nodejs`, `python`, `react-native`, `react-router`, `react`, `terraform`, `typescript` |
| `production:` | exactly one, required                                 | `true`, `false`                                                                                         |
| `publish:`    | exactly one — **`type:package` and `type:tool` only** | `true`, `false`                                                                                         |

The `technology:` set is closed and lives in `VALID_TECHNOLOGY_TAGS`. Verify it
against the script when you tag a project rather than trusting this table — the
set moves.

Projects also carry a `name:` tag by convention (`name:@openthrottle/nestjs-rbac`).
It is used for filtering and release scoping but is **not** validated by
`nx:validate-tags`, so it will not fail the build if you forget it — match the
siblings anyway.

### The four dependency constraints

From `depConstraints` in `tools/dotfiles/src/index.ts`, enforced by
`@nx/enforce-module-boundaries` at `error`:

| A project tagged   | may depend only on              |
| ------------------ | ------------------------------- |
| `type:application` | `type:package`                  |
| `type:package`     | `type:package`                  |
| `type:tool`        | `type:package`, `type:tool`     |
| `production:true`  | **never** on `production:false` |

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

Cheapest first. Stop at the tier that covers what you touched.

**1 — Just this file.** Picks up all three custom rules and the `max-lines` cap.

```bash
pnpm exec eslint applications/openthrottle-developer/app/routing/plans/components/AddHookDialog.tsx
```

Exits 0 on warnings, non-zero on errors — so a `route-primitive-shape` or
`pre-hooks-unpack` warning will _not_ fail this. Read the output, don't just check
the exit code.

**2 — The shape audits.** Repo-wide inventory plus the CI gate.

```bash
pnpm run audit:component-shape:strict
pnpm run audit:component-shape:shadcn:strict
pnpm run audit:route-shape:strict
```

`pnpm run check:local:audit` runs all three. Note what `--strict` actually gates:
it exits non-zero on **R4/R5 only** (hoist violations and multi-component files).
R6, the 210-line count, is reported but never fails the audit — ESLint's
`max-lines` owns that cap, and the audit's count runs one line higher than
ESLint's, so a file the audit lists as 211 can be at the cap and pass lint.

**3 — New project, moved package, changed tags.**

```bash
pnpm run nx:validate-tags
pnpm run check:local:package-entrypoints
```

`pnpm run nx:validate` also runs `nx:validate-projects` and
`nx:validate-configurations`; the latter currently exits 1 in a clean checkout
when `.cursor/plans/` is absent — the audit itself passes and only the report
write fails, so read the output rather than trusting the exit code there.

**4 — The full local gate.** The slow one — affected lint, typecheck and test
across the workspace, plus every check above. Run it before opening a PR, not
after every edit.

```bash
pnpm run check:local
```

### What actually blocks a merge

See `docs/monorepo/CI-quality-gates.md`. In short:

- **Blocking today:** `component-primitive-shape` (both profiles) at `error`, the
  component `max-lines` cap, `@nx/enforce-module-boundaries`,
  `@nx/dependency-checks`, tag validation, and package entrypoints.
- **Advisory today:** `route-primitive-shape`, `pre-hooks-unpack`, and the route
  `max-lines` cap are all `warn` — the warn-first rollout. Each application
  ratchets its own routes to `error` in its `eslint.config.ts` once they are
  clean. `audit-templates-compliance` and `audit-test-coverage` are report-only.

Advisory is not optional — write new code to the standard. The warnings exist
because remediating the existing violations was out of scope, not because the
shape is negotiable.
