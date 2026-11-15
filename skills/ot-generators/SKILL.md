---
name: ot-generators
description: >-
  Scaffolding OpenThrottle code with @tools/generators. USE WHEN adding an app,
  package, React Router component or route, or NestJS service — always before
  hand-writing one — or when hitting "Unable to resolve @tools/generators" or
  "Cannot find generator". Every command needs NX_ISOLATE_PLUGINS=false. Defer
  graph, targets and task running to nx-workspace.
metadata:
  author: openthrottle
  last-reviewed: '2026-11-14'
  version: '1.1.0'
---

# OpenThrottle generators and Nx conventions

## When to read this skill

- You are about to **create or scaffold** code in this repo (components, routes, NestJS services, packages, folder trees).
- Nx errors with **`Unable to resolve @tools/generators:...`** or **Cannot find generator** (often a wrong generator name — see [Docs vs reality](#docs-vs-reality-remix-vs-react-router)).

For read-only workspace queries and running tasks use `nx-workspace`; after generating a package, wire its dependencies with `link-workspace-packages`.

## Non-negotiable: `NX_ISOLATE_PLUGINS=false`

Every Nx invocation that touches **`@tools/generators`** must run with plugin isolation **off**, or generators **will fail** in typical agent/CI environments.

Prefix each command:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx <subcommand> ...
```

## Registered generators

The source of truth is `tools/generators/generators.json`; list them with `NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators`.

### Which one scaffolds a component

This is the one distinction agents get wrong, so it is stated here once and referenced
everywhere else in this skill:

- **In a package** → `react --subGenerator=component --destination=<project>`. Any project
  tagged `technology:react` is a valid destination, including `packages/react-router-*`.
- **Inside an application** → `react-router --subGenerator=component --application=<app> --folder=<path>`,
  resolved under `applications/<app>/app/routing`.

`react-router` does **not** scaffold into `packages/` — passing a package to `--application`
is the wrong generator, not an unsupported target. `react` handles app-local components too,
so when in doubt it is the safer of the two. Full matrix:
[`docs/tools/templates/AGENT_USAGE.md`](https://github.com/openthrottle/monorepo/blob/main/docs/tools/templates/AGENT_USAGE.md).

### Docs vs reality: `remix` vs `react-router`

Some documentation (including sections of `docs/tools/templates/AGENT_USAGE.md`) still shows **`@tools/generators:remix`**. That name is **not** registered; Nx will error:

`Unable to resolve @tools/generators:remix` / `Cannot find generator 'remix'`.

Use **`@tools/generators:react-router`** and the same `--subGenerator` / flags described for Remix-style apps in those docs, unless `--describe` shows otherwise.

## Discovery workflow (mandatory order)

Check for a generator before writing ANY new code by hand; picking the wrong generator is the mistake that actually happens.

1. **List generators**

   ```bash
   NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators
   ```

2. **Schema / required flags**

   ```bash
   NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<generator> --describe
   ```

3. **Dynamic values** (applications, destinations, folders, etc.)

   ```bash
   NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<generator> --list=<key> [--application=<app>]
   ```

4. **Generate** with `--subGenerator=...` and required options (see `--describe`).

5. **Only then** hand-edit for business logic.

Prefer **`--dry-run`** where supported before writing files.

**If no generator fits, say so explicitly before writing custom code.** Silently hand-writing
what a generator would have scaffolded is how files drift out of the primitive shape the
`ot-folders` rules and the component ESLint rule then reject.

**Hooks have the same contract.** `--subGenerator=hook` (`react --destination=<package>` or
`react-router --application=<app> --folder=<area>`) emits a hook that already passes
`openthrottle/hook-primitive-shape`: one `useFoo` in `hooks/useFoo.tsx`, its `UseFooOptions`
and `UseFooResult` interfaces, an explicit return type and the six markers. A second hook gets
its own generated file, never a second export
([hook-primitive-shape.md](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/hook-primitive-shape.md)).

## Batch generation (`--name` comma-separated)

Most `@tools/generators` sub-generators accept **multiple names in one invocation** via comma-separated `--name` values (spaces after commas are fine: `A, B, C`).

**Confirm support:** `--describe` JSON includes `"description": "Comma-separated names supported."` on the `name` option when batching works (e.g. `react`, `react-router` component/route/form/modal/table; `react` hook/util). Some generators (e.g. NestJS `application`) use a single slug—always read `--describe` for the generator you chose.

**Example — four package components in one command** (note `react` + `--destination`, per [Which one scaffolds a component](#which-one-scaffolds-a-component)):

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-profiling \
  --folder=components \
  --name=ProfilingServerMetrics,ProfilingQueueMetrics,ProfilingTaskRunMetrics,ProfilingQueueRunMetrics
```

Prefer batching when scaffolding related siblings; split only when names need different `--folder`, `--destination`, or sub-generators.

Per-generator deep-dives live under `docs/tools/templates/` (`react.md`, `nestjs.md`, `folders.md`), linked from AGENT_USAGE. Generator source: `tools/generators/src/generators/`. Isolate-plugins troubleshooting: `docs/tools/templates/NX_ISOLATE_PLUGINS.md`.
