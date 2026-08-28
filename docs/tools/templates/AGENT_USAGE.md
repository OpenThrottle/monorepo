# Generator Service - **MANDATORY Agent Usage Guide**

## 🚦 **Absolute Rule for AI Agents:**

**Do not write new code, files, components, services, applications, or modules by hand if a generator exists!
You MUST ALWAYS use the generators in `@tools/generators` as your starting point for any code generation, unless you have verified no appropriate generator exists.**

If no generator exists for what you are asked to build, note it clearly and proceed with custom code only as a last resort.

This policy is **non-negotiable** and applies to all AI agent, LLM, and programmatic workflows in this monorepo.

**Discoverability:** Agents are directed here from [AGENTS.md](../../../AGENTS.md) (§ Generators) and [.cursor/rules/personal-generators.mdc](../../../.cursor/rules/personal-generators.mdc). Always **check generators first**, then use this doc for the full workflow (list → describe → `--list=<key>` → execute).

---

## Table of Contents

- [Why Always Use Generators?](#why-always-use-generators)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Generator References](#generator-references)
- [Rules to Load](#rules-to-load)
- [Rule → Generator Matrix](#rule--generator-matrix)
- [Best Practices](#best-practices)
- [Plugin Worker Configuration](#plugin-worker-configuration)
- [Integration with Agent Workflows](#integration-with-agent-workflows)
- [Additional Resources](#additional-resources)

---

## Why Always Use Generators?

Generators provided in `@tools/generators` encapsulate best practices, project structure conventions, naming rules, and boilerplate logic that is critical to maintain consistency and quality in this monorepo.

**Key reasons:**

- Ensures all generated code is discoverable, standardized, and maintainable.
- Reduces risk of errors, inconsistencies, or non-compliance with workspace standards.
- Automates many tasks that are error-prone if done manually.
- Enables easy machine-readable introspection (`--describe` and `--list`) for LLMs and agents.
- Supports batch operations for rapid development.

> **As an AI agent:**
>
> - **Before building any new code,** you must check if a generator exists (use `NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators` and `--describe`).
> - **If a generator exists:** Use it to scaffold your code.
> - **If a generator does not exist:** Only then, and only after stating this fact, may you write custom code directly.

---

## Quick Start

> **Absolute for AI Agents:** Every Nx command using `@tools/generators` **MUST** have `NX_ISOLATE_PLUGINS=false` prefixed. **Do NOT omit this.**

### 1. Discover Generators

```bash
NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators
```

### 2. Get Generator Schema and Options

Inspect the full schema and required flags for each generator:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react --describe
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --describe
# ...repeat for any relevant generator
```

When `--describe` shows `"description": "Comma-separated names supported."` on the `name` option, pass multiple artifacts in one run (e.g. `--name=Foo,Bar,Baz`). Prefer batching related siblings over repeated invocations.

### 3. List Dynamic Values

Discover available values for dynamic options:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react --list=destinations
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --list=applications
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --list=componentFolders --application=openthrottle-developer
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --list=hookFolders --application=openthrottle-developer
```

### 4. Create New Code — Always With Generators

_Only_ generate new files or structures with a generator if one exists:

```bash
# React component example
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=UserCard
# React Router app component example
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=component \
  --application=openthrottle-developer \
  --folder=global/components \
  --name=UserProfile
# React Router app hook example (area folders via --list=hookFolders; camelCase --name, comma batching OK)
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=hook \
  --application=openthrottle-developer \
  --folder=routing/plans \
  --name=usePlanOutputStream
# NestJS GraphQL service
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:nestjs \
  --subGenerator=graphql-service \
  --application=openthrottle-server \
  --name=users
# NestJS module into a package (use --list=nestjsPackages for valid destinations)
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:nestjs \
  --subGenerator=module \
  --destination=@openthrottle/nestjs-repositories \
  --name=plans
```

---

## API Reference

### How to Discover and Use Generators

#### List all generators available

```bash
NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators
```

This lists all code scaffolding generators. **If you don’t see what you need, check the docs, or ask for help, before writing custom code!**

#### Get machine-readable contract/schema

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<generator-name> --describe
```

Exposes all options, required fields, and valid values programmatically.

When the `name` option includes `"Comma-separated names supported."`, pass multiple artifacts in one invocation (e.g. `--name=ComponentA,ComponentB`).

#### Enumerate valid dynamic values

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<generator-name> --list=<list-key> [--application=<app>]
```

Use for destinations, folders, and more — ensure you select valid targets!

#### `openthrottle-developer` — React Router flags (reference)

Nx project name: **`openthrottle-developer`**. Prefix all generator commands with **`NX_ISOLATE_PLUGINS=false`**.

| Generator                        | Purpose                                          | Key flags                                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@tools/generators:react-router` | Route files under `app/routes/`                  | `--subGenerator=route --application=openthrottle-developer --name=<segment>` (comma-separated names allowed). No `--folder`; routes always land in `applications/openthrottle-developer/app/routes/`.                                                                                                                                |
| `@tools/generators:react-router` | Components under `app/`                          | `--subGenerator=component --application=openthrottle-developer --folder=<path> --name=<Name>` (comma-separated names allowed). Valid `--folder` values: `NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --list=componentFolders --application=openthrottle-developer`.                                            |
| `@tools/generators:react-router` | Hooks under `app/<area>/hooks/`                  | `--subGenerator=hook --application=openthrottle-developer --folder=<area> --name=<camelCase>` (comma-separated names allowed). Area paths via `--list=hookFolders` (e.g. `global`, `routing/plans` → `app/<folder>/hooks/`). Do **not** use `@tools/generators:react --subGenerator=hook` for app hooks (that lands in `src/hooks`). |
| `@tools/generators:folders`      | New `routing/<slug>/` or `services/<slug>/` tree | `--application=openthrottle-developer --name=<slug>` with `--folder=routing` or `--folder=services`. Run **before** generating components into a new `routing/<slug>/components` folder so that path appears in `componentFolders`.                                                                                                  |
| `@tools/generators:react`        | Package or app components                        | `--destination=<project>` (not `--folder`). Shared UI: `--destination=@openthrottle/react-router-shadcn`. App-local: `--destination=openthrottle-developer`. List: `--list=destinations`. `--name` accepts comma-separated component names.                                                                                          |

### Generator Execution

All new code should go through a generator:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<generator-name> \
  --subGenerator=<type> \
  --option1=value1 \
  --option2=value2
```

- Use `--subGenerator` (not `--generator`) for most.
- Missing required options will fail the command, which is preferable to silent mistakes.

---

## Generator References

- **[React Generator](./react.md)** – Components, hooks, utils, etc.
- **[React Router Generator](./react-router.md)** – Apps, components, forms, hooks, modals, routes, etc. (registered as `@tools/generators:react-router`)
- **[NestJS Generator](./nestjs.md)** – Apps, services, modules, agents, etc.
- **[Package Generator](./package.md)**
- **[Folders Generator](./folders.md)**

> There is **no** `react-native` generator registered in this workspace — only the five above (`tools/generators/generators.json`). Use **react** for shared UI packages and **react-router** for apps under `applications/`.

---

## Rules to Load

Beyond the generator-first policy above, agents working in this repo should load the
rule set below. Rule **bodies** live under `.agents/rules/` — the single source of
truth. Cursor activates them through `.cursor/rules/**/*.mdc` **symlinks**; other
agents read `.agents/rules/` directly. Never edit the symlink view. Full layout:
[agent-editor-folders.md](../../monorepo/agent-editor-folders.md).

### Always-applied (workspace-wide)

| Path (SSOT)                               | Purpose                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `.agents/rules/personal-generators.mdc`   | Generator-first workflow; **check generators before writing new code**; this doc             |
| `.agents/rules/personal-general.mdc`      | UI/API creation (React Router, React, NestJS), testing (`component`, `userEvent`), shared UI |
| `.agents/rules/commands/agents.mdc`       | Ralph/agent behavior: plans in OpenThrottle only, commit per task, no attribution lines      |
| `.agents/rules/commands/openthrottle.mdc` | When to use `openthrottle-mcp` tools (plans, tasks, semantic search, activity)               |
| `.agents/rules/commands/github.mdc`       | Conventional commits, PR template, no `Co-authored-by`, no editor attribution                |
| `.agents/rules/cursor-commands.mdc`       | pnpm, Nx, `import * as React`                                                                |
| `.agents/rules/no-cursor-attribution.mdc` | No "Made with Cursor" anywhere                                                               |
| `.agents/rules/nx-rules.mdc`              | Nx guidance (Cursor's `.cursor/rules/nx-rules.mdc` view is generated and gitignored)         |

### Agent skills (repo-local)

Invoke a skill **before** writing code when the task matches its **USE WHEN**
trigger. For `@tools/generators`, reach for **ot-generators** first.

| Source                                                      | Purpose                                                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `skills/ot-generators/SKILL.md`                             | `@tools/generators`: `NX_ISOLATE_PLUGINS=false`, list/describe/`--list`, and this doc           |
| [AGENTS.md](../../../AGENTS.md) § OpenThrottle Agent Skills | Index of the OT skill set — **ot-stack**, **ot-plans**, **agents-ralph**, plus **nx-workspace** |
| [AGENTS.md](../../../AGENTS.md) § When to use nx_docs       | Nx task execution (`pnpm nx run`, `affected`), the Nx MCP, when to use **nx_docs**              |

Skill **bodies** are authored under `skills/<slug>/`, generated into
`.agents/skills/`, and fanned out to `.claude/skills/` and `.gemini/skills/`. Which
directory a CLI scans differs: Cursor, Grok Build, and Antigravity (`agy`) read
`.agents/skills/`; Claude Code reads only `.claude/skills/`; the Gemini CLI only
`.gemini/skills/`. All of them resolve back to `skills/<slug>` for OT-owned skills —
so edit `skills/`, then run `bash skills/ot-skill-sync/scripts/sync.sh`. Never
hand-edit a generated skill directory.

### Coding rules (apply when editing or generating code)

| Path (SSOT)                                             | Purpose                                                |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `.agents/rules/coding/any-inside-generic-functions.mdc` | When `any` is acceptable inside generics               |
| `.agents/rules/coding/component-data-boundaries.mdc`    | Lists, copy, and fixtures live in the nearest `data/`  |
| `.agents/rules/coding/default-exports.mdc`              | Named exports; default only for framework pages        |
| `.agents/rules/coding/discriminated-unions.mdc`         | Model variants with a discriminating `type` field      |
| `.agents/rules/coding/enums.mdc`                        | No new enums; use `as const` objects                   |
| `.agents/rules/coding/frontend-design-openthrottle.mdc` | OT overlay on the vendored `frontend-design` skill     |
| `.agents/rules/coding/import-type.mdc`                  | Use `import type` for type-only imports                |
| `.agents/rules/coding/installing-libraries.mdc`         | `pnpm -w`, latest versions                             |
| `.agents/rules/coding/interface-extends.mdc`            | Prefer `interface extends` over `&`                    |
| `.agents/rules/coding/jsdoc-comments.mdc`               | JSDoc when behavior is not self-evident                |
| `.agents/rules/coding/naming-conventions.mdc`           | kebab files, PascalCase components, ALL_CAPS constants |
| `.agents/rules/coding/no-unchecked-indexed-access.mdc`  | Index access may be `T \| undefined`                   |
| `.agents/rules/coding/optional-properties.mdc`          | Use optional properties sparingly                      |
| `.agents/rules/coding/readonly-properties.mdc`          | Readonly by default                                    |
| `.agents/rules/coding/return-types.mdc`                 | Declare return types; components excepted              |
| `.agents/rules/coding/throwing.mdc`                     | Prefer result types over `throw` where applicable      |

### Where to look for what

| Doc                                                                   | Owns                                                                    |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **This doc**                                                          | What to load and how to run generators: rules list, commands, discovery |
| **[agent-editor-folders.md](../../monorepo/agent-editor-folders.md)** | Where files live: folder tree, authored vs generated, where to edit     |
| **[.agents/rules/README.md](../../../.agents/rules/README.md)**       | How rules are organized (`coding/` vs `commands/`) and agent behavior   |

### Other agent-relevant commands

| Intent           | Command / reference                                                                 |
| ---------------- | ----------------------------------------------------------------------------------- |
| Run tasks        | `pnpm nx run <project>:<target>`, `nx run-many`, `nx affected` (see AGENTS.md)      |
| Workflow CLI     | `pnpm exec workflow-ralph --plan <uuid>` (see AGENTS.md § Workflow CLI)             |
| OpenThrottle     | Use `openthrottle-mcp` tools per `.agents/rules/commands/openthrottle.mdc`          |
| SSOT drift guard | `pnpm nx run monorepo:check-agent-assets-ssot` (see CONTRIBUTING.md § Agent assets) |

---

## Rule → Generator Matrix

Which of the rules listed in [Rules to Load](#rules-to-load) apply to code produced by (or that
should be produced by) each registered generator. Only generators registered in
[`tools/generators/generators.json`](../../../tools/generators/generators.json) are listed.

| Rule / convention                                                                        | react-router | react                          | nestjs | package | folders |
| ---------------------------------------------------------------------------------------- | ------------ | ------------------------------ | ------ | ------- | ------- |
| **personal-generators.mdc** (generator-first)                                            | ✓            | ✓                              | ✓      | ✓       | ✓       |
| **personal-general.mdc** (UI: React Router/React, create via generator)                  | ✓            | ✓                              | ✓      | —       | ✓       |
| **personal-general.mdc** (API: NestJS, create via generator)                             | —            | —                              | ✓      | —       | —       |
| **personal-general.mdc** (testing: `component`, `userEvent`, `waitFor`, describe/branch) | ✓            | ✓                              | ✓      | —       | —       |
| **personal-general.mdc** (shared-ui usage)                                               | ✓            | ✓ (shared-ui is a destination) | —      | —       | —       |
| **personal-general.mdc** (NestJS: ListResult/Result, deprecate rather than remove)       | —            | —                              | ✓      | —       | —       |
| **cursor-commands.mdc** (pnpm, Nx, `import * as React`)                                  | ✓            | ✓                              | ✓      | ✓       | —       |
| **coding/default-exports.mdc** (no default export except framework pages)                | ✓            | ✓                              | ✓      | ✓       | —       |
| **coding/return-types.mdc** (declare return types; JSX components excepted)              | ✓            | ✓                              | ✓      | ✓       | —       |
| **coding/naming-conventions.mdc** (kebab files, PascalCase components, …)                | ✓            | ✓                              | ✓      | ✓       | ✓       |
| **coding/import-type.mdc** (`import type` for type-only imports)                         | ✓            | ✓                              | ✓      | ✓       | —       |
| **coding/interface-extends.mdc** (prefer `interface extends` over `&`)                   | ✓            | ✓                              | ✓      | ✓       | —       |
| **coding/readonly-properties.mdc** (readonly by default)                                 | ✓            | ✓                              | ✓      | ✓       | —       |
| **coding/optional-properties.mdc** (sparing use)                                         | ✓            | ✓                              | ✓      | ✓       | —       |
| **coding/discriminated-unions.mdc** (model variants with a type field)                   | ✓            | ✓                              | ✓      | ✓       | —       |
| **coding/enums.mdc** (no new enums; use `as const`)                                      | ✓            | ✓                              | ✓      | ✓       | —       |
| **coding/jsdoc-comments.mdc** (JSDoc when not self-evident)                              | ✓            | ✓                              | ✓      | ✓       | —       |
| **coding/throwing.mdc** (prefer result types over `throw`)                               | —            | —                              | ✓      | ✓       | —       |
| **coding/component-data-boundaries.mdc** (copy/lists/data in the nearest `data/`)        | ✓            | ✓                              | —      | —       | —       |

Sub-generators per generator:

- **react-router**: `application`, `component`, `form`, `hook`, `modal`, `route`, `table`, `util`
- **react**: `component`, `hook`, `util`
- **nestjs**: `ai-agent`, `application`, `graphql-service`, `module`, `queue`, `simple-service`
- **package**: `nestjs`, `node`, `react`, `tools`
- **folders**: routing and services folder sets

### Per-generator expectations

- **react-router** — PascalCase components; forms end with `Form`, modals with `Modal`, tables
  with `Table`; routes any valid name. Components/forms/modals/tables use **named** exports; route
  files may use a **default** export (framework requirement). `import * as React from 'react'`.
- **react** — PascalCase components and hooks, camelCase utils; kebab-case file names except React
  components. All generated output uses **named** exports.
- **nestjs** — **kebab-case** services, modules and applications; named exports. Resolvers return
  `ListResult` / `PaginatedResult` / `Result`; entity changes stay backwards compatible — deprecate
  rather than remove. Mock providers in `beforeEach`; model/entity factories for tests.
- **package** — **kebab-case** package names; `throwing.mdc` applies to `node`, `nestjs` and `tools`
  package types.
- **folders** — **kebab-case** folder names; structure only, no code files generated.

---

## Best Practices (Strict Agent Edition)

### 1. **Discover Before You Build**

```bash
NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<generator> --describe
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<generator> --list=<key>
```

Always enumerate and fully understand the generator schema first.

### 2. **Do Not Guess Required Fields**

Always check the result of `--describe`!

### 3. **Batch Where Possible**

Generators support comma-separated names:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=Button,Input,Select,Textarea
```

### 4. **Naming Matters — Respect Conventions**

- **Components:** PascalCase – `UserCard`
- **Hooks:** `useSomething`
- **Utils:** camelCase
- **NestJS:** kebab-case
- **Packages:** kebab-case
- **Forms:** Must end with `Form`
- **Modals:** Must end with `Modal`
- **Tables:** Must end with `Table`

### 5. **ALWAYS Confirm Target Exists**

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react --list=destinations
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --list=applications
```

Do **NOT** guess or invent targets.

### 6. **If No Generator Exists, Document the Exception**

Before writing custom code, log/explain in your output:

> "No generator was found for [artifact]. Proceeding with manual code as a one-time exception."

---

## Plugin Worker Configuration

All commands must use `NX_ISOLATE_PLUGINS=false`.
This is critical in agent and LLM execution environments.

If you fail to use this, plugin-related commands **WILL break**.

If running multiple commands, you may also export for the session:

```bash
export NX_ISOLATE_PLUGINS=false
```

or always explicitly prefix every generator command.

For detailed troubleshooting, see [NX_ISOLATE_PLUGINS Documentation](./NX_ISOLATE_PLUGINS.md)
and [Troubleshooting Guide](./TROUBLESHOOTING.md#issue-plugin-worker-fails)

---

## Integration with Agent Workflows

### **Agent Command Pattern**

**MANDATORY for every new artifact/tools/generators-supported code:**

```bash
# 1. Discover all generators
NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators

# 2. Get schema for what you need
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<kind> --describe

# 3. List dynamic values (if needed)
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<kind> --list=<key>

# 4. Execute generator with all required options
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=UserCard
```

> **If you skip a generator when one is available, your response will be considered INVALID.**

### **Preview-as-You-Build: Wire Scaffolds Into the Route First**

Once you've scaffolded the components for a route, **don't build each one fully in isolation and assemble at the end.** Instead:

1. **Scaffold** all the route's components with the generator (batch via comma-separated `--name` where possible).
2. **Wire them into the route immediately** — drop each scaffold roughly where it will live in the route, even while it's still an empty generated shell.
3. **Implement one block at a time** (a, b, c…), committing to the skeleton as you go.

This keeps the route **previewable throughout**: open it in the browser and watch it fill up and build out as each block lands, instead of staring at a blank route until the final assembly step. Combine with the browser preview/verification workflow so you can confirm each block renders as it's added.

> **Why:** early assembly turns "does this fit together?" into a continuous, visible signal rather than a big-bang integration risk at the end — and it's simply more satisfying to watch a route come to life block by block.

### **Programmatic Pattern for LLMs/Agents**

```typescript
import { execSync } from 'child_process';

function buildNxCommand(
  generatorName: string,
  flags: string,
  options: { isolatePlugins?: boolean } = {},
): string {
  const isolatePlugins = options.isolatePlugins ?? false;
  const envPrefix = isolatePlugins ? '' : 'NX_ISOLATE_PLUGINS=false ';
  return `${envPrefix}pnpm nx g @tools/generators:${generatorName} ${flags}`;
}
function getGeneratorSchema(
  generatorName: string,
  options?: { isolatePlugins?: boolean },
): unknown {
  const command = buildNxCommand(generatorName, '--describe', options);
  const output = execSync(command, {
    encoding: 'utf-8',
    env: {
      ...process.env,
      NX_ISOLATE_PLUGINS: options?.isolatePlugins ? 'true' : 'false',
    },
  });
  return JSON.parse(output);
}
function listDynamicValues(
  generatorName: string,
  listKey: string,
  additionalParams: Record<string, string> = {},
  options?: { isolatePlugins?: boolean },
): string[] {
  const params = Object.entries(additionalParams)
    .map(([key, value]) => `--${key}=${value}`)
    .join(' ');
  const command = buildNxCommand(
    generatorName,
    `--list=${listKey} ${params}`,
    options,
  );
  const output = execSync(command, {
    encoding: 'utf-8',
    env: {
      ...process.env,
      NX_ISOLATE_PLUGINS: options?.isolatePlugins ? 'true' : 'false',
    },
  });
  return JSON.parse(output);
}
function executeGenerator(
  generatorName: string,
  options: Record<string, string | number>,
  execOptions?: { isolatePlugins?: boolean },
): void {
  const flags = Object.entries(options)
    .map(([key, value]) => `--${key}=${value}`)
    .join(' ');
  const command = buildNxCommand(generatorName, flags, execOptions);
  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NX_ISOLATE_PLUGINS: execOptions?.isolatePlugins ? 'true' : 'false',
    },
  });
}

const schema = getGeneratorSchema('react', { isolatePlugins: false });
const destinations = listDynamicValues(
  'react',
  'destinations',
  {},
  { isolatePlugins: false },
);
executeGenerator(
  'react',
  {
    subGenerator: 'component',
    destination: '@openthrottle/react-router-ui',
    name: 'UserCard',
  },
  { isolatePlugins: false },
);
```

- By default, `isolatePlugins: false` is mandatory for agent code execution.
- Only set `isolatePlugins: true` in truly unrestricted environments (rare).

---

## Additional Resources

- [Generators README](../../../tools/generators/README.md) – General guidance and generator policies
- [Nx Generator Documentation](https://nx.dev/extending-nx/recipes/local-generators)
- **Find generator source code:** [`tools/generators/src/generators/`](../../../tools/generators/src/generators/)

---
