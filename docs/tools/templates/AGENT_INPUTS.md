# Agent Inputs: Rules, Examples, and Discoverability

This document specifies **what to provide to agents** so they consistently apply standards and use `@tools/generators` generators. It supports the audit plan **Audit component code for rules compliance and generator template usage** (Plan-Id: `d8ec2e70-8a7a-4717-997f-7c890a70147e`).

**SSOT (Plan-Id `318f9dd8`):** Skill and rule **bodies** live under [`.agents/skills/`](../../../.agents/skills/) and [`.agents/rules/`](../../../.agents/rules/) only. Cursor loads the same content via [`.cursor/skills/`](../../../.cursor/skills/) and [`.cursor/rules/`](../../../.cursor/rules/) **symlinks**. Edit `.agents/` in git PRs; do not duplicate bodies in editor folders.

---

## 1. Rules to load

Agents (e.g. Cursor, Ralph) should receive the following rules. Cursor activates `.cursor/rules/*.mdc` (symlinks into `.agents/rules/`); the list below is the **canonical set** aligned with generator and code-audit expectations.

### 1.1 Always-applied (workspace-wide)

| Path (SSOT)                               | Cursor load path                          | Purpose                                                                                                                    |
| ----------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `.agents/rules/personal-generators.mdc`   | `.cursor/rules/personal-generators.mdc`   | Generator-first workflow; **check generators before writing new code**; `NX_ISOLATE_PLUGINS=false`; link to AGENT_USAGE.md |
| `.agents/rules/personal-general.mdc`      | `.cursor/rules/personal-general.mdc`      | UI/API creation (Remix, React, NestJS), testing (component, userEvent, waitFor), shared-ui usage                           |
| `.agents/rules/commands/agents.mdc`       | `.cursor/rules/commands/agents.mdc`       | Ralph/agent behavior: plans in OpenThrottle only, commit after task, no Cursor attribution                                 |
| `.agents/rules/commands/openthrottle.mdc` | `.cursor/rules/commands/openthrottle.mdc` | When to use openthrottle-mcp tools (plans, tasks, semantic search, activity)                                               |
| `.agents/rules/commands/github.mdc`       | `.cursor/rules/commands/github.mdc`       | Conventional commits, PR template, no Co-authored-by, no Cursor attribution                                                |
| `.agents/rules/cursor-commands.mdc`       | `.cursor/rules/cursor-commands.mdc`       | PNPM, NX, `import * as React`                                                                                              |
| `.agents/rules/no-cursor-attribution.mdc` | `.cursor/rules/no-cursor-attribution.mdc` | No "Made with Cursor" anywhere                                                                                             |

### 1.2 Agent skills (repo-local)

Invoke skills **before** writing code when the task matches their **USE WHEN** triggers. For `@tools/generators`, use **openthrottle-generators** first (not **nx-generate**).

| Path (SSOT)                                            | Purpose                                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `.agents/skills/openthrottle-generators/SKILL.md`      | `@tools/generators`: `NX_ISOLATE_PLUGINS=false`, `pnpm nx`, list/describe/`--list`, react-router/nestjs/react/package/folders; AGENT_USAGE |
| **AGENTS.md** (repo root) § Cursor Agent Skills        | Index: **openthrottle-stack**, **ot-plans**, **workflow-ralph**; generic Nx: **nx-workspace**, **nx-generate**, **nx-run-tasks**           |
| **AGENTS.md** § General Guidelines for working with Nx | Nx task execution (`pnpm nx run`, affected), Nx MCP, when to use **nx_docs**                                                               |

Cursor slash discovery uses `.cursor/skills/<slug>` symlinks → `.agents/skills/<slug>`.

### 1.3 Coding rules (apply when editing/generating code)

| Path (SSOT)                                             | Purpose                                                |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `.agents/rules/coding/default-exports.mdc`              | Named exports; default only for framework pages        |
| `.agents/rules/coding/return-types.mdc`                 | Declare return types; components excepted              |
| `.agents/rules/coding/naming-conventions.mdc`           | kebab files, PascalCase components, ALL_CAPS constants |
| `.agents/rules/coding/import-type.mdc`                  | Use `import type` for types                            |
| `.agents/rules/coding/interface-extends.mdc`            | Prefer interface extends over `&`                      |
| `.agents/rules/coding/readonly-properties.mdc`          | Readonly by default                                    |
| `.agents/rules/coding/optional-properties.mdc`          | Sparing use                                            |
| `.agents/rules/coding/discriminated-unions.mdc`         | Model variants with type field                         |
| `.agents/rules/coding/throwing.mdc`                     | Prefer result types over throw where applicable        |
| `.agents/rules/coding/enums.mdc`                        | No new enums; use `as const`                           |
| `.agents/rules/coding/jsdoc-comments.mdc`               | JSDoc when behavior not self-evident                   |
| `.agents/rules/coding/installing-libraries.mdc`         | pnpm -w, latest versions                               |
| `.agents/rules/coding/no-unchecked-indexed-access.mdc`  | Index access may be `T \| undefined`                   |
| `.agents/rules/coding/any-inside-generic-functions.mdc` | When `any` is acceptable in generics                   |

### 1.4 Single entry points for agents

| Doc                                                                   | Owns                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **This doc (AGENT_INPUTS.md)**                                        | What agents should load: rules list, example commands, discoverability checklist                 |
| **[agent-editor-folders.md](../../monorepo/agent-editor-folders.md)** | Where files live: folder tree, symlink views, canonical ownership, where to edit                 |
| **[.agents/rules/README.md](../../../.agents/rules/README.md)**       | Rules layout (coding/ vs commands/), agent behavior (plans in OT, fail loudly, generators first) |

Agents onboarding: **AGENT_INPUTS** for _what to load_, **agent-editor-folders** for _where to edit_, **`.agents/rules/README.md`** for _how rules are organized_.

---

## 2. Example commands

Agents must use these **canonical patterns**. Every Nx generator command **must** be prefixed with `NX_ISOLATE_PLUGINS=false`.

### 2.1 Generator discovery and execution

```bash
# 1. List all generators
NX_ISOLATE_PLUGINS=false nx list @tools/generators

# 2. Get schema for a generator
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<name> --describe

# 3. List dynamic values (destinations, applications, folders, etc.)
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<name> --list=<key>
# Examples: --list=destinations, --list=applications, --list=componentFolders --application=openthrottle-developer

# 4. Run generator (use --subGenerator for react/remix/nestjs)
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<name> --subGenerator=<type> --<option>=<value> --name=<Name>
```

### 2.2 Per-generator examples

See **[EXAMPLES.md](./EXAMPLES.md)** for copy-paste examples (React, Remix, NestJS, package, folders). **Caveat:** EXAMPLES.md currently omits the `NX_ISOLATE_PLUGINS=false` prefix in some blocks; agents must **always** add it. The authoritative command reference is **[AGENT_USAGE.md](./AGENT_USAGE.md)**.

### 2.3 Other agent-relevant commands

| Intent           | Command / reference                                                                 |
| ---------------- | ----------------------------------------------------------------------------------- |
| Run tasks        | `nx run <project>:<target>`, `nx run-many`, `nx affected` (see AGENTS.md)           |
| Workflow CLI     | `pnpm exec workflow-ralph --plan <uuid>` (see AGENTS.md § Workflow CLI)             |
| OpenThrottle     | Use openthrottle-mcp tools per `.agents/rules/commands/openthrottle.mdc`            |
| SSOT drift guard | `pnpm nx run monorepo:check-agent-assets-ssot` (see CONTRIBUTING.md § Agent assets) |

---

## 3. Discoverability: making generator-first obvious

Agents should encounter "check generators first" in **multiple** places so they don’t skip it.

### 3.1 Primary entry points (must mention generator-first)

| Location                                    | Content                                                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AGENTS.md** (repo root)                   | § Scaffolding: **openthrottle-generators** before nx-generate; § Cursor Agent Skills; link to AGENT_USAGE.md and `.agents/rules/personal-generators.mdc`. |
| **`.agents/rules/README.md`**               | § Agent behavior: "Generators first" + link to personal-generators.mdc and AGENT_USAGE.md.                                                                |
| **`.agents/rules/personal-generators.mdc`** | MANDATORY rule: check generators first, required workflow, list of generators, link to AGENT_USAGE.md.                                                    |
| **docs/tools/templates/AGENT_USAGE.md**     | Full generator-first policy, discover → describe → list → execute, NX_ISOLATE_PLUGINS, examples.                                                          |

### 3.2 Supporting references

| Location                                                              | Content                                                                                                    |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **AGENTS.md**                                                         | § Code style: `.agents/rules/` SSOT; § Generators links to AGENT_USAGE.md.                                 |
| **RULES_TO_GENERATORS_MAP.md**                                        | Maps which rules apply to which generator; use when auditing or applying rules per artifact type.          |
| **AUDIT_SCOPE.md**                                                    | Defines what’s in scope for component/template audits (apps, packages, artifact types).                    |
| **AUDIT_CHECKLIST.md**                                                | Per-artifact checklist and quick-flag list; optional script: `pnpm run audit:templates-compliance`.        |
| **AGENT_INPUTS.md** (this doc)                                        | Single spec for what to provide to agents: rules list, example commands, discoverability.                  |
| **[agent-editor-folders.md](../../monorepo/agent-editor-folders.md)** | Folder layout, symlink matrix, where to edit — not rule/skill bodies (see §1).                             |
| **openthrottle-generators** skill                                     | `.agents/skills/openthrottle-generators/SKILL.md` — invoke before **nx-generate** for `@tools/generators`. |

### 3.3 Recommendations for implementation

- **AGENTS.md:** Keep the Generators section at the top (or immediately after Nx) so agents see it early. Explicitly say: "Before writing new code, components, or services, check generators first (see AGENT_USAGE.md and personal-generators.mdc)."
- **Cursor rules:** Ensure `personal-generators.mdc` has `alwaysApply: true` (already set) so it’s always in context via the `.cursor/rules/` symlink.
- **Skills / onboarding:** Direct agents to **openthrottle-generators** (`.agents/skills/openthrottle-generators/SKILL.md`) before scaffolding: `NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators`, then AGENT_USAGE.md. Nx workspace/tasks: **nx-workspace** / **nx-run-tasks** (see AGENTS.md § Cursor Agent Skills).

---

## 4. Summary

| What                           | Where                                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rules to load**              | §1: always-applied rules under `.agents/rules/` (Cursor: `.cursor/rules/` symlinks); §1.2 **openthrottle-generators** + AGENTS.md skills for Nx/generators; `coding/*` for code edits. Entry points: `.agents/rules/README.md` (rules layout), [agent-editor-folders.md](../../monorepo/agent-editor-folders.md) (folder paths). |
| **Example commands**           | §2: discover (list → describe → list=<key> → execute); NX_ISOLATE_PLUGINS=false on every generator command; EXAMPLES.md for per-generator snippets; AGENT_USAGE.md is authoritative.                                                                                                                                             |
| **Discoverability**            | §3: AGENTS.md, `.agents/rules/README.md`, personal-generators.mdc, AGENT_USAGE.md all state "generator first"; RULES_TO_GENERATORS_MAP, AUDIT_SCOPE, AUDIT_CHECKLIST, AGENT_INPUTS support audits and agent onboarding.                                                                                                          |
| **Folder layout & write path** | [agent-editor-folders.md](../../monorepo/agent-editor-folders.md) — edit `.agents/skills/` and `.agents/rules/` only; editor trees are symlink views.                                                                                                                                                                            |
| **Disk vs DB (D2)**            | Git is write SSOT; `custom_prompts` is a read-only index via future ingest (plan 1.5). Do not treat the DB as an edit surface for agent assets in MVP.                                                                                                                                                                           |

This specification is the single reference for **what agents should load** (rules, examples, discoverability). For **where agent/editor files live** and **contributor workflow**, use [agent-editor-folders.md](../../monorepo/agent-editor-folders.md) and [CONTRIBUTING.md](../../../CONTRIBUTING.md) § Agent assets.
