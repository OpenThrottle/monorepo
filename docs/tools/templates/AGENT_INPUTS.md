# Agent Inputs: Rules, Examples, and Discoverability

This document specifies **what to provide to agents** so they consistently apply standards and use `@tools/generators` generators. It supports the audit plan **Audit component code for rules compliance and generator template usage** (Plan-Id: `d8ec2e70-8a7a-4717-997f-7c890a70147e`). **Planning only**—no implementation.

---

## 1. Rules to load

Agents (e.g. Cursor, Ralph) should receive the following rules. Cursor loads `.cursor/rules/*.mdc` automatically; the list below is the **canonical set** to keep in sync with generator and code-audit expectations.

### 1.1 Always-applied (workspace-wide)

| Path                                      | Purpose                                                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/rules/personal-generators.mdc`   | Generator-first workflow; **check generators before writing new code**; `NX_ISOLATE_PLUGINS=false`; link to AGENT_USAGE.md |
| `.cursor/rules/personal-general.mdc`      | UI/API creation (Remix, React, NestJS), testing (component, userEvent, waitFor), shared-ui usage                           |
| `.cursor/rules/commands/agents.mdc`       | Ralph/agent behavior: plans in Cortex only, commit after task, no Cursor attribution                                       |
| `.cursor/rules/commands/cortex.mdc`       | When to use mcp-developer tools (plans, tasks, semantic search, activity)                                                  |
| `.cursor/rules/commands/github.mdc`       | Conventional commits, PR template, no Co-authored-by, no Cursor attribution                                                |
| `.cursor/rules/cursor-commands.mdc`       | PNPM, NX, `import * as React`                                                                                              |
| `.cursor/rules/no-cursor-attribution.mdc` | No "Made with Cursor" anywhere                                                                                             |
| `.cursor/rules/nx-rules.mdc`              | Nx workspace usage, generators, MCP                                                                                        |

### 1.2 Coding rules (apply when editing/generating code)

| Path                                                    | Purpose                                                |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `.cursor/rules/coding/default-exports.mdc`              | Named exports; default only for framework pages        |
| `.cursor/rules/coding/return-types.mdc`                 | Declare return types; components excepted              |
| `.cursor/rules/coding/naming-conventions.mdc`           | kebab files, PascalCase components, ALL_CAPS constants |
| `.cursor/rules/coding/import-type.mdc`                  | Use `import type` for types                            |
| `.cursor/rules/coding/interface-extends.mdc`            | Prefer interface extends over `&`                      |
| `.cursor/rules/coding/readonly-properties.mdc`          | Readonly by default                                    |
| `.cursor/rules/coding/optional-properties.mdc`          | Sparing use                                            |
| `.cursor/rules/coding/discriminated-unions.mdc`         | Model variants with type field                         |
| `.cursor/rules/coding/throwing.mdc`                     | Prefer result types over throw where applicable        |
| `.cursor/rules/coding/enums.mdc`                        | No new enums; use `as const`                           |
| `.cursor/rules/coding/jsdoc-comments.mdc`               | JSDoc when behavior not self-evident                   |
| `.cursor/rules/coding/installing-libraries.mdc`         | pnpm -w, latest versions                               |
| `.cursor/rules/coding/no-unchecked-indexed-access.mdc`  | Index access may be `T \| undefined`                   |
| `.cursor/rules/coding/any-inside-generic-functions.mdc` | When `any` is acceptable in generics                   |

### 1.3 Single entry point for agents

- **`.cursor/rules/README.md`** — Describes layout (coding/ vs commands/), **Agent behavior** (plans in OT, fail loudly, generators first), and points to personal-generators.mdc and AGENT_USAGE.md. Agents should be directed here for "what rules exist and how to behave."

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
# Examples: --list=destinations, --list=applications, --list=componentFolders --application=openthrottle-cms

# 4. Run generator (use --subGenerator for react/remix/nestjs)
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<name> --subGenerator=<type> --<option>=<value> --name=<Name>
```

### 2.2 Per-generator examples

See **[EXAMPLES.md](./EXAMPLES.md)** for copy-paste examples (React, Remix, NestJS, package, folders). **Caveat:** EXAMPLES.md currently omits the `NX_ISOLATE_PLUGINS=false` prefix in some blocks; agents must **always** add it. The authoritative command reference is **[AGENT_USAGE.md](./AGENT_USAGE.md)**.

### 2.3 Other agent-relevant commands

| Intent       | Command / reference                                                       |
| ------------ | ------------------------------------------------------------------------- |
| Run tasks    | `nx run <project>:<target>`, `nx run-many`, `nx affected` (see AGENTS.md) |
| Workflow CLI | `pnpm exec workflow-ralph --plan <uuid>` (see AGENTS.md § Workflow CLI)   |
| Cortex       | Use mcp-developer tools per `.cursor/rules/commands/cortex.mdc`           |

---

## 3. Discoverability: making generator-first obvious

Agents should encounter "check generators first" in **multiple** places so they don’t skip it.

### 3.1 Primary entry points (must mention generator-first)

| Location                                  | Content                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **AGENTS.md** (repo root)                 | § Generators (check first): 4-step workflow, link to AGENT_USAGE.md and personal-generators.mdc.       |
| **.cursor/rules/README.md**               | § Agent behavior: "Generators first" + link to personal-generators.mdc and AGENT_USAGE.md.             |
| **.cursor/rules/personal-generators.mdc** | MANDATORY rule: check generators first, required workflow, list of generators, link to AGENT_USAGE.md. |
| **docs/tools/templates/AGENT_USAGE.md**   | Full generator-first policy, discover → describe → list → execute, NX_ISOLATE_PLUGINS, examples.       |

### 3.2 Supporting references

| Location                       | Content                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| **AGENTS.md**                  | § Code style: ".cursor/rules/ — see README.md"; § Generators links to AGENT_USAGE.md.               |
| **RULES_TO_GENERATORS_MAP.md** | Maps which rules apply to which generator; use when auditing or applying rules per artifact type.   |
| **AUDIT_SCOPE.md**             | Defines what’s in scope for component/template audits (apps, packages, artifact types).             |
| **AUDIT_CHECKLIST.md**         | Per-artifact checklist and quick-flag list; optional script: `pnpm run audit:templates-compliance`. |
| **AGENT_INPUTS.md** (this doc) | Single spec for what to provide to agents: rules list, example commands, discoverability.           |

### 3.3 Recommendations for implementation (post-planning)

- **AGENTS.md:** Keep the Generators section at the top (or immediately after Nx) so agents see it early. Explicitly say: "Before writing new code, components, or services, check generators first (see AGENT_USAGE.md and personal-generators.mdc)."
- **Cursor rules:** Ensure `personal-generators.mdc` has `alwaysApply: true` (already set) so it’s always in context.
- **Skills / onboarding:** If the repo uses Cursor "skills" or an onboarding doc, include one line: "New code: always run `NX_ISOLATE_PLUGINS=false nx list @tools/generators` and use a generator if one exists; see docs/tools/templates/AGENT_USAGE.md."

---

## 4. Summary

| What                 | Where                                                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rules to load**    | §1: always-applied (.cursor/rules: personal-generators, personal-general, commands/_, no-cursor-attribution, nx-rules); coding/_ for code edits. Single entry: .cursor/rules/README.md.                               |
| **Example commands** | §2: discover (list → describe → list=<key> → execute); NX_ISOLATE_PLUGINS=false on every generator command; EXAMPLES.md for per-generator snippets; AGENT_USAGE.md is authoritative.                                  |
| **Discoverability**  | §3: AGENTS.md, .cursor/rules/README.md, personal-generators.mdc, AGENT_USAGE.md all state "generator first"; RULES_TO_GENERATORS_MAP, AUDIT_SCOPE, AUDIT_CHECKLIST, AGENT_INPUTS support audits and agent onboarding. |

This specification is the single reference for the "Define agent inputs: rules, examples, and discoverability" task. Downstream work (e.g. audit checklist, automation) should use it to ensure agents receive consistent rules, commands, and pointers to generator-first workflow.
