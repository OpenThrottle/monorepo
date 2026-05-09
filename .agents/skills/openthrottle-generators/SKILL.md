---
name: openthrottle-generators
description: >-
  OpenThrottle monorepo scaffolding with @tools/generators: mandatory
  NX_ISOLATE_PLUGINS=false, pnpm nx, list/describe/--list discovery, and
  registered generator names (react-router, nestjs, react, package, folders).
  Use when adding apps, packages, React Router UI, NestJS services, or any
  new file that should be generated; when docs say "remix" but Nx cannot
  resolve the generator; or when aligning with AGENT_USAGE and
  personal-generators.mdc. Defer deep Nx graph/target questions to
  nx-workspace; generic multi-plugin generator flow to nx-generate; running
  build/test after codegen to nx-run-tasks.
---

# OpenThrottle generators and Nx conventions

## When to read this skill

- You are about to **create or scaffold** code in this repo (components, routes, NestJS services, packages, folder trees).
- Nx errors with **`Unable to resolve @tools/generators:...`** or **Cannot find generator** (often a wrong generator name — see [Registered names](#registered-generator-names)).
- You need the **OT-specific** command pattern: `NX_ISOLATE_PLUGINS=false` + **`pnpm nx`** and links to **AGENT_USAGE** paths.

## How this fits other skills (no duplication)

| Need                                                                                               | Use                                                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Local `@tools/generators` workflow, OT flags, doc paths**                                        | **This skill**                                                                  |
| **Any Nx generator** (plugin + local), dry-run, reading generator source, library buildable vs not | **nx-generate** — `.agents/skills/nx-generate/SKILL.md`                         |
| **Read-only** workspace: project list, `nx show project`, graph, affected                          | **nx-workspace** — `.agents/skills/nx-workspace/SKILL.md`                       |
| **Execute** `nx run`, `affected`, `run-many` after code exists                                     | **nx-run-tasks** — `.agents/skills/nx-run-tasks/SKILL.md`                       |
| **Plans, Plan-Id / Task-Id, mcp-developer**                                                        | **ot-plans** — `.agents/skills/ot-plans/SKILL.md`                               |
| **Link workspace packages** after new packages                                                     | **link-workspace-packages** — `.agents/skills/link-workspace-packages/SKILL.md` |

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

Prefer **`--dry-run`** where supported (see **nx-generate**) before writing files.

## Typical OpenThrottle entrypoints

Exact flags change over time; always use **`--describe`** and **`--list`** for the generator you chose.

- **Shared UI / packages:** often `react` with `--destination` from `--list=destinations`.
- **Application routes/components (e.g. `openthrottle-developer`):** often `react-router` with `--application` from `--list=applications` and `--list=componentFolders` where applicable.
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

Scaffolding is unrelated to **OT** tool calls, but if work is tracked under a plan/task, follow **ot-plans**: conventional commits with **`Plan-Id`** / **`Task-Id`** in the footer; **`link_commit`** only for post-merge squash when your team uses that workflow.

## Cross-links

- **nx-generate:** `.agents/skills/nx-generate/SKILL.md`
- **nx-workspace:** `.agents/skills/nx-workspace/SKILL.md`
- **nx-run-tasks:** `.agents/skills/nx-run-tasks/SKILL.md`
- **ot-plans:** `.agents/skills/ot-plans/SKILL.md`
