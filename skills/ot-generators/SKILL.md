---
name: ot-generators
description: >-
  Scaffolding OpenThrottle code with @tools/generators. USE WHEN adding an app,
  package, React Router component, route or hook, or NestJS service — always
  before hand-writing one — or when hitting "Unable to resolve
  @tools/generators" or "Cannot find generator". Not for workspace queries or
  running tasks (nx-workspace), or placing and shaping the result (ot-folders).
metadata:
  author: openthrottle
  last-reviewed: '2026-11-22'
  version: '1.3.0'
---

# OpenThrottle generators and Nx conventions

After generating a package, wire its dependencies by writing `"<pkg>": "workspace:^"` into
`package.json`, then `pnpm install`. **This overrides the vendored `link-workspace-packages` skill**,
which says to use the package manager's add command instead: here `pnpm add <pkg>@workspace:^`
wrongly catalogs the dependency in `pnpm-workspace.yaml`.

## `NX_ISOLATE_PLUGINS=false` on every command

Every Nx invocation that touches `@tools/generators` runs with plugin isolation off, or the local
plugin does not resolve and the generator fails. Prefix each command:

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

4. **Generate** with `--subGenerator=...` and required options (see `--describe`), then report
   the outcome ([why](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/skill-usage-telemetry-scope.md#reporting-an-outcome-from-a-skill)): `success` when it exits 0, `error` when it does not, `abandoned` when no
   generator fits and you say so instead (below). Once per request, not per `--dry-run`.

   ```bash
   r="$(command -v skill-usage-outcome.cjs || echo "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/openthrottle/bin/skill-usage-outcome.cjs")"; if [ -f "$r" ]; then node "$r" --skill ot-generators --outcome success; fi
   ```

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

**Example — four package components in one command** (note `react` + `--destination`, per [Which one scaffolds a component](#which-one-scaffolds-a-component); `react` always writes to the package's `src/components/` and takes no `--folder`):

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-profiling \
  --name=ProfilingServerMetrics,ProfilingQueueMetrics,ProfilingTaskRunMetrics,ProfilingQueueRunMetrics
```

Prefer batching when scaffolding related siblings; split only when names need a different `--folder` (react-router), `--destination` (react) or sub-generator.

Per-generator deep-dives live under `docs/tools/templates/` (`react.md`, `nestjs.md`, `folders.md`), linked from AGENT_USAGE. Generator source: `tools/generators/src/generators/`. Isolate-plugins troubleshooting: `docs/tools/templates/NX_ISOLATE_PLUGINS.md`.

## Gotchas

- **`Cannot find generator 'remix'`.** Older docs called the app generator `remix`; it is
  `react-router`, with the same `--subGenerator` flags.
- **A headless or non-interactive session denies any env-var prefix** (`NX_ISOLATE_PLUGINS=false
pnpm nx g …`, `env NX_ISOLATE_PLUGINS=false …`) as needing approval. There, run plain
  `pnpm nx g @tools/generators:<gen> …` without it: that worked for route, component and hook
  sub-generators (2026-11-08).
- **`--folder` on `react-router` is the path under `app/`** — `routing/settings/components`, not
  `settings`. `--list=componentFolders --application=<app>` prints the valid values.
- **A freshly generated `react-router` component fails lint untouched:** the scaffold emits
  `const {} = props;`, which trips `no-empty-pattern`. Destructure the real props, or for a
  component with none use the `_props: XProps` parameter form.
