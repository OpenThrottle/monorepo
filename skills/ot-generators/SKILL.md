---
name: ot-generators
description: >-
  Scaffolding OpenThrottle code with @tools/generators. USE WHEN adding an app,
  package, React Router component or route, or NestJS service — always before
  hand-writing one — or when hitting "Unable to resolve @tools/generators" or
  "Cannot find generator". Every command needs NX_ISOLATE_PLUGINS=false. Defer
  graph, targets and task running to nx-workspace.
---

# OpenThrottle generators and Nx conventions

## When to read this skill

- You are about to **create or scaffold** code in this repo (components, routes, NestJS services, packages, folder trees).
- Nx errors with **`Unable to resolve @tools/generators:...`** or **Cannot find generator** (often a wrong generator name — see [Registered names](#registered-generator-names)).
- You need the **OT-specific** command pattern: `NX_ISOLATE_PLUGINS=false` + **`pnpm nx`** and links to **AGENT_USAGE** paths.

## How this fits other skills (no duplication)

| Need                                                                      | Use                                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Local `@tools/generators` workflow, OT flags, doc paths**               | **This skill**                                                                  |
| **Read-only** workspace: project list, `nx show project`, graph, affected | **nx-workspace** — `.agents/skills/nx-workspace/SKILL.md`                       |
| **Execute** `nx run`, `affected`, `run-many` after code exists            | **nx-workspace** — `.agents/skills/nx-workspace/SKILL.md`                       |
| **Plans, Plan-Id / Task-Id, openthrottle-mcp**                            | **ot-plans** — `.agents/skills/ot-plans/SKILL.md`                               |
| **Link workspace packages** after new packages                            | **link-workspace-packages** — `.agents/skills/link-workspace-packages/SKILL.md` |

## Non-negotiable: `NX_ISOLATE_PLUGINS=false`

Every Nx invocation that touches **`@tools/generators`** must run with plugin isolation **off**, or generators **will fail** in typical agent/CI environments.

Prefix each command:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx <subcommand> ...
```

This repo standardizes on **pnpm** and **nx** via **`pnpm nx`** (see `AGENTS.md`). Do not omit the prefix.

## Registered generator names

**Source of truth:** `tools/generators/generators.json` — confirm anytime with:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators
```

As of that list, registered generators are:

| Generator key  | Purpose (high level)                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `folders`      | Folder trees for routes/services                                                                            |
| `nestjs`       | NestJS apps, services, modules, GraphQL services, etc.                                                      |
| `package`      | New workspace packages                                                                                      |
| `react`        | React components/hooks for packages or apps (`--destination`, `--list=destinations`)                        |
| `react-router` | React Router app artifacts: components, routes, hooks, utils (`--application`, `--list=applications`, etc.) |

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
[`docs/tools/templates/AGENT_USAGE.md`](../../docs/tools/templates/AGENT_USAGE.md).

### Docs vs reality: `remix` vs `react-router`

Some documentation (including sections of `docs/tools/templates/AGENT_USAGE.md`) still shows **`@tools/generators:remix`**. That name is **not** registered; Nx will error:

`Unable to resolve @tools/generators:remix` / `Cannot find generator 'remix'`.

Use **`@tools/generators:react-router`** and the same `--subGenerator` / flags described for Remix-style apps in those docs, unless `--describe` shows otherwise.

## Discovery workflow (mandatory order)

Aligned with `.cursor/rules/personal-generators.mdc`:

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

## Typical OpenThrottle entrypoints

Exact flags change over time; always use **`--describe`** and **`--list`** for the generator you chose.

- **Components:** see [Which one scaffolds a component](#which-one-scaffolds-a-component) above — the package-vs-application split is the only place this is stated.
- **Application routes:** `react-router` with `--application` from `--list=applications`, and `--list=componentFolders` where applicable.
- **GraphQL / NestJS in `openthrottle-server`:** often `nestjs` with `--subGenerator=graphql-service` or other sub-generators from `--describe`.
- **New libs:** `package` generator, then wire deps via **link-workspace-packages** if needed.

Per-generator markdown deep-dives live under `docs/tools/templates/` (e.g. `react.md`, `nestjs.md`, `folders.md`) as linked from the canonical guide below.

## Canonical documentation paths

| Document                                                   | Path                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Full agent workflow (Quick Start, API, best practices)** | `docs/tools/templates/AGENT_USAGE.md`                                      |
| **Nx isolate-plugins troubleshooting**                     | `docs/tools/templates/NX_ISOLATE_PLUGINS.md` (referenced from AGENT_USAGE) |
| **Generators package overview**                            | `tools/generators/README.md`                                               |
| **Generator source**                                       | `tools/generators/src/generators/`                                         |
| **Cursor rule (short form)**                               | `.cursor/rules/personal-generators.mdc`                                    |
| **Monorepo entry**                                         | `AGENTS.md` (Generators / Nx sections)                                     |

## OpenThrottle and commits

Scaffolding is unrelated to **OT** tool calls, but if work is tracked under a plan/task, follow **ot-plans**: conventional commits with **`Plan-Id`** / **`Task-Id`** in the footer; record the merged squash on the work ledger (`record_artifact` / `workflow-link-merge`) post-merge when your team uses that workflow.

## Cross-links

- \*_nx-workspace:^_ `.agents/skills/nx-workspace/SKILL.md`
- **ot-plans:** `.agents/skills/ot-plans/SKILL.md`
